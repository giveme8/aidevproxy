pub mod proxy;
pub mod p2p;
pub mod commands;
pub mod commands_extra;
pub mod db;
pub mod health_check;

use std::sync::Arc;
use parking_lot::RwLock;
use once_cell::sync::Lazy;
use std::sync::atomic::AtomicBool;

pub struct AppState {
    pub proxy_running: AtomicBool,
    pub p2p_running: AtomicBool,
    pub proxy_port: RwLock<u16>,
    pub stats: RwLock<ProxyStats>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProxyStats {
    pub total_requests: u64,
    pub total_bytes_saved: u64,
    pub total_bytes_transferred: u64,
    pub mirror_hits: u64,
    pub p2p_hits: u64,
    pub active_peers: u32,
    pub cache_size_bytes: u64,
    pub uptime_seconds: u64,
}

impl Default for ProxyStats {
    fn default() -> Self {
        Self {
            total_requests: 0,
            total_bytes_saved: 0,
            total_bytes_transferred: 0,
            mirror_hits: 0,
            p2p_hits: 0,
            active_peers: 0,
            cache_size_bytes: 0,
            uptime_seconds: 0,
        }
    }
}

impl AppState {
    pub fn new() -> Self {
        Self {
            proxy_running: AtomicBool::new(false),
            p2p_running: AtomicBool::new(false),
            proxy_port: RwLock::new(8899),
            stats: RwLock::new(ProxyStats::default()),
        }
    }
}

pub static APP_STATE: Lazy<Arc<AppState>> = Lazy::new(|| {
    Arc::new(AppState::new())
});
