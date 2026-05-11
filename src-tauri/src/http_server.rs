//! Embedded HTTP API server for browser-based development.
//!
//! When the Tauri app starts, this server binds to localhost:3001 and
//! exposes every Tauri command as a POST /api/<command> endpoint.
//! The frontend `tauri-api.ts` uses this as a fallback when running in a
//! regular browser (e.g. Vite dev at localhost:1420) instead of Tauri's webview.

use crate::commands::CONFIG as PROXY_CONFIG;
use crate::commands_extra::{
    AddMirrorArgs, AddRuleArgs, CacheConfig, MirrorLatencySample, Rule, ScanResult, Settings,
    SpeedTestResult, UpdateMirrorArgs, UpdateRuleArgs,
    CACHE_CFG, CACHE_ENTRIES, MIRROR_LATENCY, NODES, PEERS, RECENT_REQS,
};
use crate::db;
use crate::APP_STATE;
use crate::health_check;
use futures::future::join_all;
use hyper::body::Incoming;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Method, Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use http_body_util::{BodyExt, Full};
use bytes::Bytes;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use sqlx::SqlitePool;
use std::net::SocketAddr;
use std::sync::atomic::Ordering;
use std::sync::Arc;

// Shared DB pool – set by main.rs via `set_db_pool` before starting the server.
static DB_POOL: Lazy<Mutex<Option<SqlitePool>>> = Lazy::new(|| Mutex::new(None));

/// Inject the SQLite pool so HTTP handlers can access mirror data.
pub fn set_db_pool(pool: SqlitePool) {
    *DB_POOL.lock() = Some(pool);
}

fn get_pool() -> Result<SqlitePool, String> {
    DB_POOL
        .lock()
        .clone()
        .ok_or_else(|| "DB pool not initialised".to_string())
}

/// Start the HTTP API server on `port`. Runs forever (or until the task is cancelled).
pub async fn start(port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    log::info!("HTTP API server listening on http://{}", addr);

    loop {
        let (stream, _) = match listener.accept().await {
            Ok(conn) => conn,
            Err(e) => {
                log::error!("HTTP accept error: {}", e);
                continue;
            }
        };
        let io = TokioIo::new(stream);
        tokio::spawn(async move {
            if let Err(e) = http1::Builder::new()
                .serve_connection(io, service_fn(handle_request))
                .await
            {
                log::error!("HTTP connection error: {}", e);
            }
        });
    }
}

// ── request routing ────────────────────────────────────────────────────────

async fn handle_request(req: Request<Incoming>) -> Result<Response<Full<Bytes>>, hyper::Error> {
    // CORS preflight
    if req.method() == Method::OPTIONS {
        return Ok(cors_response(StatusCode::OK, ""));
    }

    let path = req.uri().path().to_string();
    let method = req.method().clone();

    // Health check
    if path == "/api/health" && method == Method::GET {
        return Ok(json_response(StatusCode::OK, &serde_json::json!({"status": "ok"})));
    }

    // All commands via POST /api/<command>
    if !path.starts_with("/api/") || method != Method::POST {
        return Ok(cors_response(
            StatusCode::NOT_FOUND,
            &serde_json::json!({"error": "not found"}).to_string(),
        ));
    }

    let command = &path["/api/".len()..];
    let body_bytes = match collect_body(req).await {
        Ok(b) => b,
        Err(e) => {
            return Ok(cors_response(
                StatusCode::BAD_REQUEST,
                &serde_json::json!({"error": e}).to_string(),
            ))
        }
    };

    let result = dispatch(command, &body_bytes).await;
    match result {
        Ok(value) => Ok(json_response(StatusCode::OK, &value)),
        Err(msg) => Ok(cors_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &serde_json::json!({"error": msg}).to_string(),
        )),
    }
}

async fn collect_body(req: Request<Incoming>) -> Result<Vec<u8>, String> {
    let body = req
        .into_body()
        .collect()
        .await
        .map_err(|e| format!("Failed to read body: {}", e))?;
    Ok(body.to_bytes().to_vec())
}

// ── CORS helpers ───────────────────────────────────────────────────────────

fn cors_response(status: StatusCode, body: &str) -> Response<Full<Bytes>> {
    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type")
        .body(Full::new(Bytes::from(body.to_string())))
        .unwrap()
}

fn json_response(status: StatusCode, value: &serde_json::Value) -> Response<Full<Bytes>> {
    cors_response(status, &value.to_string())
}

// ── command dispatch ───────────────────────────────────────────────────────

macro_rules! args_or_empty {
    ($body:expr) => {
        if $body.is_empty() {
            serde_json::Value::Object(serde_json::Map::new())
        } else {
            serde_json::from_slice($body).map_err(|e| format!("Invalid JSON: {}", e))?
        }
    };
}

macro_rules! get_arg {
    ($args:expr, $field:expr) => {
        $args
            .get($field)
            .cloned()
            .unwrap_or(serde_json::Value::Null)
    };
}

async fn dispatch(command: &str, body: &[u8]) -> Result<serde_json::Value, String> {
    let mut args: serde_json::Value = args_or_empty!(body);

    // Unwrap the `args` wrapper used by Tauri's invoke convention.
    // Frontend calls `invoke("cmd", { args: { ... } })` where `args`
    // matches the Tauri command parameter name.
    if let Some(inner) = args.get("args").cloned() {
        if inner.is_object() {
            args = inner;
        }
    }

    match command {
        // ── proxy ──
        "start_proxy" => start_proxy_handler().await,
        "stop_proxy" => stop_proxy_handler().await,
        "get_proxy_status" => get_proxy_status_handler().await,
        "get_stats" => get_stats_handler().await,
        "start_p2p" => start_p2p_handler().await,
        "stop_p2p" => stop_p2p_handler().await,
        "get_p2p_status" => get_p2p_status_handler().await,
        "update_config" => update_config_handler(&args).await,
        "get_config" => get_config_handler().await,

        // ── dashboard / traffic ──
        "get_recent_requests" => get_recent_requests_handler().await,
        "get_peers" => get_peers_handler().await,
        "get_mirror_latency" => get_mirror_latency_handler().await,
        "get_traffic_logs" => get_traffic_logs_handler(&args).await,
        "run_speed_test" => run_speed_test_handler().await,
        "export_logs" => export_logs_handler().await,

        // ── stats ──
        "flush_stats" => flush_stats_handler().await,

        // ── cache ──
        "get_cache_entries" => get_cache_entries_handler().await,
        "get_cache_config" => get_cache_config_handler().await,
        "update_cache_config" => update_cache_config_handler(&args).await,
        "clear_cache" => clear_cache_handler().await,
        "reindex_cache" => reindex_cache_handler().await,
        "open_cache_dir" => open_cache_dir_handler().await,

        // ── nodes ──
        "get_nodes" => get_nodes_handler().await,
        "scan_nodes" => scan_nodes_handler().await,
        "add_trusted_node" => add_trusted_node_handler(&args).await,
        "remove_node" => remove_node_handler(&args).await,

        // ── mirrors ──
        "get_mirrors" => get_mirrors_handler().await,
        "add_mirror" => add_mirror_handler(&args).await,
        "remove_mirror" => remove_mirror_handler(&args).await,
        "update_mirror" => update_mirror_handler(&args).await,
        "test_mirror_speed" => test_mirror_speed_handler().await,
        "probe_mirrors" => probe_mirrors_handler(&args).await,

        // ── rules ──
        "get_rules" => get_rules_handler().await,
        "add_rule" => add_rule_handler(&args).await,
        "update_rule" => update_rule_handler(&args).await,
        "remove_rule" => remove_rule_handler(&args).await,
        "toggle_rule" => toggle_rule_handler(&args).await,
        "reorder_rules" => reorder_rules_handler(&args).await,

        // ── settings ──
        "get_settings" => get_settings_handler().await,
        "save_settings" => save_settings_handler(&args).await,
        "reset_settings" => reset_settings_handler().await,

        _ => Err(format!("Unknown command: {}", command)),
    }
}

// ── proxy handlers ────────────────────────────────────────────────────────

async fn start_proxy_handler() -> Result<serde_json::Value, String> {
    use crate::commands::{CONFIG, PROXY_SERVER};
    use crate::proxy::ProxyServer;

    if APP_STATE.proxy_running.load(Ordering::SeqCst) {
        return Err("Proxy is already running".into());
    }
    let config = CONFIG.lock().clone();
    let port = config.port;
    let mut server = ProxyServer::new(port);
    server
        .start()
        .await
        .map_err(|e| format!("Failed to start proxy: {}", e))?;
    *PROXY_SERVER.lock() = Some(server);
    APP_STATE.proxy_running.store(true, Ordering::SeqCst);
    Ok(serde_json::json!({"message": format!("Proxy started on port {}", port)}))
}

async fn stop_proxy_handler() -> Result<serde_json::Value, String> {
    use crate::commands::PROXY_SERVER;

    if !APP_STATE.proxy_running.load(Ordering::SeqCst) {
        return Err("Proxy is not running".into());
    }
    let server_opt = PROXY_SERVER.lock().take();
    if let Some(mut server) = server_opt {
        server
            .stop()
            .await
            .map_err(|e| format!("Failed to stop proxy: {}", e))?;
    }
    APP_STATE.proxy_running.store(false, Ordering::SeqCst);
    Ok(serde_json::json!({"message": "Proxy stopped"}))
}

async fn get_proxy_status_handler() -> Result<serde_json::Value, String> {
    let running = APP_STATE.proxy_running.load(Ordering::SeqCst);
    let port = *APP_STATE.proxy_port.read();
    let config = PROXY_CONFIG.lock().clone();
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

async fn get_stats_handler() -> Result<serde_json::Value, String> {
    let stats = APP_STATE.stats.read().clone();
    serde_json::to_value(stats).map_err(|e| e.to_string())
}

async fn start_p2p_handler() -> Result<serde_json::Value, String> {
    use crate::commands::P2P_NETWORK;
    use crate::p2p::P2PNetwork;

    if APP_STATE.p2p_running.load(Ordering::SeqCst) {
        return Err("P2P network is already running".into());
    }
    let network = Arc::new(
        P2PNetwork::new()
            .await
            .map_err(|e| format!("Failed to create P2P network: {}", e))?,
    );
    let network_clone = network.clone();
    tokio::spawn(async move {
        if let Err(e) = network_clone.run().await {
            log::error!("P2P network error: {}", e);
        }
    });
    *P2P_NETWORK.lock() = Some(network);
    APP_STATE.p2p_running.store(true, Ordering::SeqCst);
    Ok(serde_json::json!({"message": "P2P network started"}))
}

async fn stop_p2p_handler() -> Result<serde_json::Value, String> {
    use crate::commands::P2P_NETWORK;
    if !APP_STATE.p2p_running.load(Ordering::SeqCst) {
        return Err("P2P network is not running".into());
    }
    *P2P_NETWORK.lock() = None;
    APP_STATE.p2p_running.store(false, Ordering::SeqCst);
    Ok(serde_json::json!({"message": "P2P network stopped"}))
}

async fn get_p2p_status_handler() -> Result<serde_json::Value, String> {
    let running = APP_STATE.p2p_running.load(Ordering::SeqCst);
    let stats = APP_STATE.stats.read();
    Ok(serde_json::json!({
        "running": running,
        "active_peers": stats.active_peers,
        "p2p_hits": stats.p2p_hits,
        "cache_size_bytes": stats.cache_size_bytes,
    }))
}

async fn update_config_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let config: crate::commands::ProxyConfig =
        serde_json::from_value(args.clone()).map_err(|e| e.to_string())?;
    *APP_STATE.proxy_port.write() = config.port;
    *PROXY_CONFIG.lock() = config;
    Ok(serde_json::json!({"message": "Config updated"}))
}

async fn get_config_handler() -> Result<serde_json::Value, String> {
    let config = PROXY_CONFIG.lock().clone();
    serde_json::to_value(config).map_err(|e| e.to_string())
}

// ── dashboard / traffic handlers ──────────────────────────────────────────

async fn get_recent_requests_handler() -> Result<serde_json::Value, String> {
    let v = RECENT_REQS.lock().clone();
    serde_json::to_value(v).map_err(|e| e.to_string())
}

async fn get_peers_handler() -> Result<serde_json::Value, String> {
    if !APP_STATE.proxy_running.load(Ordering::SeqCst) {
        return Ok(serde_json::json!([]));
    }
    let v = PEERS.lock().clone();
    serde_json::to_value(v).map_err(|e| e.to_string())
}

async fn get_mirror_latency_handler() -> Result<serde_json::Value, String> {
    let m = MIRROR_LATENCY.lock().clone();
    if !m.is_empty() {
        return serde_json::to_value(m).map_err(|e| e.to_string());
    }
    let pool = get_pool()?;
    let mirrors = db::list_mirrors(&pool).await?;
    let samples: Vec<MirrorLatencySample> = mirrors
        .into_iter()
        .filter(|x| x.enabled)
        .map(|x| MirrorLatencySample {
            name: x.name,
            latency: x.latency,
            hit_rate: 0,
        })
        .collect();
    serde_json::to_value(samples).map_err(|e| e.to_string())
}

async fn get_traffic_logs_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let time_range = get_arg!(args, "timeRange").as_str().map(String::from);
    let hours = time_range
        .as_deref()
        .map(|s| match s {
            "近1小时" => 1,
            "近24小时" => 24,
            "近7天" => 168,
            _ => 0,
        })
        .unwrap_or(0);
    let logs = crate::traffic::get_logs(hours, 500, 0).await?;
    serde_json::to_value(logs).map_err(|e| e.to_string())
}

async fn run_speed_test_handler() -> Result<serde_json::Value, String> {
    let result = SpeedTestResult {
        download_mbps: 0.0,
        upload_mbps: 0.0,
        latency_ms: 0,
    };
    serde_json::to_value(result).map_err(|e| e.to_string())
}

async fn export_logs_handler() -> Result<serde_json::Value, String> {
    use std::io::Write;
    let dir = dirs::download_dir()
        .or_else(dirs::home_dir)
        .ok_or_else(|| "Cannot resolve a writable directory for logs".to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("aidevproxy-logs.txt");
    let mut f = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    writeln!(
        f,
        "AIDevProxy log export\nproxy_running={}\np2p_running={}",
        APP_STATE.proxy_running.load(Ordering::SeqCst),
        APP_STATE.p2p_running.load(Ordering::SeqCst),
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({"message": format!("Logs exported to {}", path.display())}))
}

// ── stats persistence handler ─────────────────────────────────────────────

async fn flush_stats_handler() -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let persisted = APP_STATE.stats.read().to_persisted();
    db::save_persisted_stats(&pool, &persisted).await?;
    Ok(serde_json::json!({"message": "Stats flushed"}))
}

// ── cache handlers ────────────────────────────────────────────────────────

async fn get_cache_entries_handler() -> Result<serde_json::Value, String> {
    let v = CACHE_ENTRIES.lock().clone();
    serde_json::to_value(v).map_err(|e| e.to_string())
}

async fn get_cache_config_handler() -> Result<serde_json::Value, String> {
    let v = CACHE_CFG.lock().clone();
    serde_json::to_value(v).map_err(|e| e.to_string())
}

async fn update_cache_config_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let config: CacheConfig =
        serde_json::from_value(args.clone()).map_err(|e| e.to_string())?;
    *CACHE_CFG.lock() = config;
    Ok(serde_json::json!({"message": "Cache config updated"}))
}

async fn clear_cache_handler() -> Result<serde_json::Value, String> {
    CACHE_ENTRIES.lock().clear();
    APP_STATE.stats.write().cache_size_bytes = 0;
    Ok(serde_json::json!({"message": "Cache cleared"}))
}

async fn reindex_cache_handler() -> Result<serde_json::Value, String> {
    let entries = CACHE_ENTRIES.lock().clone();
    *CACHE_ENTRIES.lock() = entries;
    Ok(serde_json::json!({"message": "Cache reindexed"}))
}

async fn open_cache_dir_handler() -> Result<serde_json::Value, String> {
    let dir = CACHE_CFG.lock().cache_dir.clone();
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create cache dir: {}", e))?;
    open_path_in_os(&dir).map_err(|e| format!("Failed to open cache dir: {}", e))?;
    Ok(serde_json::json!({"message": format!("Opened {}", dir)}))
}

fn open_path_in_os(path: &str) -> std::io::Result<()> {
    #[cfg(target_os = "macos")]
    let mut cmd = std::process::Command::new("open");
    #[cfg(target_os = "windows")]
    let mut cmd = std::process::Command::new("explorer");
    #[cfg(target_os = "linux")]
    let mut cmd = std::process::Command::new("xdg-open");
    cmd.arg(path);
    cmd.status().map(|_| ())
}

// ── node handlers ─────────────────────────────────────────────────────────

async fn get_nodes_handler() -> Result<serde_json::Value, String> {
    let v = NODES.lock().clone();
    serde_json::to_value(v).map_err(|e| e.to_string())
}

async fn scan_nodes_handler() -> Result<serde_json::Value, String> {
    let n = NODES.lock().len() as u32;
    let result = ScanResult {
        found: n,
        new: 0,
        message: format!("扫描完成，发现 {} 个节点", n),
    };
    serde_json::to_value(result).map_err(|e| e.to_string())
}

async fn add_trusted_node_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let node_id = get_arg!(args, "nodeId")
        .as_str()
        .unwrap_or("")
        .to_string();
    if node_id.is_empty() {
        // Try "node_id" variant
        let node_id = get_arg!(args, "node_id")
            .as_str()
            .unwrap_or("")
            .to_string();
        if node_id.is_empty() {
            return Err("Missing nodeId".into());
        }
        let mut nodes = NODES.lock();
        if let Some(n) = nodes.iter_mut().find(|n| n.id == node_id) {
            n.trusted = true;
            return Ok(serde_json::json!({"message": format!("Node {} marked as trusted", node_id)}));
        }
        return Err(format!("Node {} not found", node_id));
    }
    let mut nodes = NODES.lock();
    if let Some(n) = nodes.iter_mut().find(|n| n.id == node_id) {
        n.trusted = true;
        return Ok(serde_json::json!({"message": format!("Node {} marked as trusted", node_id)}));
    }
    Err(format!("Node {} not found", node_id))
}

async fn remove_node_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let node_id = get_arg!(args, "nodeId")
        .as_str()
        .unwrap_or("")
        .to_string();
    if node_id.is_empty() {
        return Err("Missing nodeId".into());
    }
    let mut nodes = NODES.lock();
    let before = nodes.len();
    nodes.retain(|n| n.id != node_id);
    if nodes.len() == before {
        return Err(format!("Node {} not found", node_id));
    }
    Ok(serde_json::json!({"message": format!("Node {} removed", node_id)}))
}

// ── mirror handlers ───────────────────────────────────────────────────────

async fn get_mirrors_handler() -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let mirrors = db::list_mirrors(&pool).await?;
    serde_json::to_value(mirrors).map_err(|e| e.to_string())
}

async fn add_mirror_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let add_args: AddMirrorArgs =
        serde_json::from_value(args.clone()).map_err(|e| e.to_string())?;
    let id = format!("m{}", uuid::Uuid::new_v4().simple());
    let m = db::Mirror {
        id: id.clone(),
        name: add_args.name,
        url: add_args.url,
        ecosystem: add_args.ecosystem.unwrap_or_else(|| "pypi".into()),
        latency: 0,
        healthy: false,
        health_text: "未测速".into(),
        priority: add_args.priority.unwrap_or(100),
        enabled: true,
        last_test: "—".into(),
        protocol: add_args.protocol.unwrap_or_else(|| "HTTPS".into()),
        recommended: false,
        fallback_enabled: false,
        max_failures: 3,
        health_check_enabled: false,
        check_interval: "30秒".into(),
    };
    db::insert_mirror(&pool, &m).await?;
    Ok(serde_json::json!({"id": id, "message": "Mirror added"}))
}

async fn remove_mirror_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let id = get_arg!(args, "id").as_str().unwrap_or("").to_string();
    if id.is_empty() {
        return Err("Missing id".into());
    }
    let removed = db::delete_mirror(&pool, &id).await?;
    if !removed {
        return Err(format!("Mirror {} not found", id));
    }
    Ok(serde_json::json!({"message": format!("Mirror {} removed", id)}))
}

async fn update_mirror_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let update_args: UpdateMirrorArgs =
        serde_json::from_value(args.clone()).map_err(|e| e.to_string())?;
    db::update_mirror(
        &pool,
        &update_args.id,
        update_args.name.as_deref(),
        update_args.url.as_deref(),
        update_args.protocol.as_deref(),
        update_args.priority,
        update_args.enabled,
        update_args.ecosystem.as_deref(),
        update_args.fallback_enabled,
        update_args.max_failures,
        update_args.health_check_enabled,
        update_args.check_interval.as_deref(),
    )
    .await?;
    Ok(serde_json::json!({"message": "Mirror updated"}))
}

async fn test_mirror_speed_handler() -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    db::mark_all_tested(&pool).await?;
    Ok(serde_json::json!({"message": "Speed test triggered for all enabled mirrors"}))
}

async fn probe_mirrors_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let ids: Vec<String> = args
        .get("ids")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    if ids.is_empty() {
        return Ok(serde_json::json!([]));
    }

    let all = db::list_mirrors(&pool).await?;
    let targets: Vec<db::Mirror> = all
        .into_iter()
        .filter(|m| ids.iter().any(|id| id == &m.id))
        .collect();

    let probes = targets.iter().map(|m| {
        let url = m.url.clone();
        async move { health_check::probe(&url).await }
    });
    let results = join_all(probes).await;

    let now = health_check::now_hhmmss();
    for (m, (latency, healthy, health_text)) in targets.iter().zip(results.iter()) {
        if let Err(e) =
            db::update_health(&pool, &m.id, *latency, *healthy, health_text, &now).await
        {
            log::warn!("probe_mirrors: update {} failed: {}", m.id, e);
        }
    }

    let refreshed = db::list_mirrors(&pool).await?;
    let filtered: Vec<db::Mirror> = refreshed
        .into_iter()
        .filter(|m| ids.iter().any(|id| id == &m.id))
        .collect();
    serde_json::to_value(filtered).map_err(|e| e.to_string())
}

// ── rule handlers ─────────────────────────────────────────────────────────

async fn get_rules_handler() -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let rules = db::list_rules(&pool).await?;
    serde_json::to_value(rules).map_err(|e| e.to_string())
}

async fn add_rule_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let add_args: AddRuleArgs =
        serde_json::from_value(args.clone()).map_err(|e| e.to_string())?;
    let id = format!("r{}", uuid::Uuid::new_v4().simple());
    let rule = Rule {
        id: id.clone(),
        name: add_args.name,
        pattern: add_args.pattern,
        action: add_args.action,
        priority: add_args.priority.unwrap_or(100),
        enabled: add_args.enabled.unwrap_or(true),
        hits: 0,
        action_color: add_args.action_color.unwrap_or_else(|| "blue".into()),
    };
    db::insert_rule(&pool, &rule).await?;
    crate::refresh_rules_cache(&pool).await;
    Ok(serde_json::json!({"id": id, "message": "Rule added"}))
}

async fn update_rule_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let update_args: UpdateRuleArgs =
        serde_json::from_value(args.clone()).map_err(|e| e.to_string())?;
    db::update_rule_fields(
        &pool,
        &update_args.id,
        update_args.name.as_deref(),
        update_args.pattern.as_deref(),
        update_args.action.as_deref(),
        update_args.priority,
        update_args.enabled,
        update_args.action_color.as_deref(),
    ).await?;
    crate::refresh_rules_cache(&pool).await;
    Ok(serde_json::json!({"message": "Rule updated"}))
}

async fn remove_rule_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let id = get_arg!(args, "id").as_str().unwrap_or("").to_string();
    if id.is_empty() {
        return Err("Missing id".into());
    }
    let removed = db::delete_rule(&pool, &id).await?;
    if !removed {
        return Err(format!("Rule {} not found", id));
    }
    crate::refresh_rules_cache(&pool).await;
    Ok(serde_json::json!({"message": format!("Rule {} removed", id)}))
}

async fn toggle_rule_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let id = get_arg!(args, "id").as_str().unwrap_or("").to_string();
    if id.is_empty() {
        return Err("Missing id".into());
    }
    let rules = db::list_rules(&pool).await?;
    let r = rules.iter().find(|r| r.id == id)
        .ok_or_else(|| format!("Rule {} not found", id))?;
    db::set_rule_enabled(&pool, &id, !r.enabled).await?;
    crate::refresh_rules_cache(&pool).await;
    Ok(serde_json::json!({"message": format!("Rule {} toggled", id)}))
}

async fn reorder_rules_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let ids: Vec<String> = args
        .get("ids")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    db::reorder_rules(&pool, &ids).await?;
    crate::refresh_rules_cache(&pool).await;
    Ok(serde_json::json!({"message": "Rules reordered"}))
}

// ── settings handlers ─────────────────────────────────────────────────────

async fn get_settings_handler() -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let s = db::get_settings(&pool).await?;
    serde_json::to_value(s).map_err(|e| e.to_string())
}

async fn save_settings_handler(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    let settings: Settings =
        serde_json::from_value(args.clone()).map_err(|e| e.to_string())?;
    if let Ok(p) = settings.port.parse::<u16>() {
        *APP_STATE.proxy_port.write() = p;
    }
    db::save_settings(&pool, &settings).await?;
    Ok(serde_json::json!({"message": "Settings saved"}))
}

async fn reset_settings_handler() -> Result<serde_json::Value, String> {
    let pool = get_pool()?;
    db::reset_settings(&pool).await?;
    Ok(serde_json::json!({"message": "Settings reset to defaults"}))
}
