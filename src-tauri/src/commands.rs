use crate::APP_STATE;
use crate::proxy::ProxyServer;
use crate::p2p::P2PNetwork;
use parking_lot::Mutex;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use once_cell::sync::Lazy;

pub static PROXY_SERVER: Lazy<Mutex<Option<ProxyServer>>> = Lazy::new(|| Mutex::new(None));
pub(crate) static P2P_NETWORK: Lazy<Mutex<Option<Arc<P2PNetwork>>>> = Lazy::new(|| Mutex::new(None));

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProxyConfig {
    pub port: u16,
    pub enable_mirror: bool,
    pub enable_p2p: bool,
    pub enable_cache: bool,
    pub auto_start: bool,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            port: 8899,
            enable_mirror: true,
            enable_p2p: true,
            enable_cache: true,
            auto_start: false,
        }
    }
}

pub static CONFIG: Lazy<Mutex<ProxyConfig>> = Lazy::new(|| Mutex::new(ProxyConfig::default()));

#[tauri::command]
pub async fn start_proxy() -> Result<String, String> {
    if APP_STATE.proxy_running.load(Ordering::SeqCst) {
        return Err("Proxy is already running".into());
    }

    let config = (*CONFIG.lock()).clone();
    let port = config.port;

    let mut server = ProxyServer::new(port);
    server.start().await.map_err(|e| format!("Failed to start proxy: {}", e))?;

    *PROXY_SERVER.lock() = Some(server);
    APP_STATE.proxy_running.store(true, Ordering::SeqCst);

    Ok(format!("Proxy started on port {}", port))
}

#[tauri::command]
pub async fn stop_proxy() -> Result<String, String> {
    if !APP_STATE.proxy_running.load(Ordering::SeqCst) {
        return Err("Proxy is not running".into());
    }

    let server_opt = PROXY_SERVER.lock().take();
    if let Some(mut server) = server_opt {
        server.stop().await.map_err(|e| format!("Failed to stop proxy: {}", e))?;
    }

    APP_STATE.proxy_running.store(false, Ordering::SeqCst);

    Ok("Proxy stopped".into())
}

#[tauri::command]
pub async fn get_proxy_status() -> Result<serde_json::Value, String> {
    let running = APP_STATE.proxy_running.load(Ordering::SeqCst);
    let port = *APP_STATE.proxy_port.read();
    let config = (*CONFIG.lock()).clone();

    Ok(serde_json::json!({
        "running": running,
        "port": port,
        "config": {
            "enable_mirror": config.enable_mirror,
            "enable_p2p": config.enable_p2p,
            "enable_cache": config.enable_cache,
            "auto_start": config.auto_start,
        }
    }))
}

#[tauri::command]
pub async fn get_stats() -> Result<serde_json::Value, String> {
    let stats = APP_STATE.stats.read().clone();
    Ok(serde_json::to_value(stats).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn start_p2p() -> Result<String, String> {
    if APP_STATE.p2p_running.load(Ordering::SeqCst) {
        return Err("P2P network is already running".into());
    }

    let network = Arc::new(P2PNetwork::new().await.map_err(|e| format!("Failed to create P2P network: {}", e))?);
    let network_clone = network.clone();

    tokio::spawn(async move {
        if let Err(e) = network_clone.run().await {
            log::error!("P2P network error: {}", e);
        }
    });

    *P2P_NETWORK.lock() = Some(network);
    APP_STATE.p2p_running.store(true, Ordering::SeqCst);

    Ok("P2P network started".into())
}

#[tauri::command]
pub async fn stop_p2p() -> Result<String, String> {
    if !APP_STATE.p2p_running.load(Ordering::SeqCst) {
        return Err("P2P network is not running".into());
    }

    *P2P_NETWORK.lock() = None;
    APP_STATE.p2p_running.store(false, Ordering::SeqCst);

    Ok("P2P network stopped".into())
}

#[tauri::command]
pub async fn get_p2p_status() -> Result<serde_json::Value, String> {
    let running = APP_STATE.p2p_running.load(Ordering::SeqCst);
    let stats = APP_STATE.stats.read();

    Ok(serde_json::json!({
        "running": running,
        "active_peers": stats.active_peers,
        "p2p_hits": stats.p2p_hits,
        "cache_size_bytes": stats.cache_size_bytes,
    }))
}

#[tauri::command]
pub async fn update_config(config: ProxyConfig) -> Result<String, String> {
    *APP_STATE.proxy_port.write() = config.port;
    *CONFIG.lock() = config;
    Ok("Config updated".into())
}

#[tauri::command]
pub async fn get_config() -> Result<serde_json::Value, String> {
    let config = (*CONFIG.lock()).clone();
    Ok(serde_json::to_value(config).map_err(|e| e.to_string())?)
}
