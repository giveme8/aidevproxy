use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use libp2p::{
    identify, kad, mdns, noise,
    swarm::{Swarm, SwarmEvent},
    tcp, yamux, PeerId,
};
use libp2p_swarm_derive::NetworkBehaviour;
use futures::StreamExt;
use tokio::sync::mpsc;

use crate::proxy::cache::PackageCache;

#[derive(NetworkBehaviour)]
#[behaviour(to_swarm = "Event")]
struct AppBehaviour {
    kademlia: kad::Behaviour<kad::store::MemoryStore>,
    mdns: mdns::tokio::Behaviour,
    identify: identify::Behaviour,
}

#[derive(Debug)]
enum Event {
    Kademlia(kad::Event),
    Mdns(mdns::Event),
    Identify(identify::Event),
}

impl From<kad::Event> for Event {
    fn from(e: kad::Event) -> Self { Event::Kademlia(e) }
}
impl From<mdns::Event> for Event {
    fn from(e: mdns::Event) -> Self { Event::Mdns(e) }
}
impl From<identify::Event> for Event {
    fn from(e: identify::Event) -> Self { Event::Identify(e) }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PeerInfo {
    pub peer_id: String,
    pub addresses: Vec<String>,
    pub agent_version: String,
}

pub struct P2PNetwork {
    local_peer_id: PeerId,
    command_tx: mpsc::Sender<NetworkCommand>,
    peers: Arc<RwLock<HashMap<PeerId, PeerInfo>>>,
    cache: Arc<PackageCache>,
}

#[derive(Debug)]
enum NetworkCommand {
    FetchContent {
        hash: String,
        response_tx: tokio::sync::oneshot::Sender<Option<Vec<u8>>>,
    },
    AnnounceContent {
        hash: String,
    },
}

impl P2PNetwork {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let random_key = libp2p::identity::Keypair::generate_ed25519();
        let local_peer_id = PeerId::from(random_key.public());

        let mut swarm = libp2p::SwarmBuilder::with_existing_identity(random_key)
            .with_tokio()
            .with_tcp(
                tcp::Config::default(),
                noise::Config::new,
                yamux::Config::default,
            )?
            .with_behaviour(|key| {
                let kademlia = kad::Behaviour::new(
                    local_peer_id,
                    kad::store::MemoryStore::new(local_peer_id),
                );
                let mdns = mdns::tokio::Behaviour::new(
                    mdns::Config::default(),
                    local_peer_id,
                )?;
                let identify = identify::Behaviour::new(
                    identify::Config::new("aip/1.0".to_string(), key.public()),
                );
                Ok(AppBehaviour {
                    kademlia,
                    mdns,
                    identify,
                })
            })?
            .build();

        swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse()?)?;

        let (command_tx, command_rx) = mpsc::channel(256);
        let cache = Arc::new(PackageCache::new());
        let peers = Arc::new(RwLock::new(HashMap::new()));

        let peers_clone = peers.clone();
        let cache_clone = cache.clone();

        // Spawn the event loop
        tokio::spawn(async move {
            run_event_loop(swarm, command_rx, peers_clone, cache_clone).await;
        });

        Ok(Self {
            local_peer_id,
            command_tx,
            peers,
            cache,
        })
    }

    pub async fn run(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        log::info!(
            "P2P network running with peer ID: {}",
            self.local_peer_id
        );
        Ok(())
    }

    pub async fn fetch_content(&self, hash: &str) -> Option<Vec<u8>> {
        // Try local cache first
        if let Some(data) = self.cache.get(hash) {
            return Some(data);
        }

        // Try to fetch from peers via DHT
        let (tx, rx) = tokio::sync::oneshot::channel();
        let _ = self
            .command_tx
            .send(NetworkCommand::FetchContent {
                hash: hash.to_string(),
                response_tx: tx,
            })
            .await;

        rx.await.ok().flatten()
    }

    pub fn store_content(&self, data: &[u8], url: &str) -> String {
        let hash = self.cache.store(data, url);
        let hash_clone = hash.clone();
        let tx = self.command_tx.clone();

        tokio::spawn(async move {
            let _ = tx
                .send(NetworkCommand::AnnounceContent {
                    hash: hash_clone,
                })
                .await;
        });

        hash
    }

    pub fn local_peer_id(&self) -> &PeerId {
        &self.local_peer_id
    }

    pub fn get_peers(&self) -> Vec<PeerInfo> {
        self.peers.read().values().cloned().collect()
    }

    pub fn peer_count(&self) -> usize {
        self.peers.read().len()
    }
}

async fn run_event_loop(
    mut swarm: Swarm<AppBehaviour>,
    mut command_rx: mpsc::Receiver<NetworkCommand>,
    peers: Arc<RwLock<HashMap<PeerId, PeerInfo>>>,
    cache: Arc<PackageCache>,
) {
    let mut pending_fetches: HashMap<
        String,
        tokio::sync::oneshot::Sender<Option<Vec<u8>>>,
    > = HashMap::new();

    loop {
        tokio::select! {
            swarm_event = swarm.next() => {
                let swarm_event = match swarm_event {
                    Some(e) => e,
                    None => break,
                };
                match swarm_event {
                    SwarmEvent::Behaviour(Event::Mdns(mdns::Event::Discovered(list))) => {
                        for (peer_id, multiaddr) in list {
                            log::info!("mDNS discovered peer: {} at {}", peer_id, multiaddr);
                            swarm.behaviour_mut().kademlia.add_address(&peer_id, multiaddr.clone());

                            let info = PeerInfo {
                                peer_id: peer_id.to_string(),
                                addresses: vec![multiaddr.to_string()],
                                agent_version: "unknown".to_string(),
                            };
                            peers.write().insert(peer_id, info);
                        }
                    }
                    SwarmEvent::Behaviour(Event::Mdns(mdns::Event::Expired(list))) => {
                        for (peer_id, _) in list {
                            log::info!("Peer expired: {}", peer_id);
                            peers.write().remove(&peer_id);
                        }
                    }
                    SwarmEvent::Behaviour(Event::Identify(identify::Event::Received {
                        peer_id, info, ..
                    })) => {
                        log::info!("Identify from {}: {}", peer_id, info.agent_version);
                        if let Some(existing) = peers.write().get_mut(&peer_id) {
                            existing.agent_version = info.agent_version;
                        }
                    }
                    SwarmEvent::Behaviour(Event::Kademlia(kad::Event::OutboundQueryProgressed {
                        result, ..
                    })) => {
                        match result {
                            kad::QueryResult::GetRecord(Ok(kad::GetRecordOk::FoundRecord(record))) => {
                                let key = hex::encode(record.record.key);
                                let value = record.record.value;
                                let hash = String::from_utf8_lossy(&value).to_string();

                                log::info!("Kademlia: found record for key {}", key);

                                if let Some(sender) = pending_fetches.remove(&key) {
                                    let data = cache.get(&hash);
                                    let _ = sender.send(data);
                                }
                            }
                            kad::QueryResult::GetRecord(Ok(kad::GetRecordOk::FinishedWithNoAdditionalRecord { .. })) => {
                                // No record found
                            }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
            command = command_rx.recv() => {
                match command {
                    Some(NetworkCommand::FetchContent { hash, response_tx }) => {
                        // Query DHT for the content hash
                        let key = kad::RecordKey::new(&hash);
                        swarm.behaviour_mut().kademlia.get_record(key);
                        pending_fetches.insert(hash, response_tx);
                    }
                    Some(NetworkCommand::AnnounceContent { hash }) => {
                        // Store the hash in DHT so other peers can find it
                        let key = kad::RecordKey::new(&hash);
                        let record = kad::Record {
                            key,
                            value: hash.as_bytes().to_vec(),
                            publisher: None,
                            expires: None,
                        };
                        let _ = swarm
                            .behaviour_mut()
                            .kademlia
                            .put_record(record, kad::Quorum::One);
                    }
                    None => break,
                }
            }
        }
    }
}
