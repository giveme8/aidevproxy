//! Additional Tauri commands backing the multi-page UI.
//!
//! Mirror data is persisted to SQLite via `crate::db`. Other collections
//! (rules, nodes, cache, traffic, settings) remain in-memory.

use crate::APP_STATE;
use crate::commands::PROXY_SERVER;
use crate::db;
use crate::health_check;
use futures::future::join_all;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::atomic::Ordering;
use tauri::State;

/* ── data types ─────────────────────────────────────────────────────────── */

// Re-export Mirror, Rule, and Settings from db module (persisted to SQLite).
pub use crate::db::Mirror;
pub use crate::db::Rule;
pub use crate::db::Settings;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub latency: u32,
    pub cache: String,
    pub online: bool,
    pub device: String,
    pub last_seen: String,
    pub trusted: bool,
    pub os: Option<String>,
    pub version: Option<String>,
    pub uptime: Option<String>,
    pub bandwidth: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry {
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub source: String,
    pub size_bytes: u64,
    pub last_used: String,
    pub sha256: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub max_size_gb: u32,
    pub auto_clean: bool,
    pub clean_policy: String,
    pub clean_threshold_pct: u32,
    pub min_retention_days: u32,
    pub cache_dir: String,
}

impl Default for CacheConfig {
    fn default() -> Self {
        let dir = dirs::cache_dir()
            .map(|p| p.join("aidevproxy").to_string_lossy().into_owned())
            .unwrap_or_else(|| "~/.cache/aidevproxy".into());
        Self {
            max_size_gb: 100,
            auto_clean: true,
            clean_policy: "LRU".into(),
            clean_threshold_pct: 90,
            min_retention_days: 7,
            cache_dir: dir,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrafficLogEntry {
    pub id: u64,
    pub time: String,
    pub tool: String,
    pub host: String,
    pub path: String,
    pub mode: String,
    pub source: String,
    pub size: String,
    pub latency: u32,
    pub status: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentRequest {
    pub id: u64,
    pub time: String,
    pub tool: String,
    pub host: String,
    pub mode: String,
    pub source: String,
    pub speed: String,
    pub status: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MirrorLatencySample {
    pub name: String,
    pub latency: u32,
    pub hit_rate: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Peer {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub latency: u32,
    pub cache: String,
    pub online: bool,
    pub last_seen: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeedTestResult {
    pub download_mbps: f64,
    pub upload_mbps: f64,
    pub latency_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub found: u32,
    pub new: u32,
    pub message: String,
}

/* ── stores ─────────────────────────────────────────────────────────────── */

// MIRRORS and RULES moved to SQLite (crate::db)
pub(crate) static NODES: Lazy<Mutex<Vec<NodeInfo>>> = Lazy::new(|| Mutex::new(Vec::new()));
pub(crate) static CACHE_ENTRIES: Lazy<Mutex<Vec<CacheEntry>>> = Lazy::new(|| Mutex::new(Vec::new()));
pub(crate) static CACHE_CFG: Lazy<Mutex<CacheConfig>> = Lazy::new(|| Mutex::new(CacheConfig::default()));
pub(crate) static RECENT_REQS: Lazy<Mutex<Vec<RecentRequest>>> = Lazy::new(|| Mutex::new(Vec::new()));
pub(crate) static MIRROR_LATENCY: Lazy<Mutex<Vec<MirrorLatencySample>>> = Lazy::new(|| Mutex::new(Vec::new()));
pub(crate) static PEERS: Lazy<Mutex<Vec<Peer>>> = Lazy::new(|| Mutex::new(Vec::new()));

/* ── traffic / dashboard ────────────────────────────────────────────────── */

#[tauri::command]
pub async fn get_recent_requests() -> Result<Vec<RecentRequest>, String> {
    Ok(RECENT_REQS.lock().clone())
}

#[tauri::command]
pub async fn get_peers() -> Result<Vec<Peer>, String> {
    if !APP_STATE.proxy_running.load(Ordering::SeqCst) {
        return Ok(Vec::new());
    }
    Ok(PEERS.lock().clone())
}

#[tauri::command]
pub async fn get_mirror_latency(pool: State<'_, SqlitePool>) -> Result<Vec<MirrorLatencySample>, String> {
    let m = MIRROR_LATENCY.lock().clone();
    if !m.is_empty() {
        return Ok(m);
    }
    // Derive from registered mirrors as a snapshot when no separate samples exist.
    let mirrors = db::list_mirrors(&pool).await?;
    Ok(mirrors
        .into_iter()
        .filter(|x| x.enabled)
        .map(|x| MirrorLatencySample {
            name: x.name,
            latency: x.latency,
            hit_rate: 0,
        })
        .collect())
}

#[tauri::command]
pub async fn get_traffic_logs(time_range: Option<String>) -> Result<Vec<TrafficLogEntry>, String> {
    let hours = time_range
        .as_deref()
        .map(|s| match s {
            "近1小时" => 1,
            "近24小时" => 24,
            "近7天" => 168,
            _ => 0,
        })
        .unwrap_or(0);
    crate::traffic::get_logs(hours, 500, 0).await
}

/* ── cache ──────────────────────────────────────────────────────────────── */

#[tauri::command]
pub async fn get_cache_entries() -> Result<Vec<CacheEntry>, String> {
    Ok(CACHE_ENTRIES.lock().clone())
}

#[tauri::command]
pub async fn get_cache_config() -> Result<CacheConfig, String> {
    Ok(CACHE_CFG.lock().clone())
}

#[tauri::command]
pub async fn update_cache_config(config: CacheConfig) -> Result<String, String> {
    *CACHE_CFG.lock() = config;
    Ok("Cache config updated".into())
}

#[tauri::command]
pub async fn clear_cache() -> Result<String, String> {
    CACHE_ENTRIES.lock().clear();
    APP_STATE.stats.write().cache_size_bytes = 0;
    Ok("Cache cleared".into())
}

#[tauri::command]
pub async fn reindex_cache() -> Result<String, String> {
    // No on-disk index yet — simply touch the entries vector so the timestamp
    // recorded by the proxy server (when present) is refreshed.
    let entries = CACHE_ENTRIES.lock().clone();
    *CACHE_ENTRIES.lock() = entries;
    Ok("Cache reindexed".into())
}

#[tauri::command]
pub async fn open_cache_dir() -> Result<String, String> {
    let dir = CACHE_CFG.lock().cache_dir.clone();
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create cache dir: {}", e))?;
    open_path_in_os(&dir).map_err(|e| format!("Failed to open cache dir: {}", e))?;
    Ok(format!("Opened {}", dir))
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

/* ── nodes ──────────────────────────────────────────────────────────────── */

#[tauri::command]
pub async fn get_nodes() -> Result<Vec<NodeInfo>, String> {
    Ok(NODES.lock().clone())
}

#[tauri::command]
pub async fn scan_nodes() -> Result<ScanResult, String> {
    let n = NODES.lock().len() as u32;
    Ok(ScanResult {
        found: n,
        new: 0,
        message: format!("扫描完成，发现 {} 个节点", n),
    })
}

#[tauri::command]
pub async fn add_trusted_node(node_id: String) -> Result<String, String> {
    let mut nodes = NODES.lock();
    if let Some(n) = nodes.iter_mut().find(|n| n.id == node_id) {
        n.trusted = true;
        return Ok(format!("Node {} marked as trusted", node_id));
    }
    Err(format!("Node {} not found", node_id))
}

#[tauri::command]
pub async fn remove_node(node_id: String) -> Result<String, String> {
    let mut nodes = NODES.lock();
    let before = nodes.len();
    nodes.retain(|n| n.id != node_id);
    if nodes.len() == before {
        return Err(format!("Node {} not found", node_id));
    }
    Ok(format!("Node {} removed", node_id))
}

/* ── mirrors ────────────────────────────────────────────────────────────── */

#[tauri::command]
pub async fn get_mirrors(pool: State<'_, SqlitePool>) -> Result<Vec<Mirror>, String> {
    db::list_mirrors(&pool).await
}

#[derive(Debug, Deserialize)]
pub struct AddMirrorArgs {
    pub name: String,
    pub url: String,
    #[serde(default)]
    pub ecosystem: Option<String>,
    #[serde(default)]
    pub protocol: Option<String>,
    #[serde(default)]
    pub priority: Option<u32>,
}

#[tauri::command]
pub async fn add_mirror(pool: State<'_, SqlitePool>, args: AddMirrorArgs) -> Result<String, String> {
    let id = format!("m{}", uuid::Uuid::new_v4().simple());
    let m = Mirror {
        id: id.clone(),
        name: args.name,
        url: args.url,
        ecosystem: args.ecosystem.unwrap_or_else(|| "pypi".into()),
        latency: 0,
        healthy: false,
        health_text: "未测速".into(),
        priority: args.priority.unwrap_or(100),
        enabled: true,
        last_test: "—".into(),
        protocol: args.protocol.unwrap_or_else(|| "HTTPS".into()),
        recommended: false,
        fallback_enabled: false,
        max_failures: 3,
        health_check_enabled: false,
        check_interval: "30秒".into(),
    };
    db::insert_mirror(&pool, &m).await?;
    Ok(id)
}

#[tauri::command]
pub async fn remove_mirror(pool: State<'_, SqlitePool>, id: String) -> Result<String, String> {
    let removed = db::delete_mirror(&pool, &id).await?;
    if !removed {
        return Err(format!("Mirror {} not found", id));
    }
    Ok(format!("Mirror {} removed", id))
}

#[derive(Debug, Deserialize)]
pub struct UpdateMirrorArgs {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub protocol: Option<String>,
    #[serde(default)]
    pub priority: Option<u32>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub ecosystem: Option<String>,
    #[serde(default)]
    pub fallback_enabled: Option<bool>,
    #[serde(default)]
    pub max_failures: Option<u32>,
    #[serde(default)]
    pub health_check_enabled: Option<bool>,
    #[serde(default)]
    pub check_interval: Option<String>,
}

#[tauri::command]
pub async fn update_mirror(pool: State<'_, SqlitePool>, args: UpdateMirrorArgs) -> Result<String, String> {
    db::update_mirror(
        &pool,
        &args.id,
        args.name.as_deref(),
        args.url.as_deref(),
        args.protocol.as_deref(),
        args.priority,
        args.enabled,
        args.ecosystem.as_deref(),
        args.fallback_enabled,
        args.max_failures,
        args.health_check_enabled,
        args.check_interval.as_deref(),
    )
    .await?;
    Ok("Mirror updated".into())
}

#[tauri::command]
pub async fn test_mirror_speed(pool: State<'_, SqlitePool>) -> Result<String, String> {
    db::mark_all_tested(&pool).await?;
    Ok("Speed test triggered for all enabled mirrors".into())
}

/// Probe the supplied mirrors concurrently, persist the result to the DB, and
/// return the freshly-updated rows. Called by the "refresh" button on the
/// mirrors page so the UI gets an immediate, on-demand reading instead of
/// waiting for the background scheduler tick.
#[tauri::command]
pub async fn probe_mirrors(
    pool: State<'_, SqlitePool>,
    ids: Vec<String>,
) -> Result<Vec<Mirror>, String> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let all = db::list_mirrors(&pool).await?;
    let targets: Vec<Mirror> = all
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
        if let Err(e) = db::update_health(&pool, &m.id, *latency, *healthy, health_text, &now).await
        {
            log::warn!("probe_mirrors: update {} failed: {}", m.id, e);
        }
    }

    let refreshed = db::list_mirrors(&pool).await?;
    Ok(refreshed
        .into_iter()
        .filter(|m| ids.iter().any(|id| id == &m.id))
        .collect())
}

/* ── rules ──────────────────────────────────────────────────────────────── */

#[tauri::command]
pub async fn get_rules(pool: State<'_, SqlitePool>) -> Result<Vec<Rule>, String> {
    db::list_rules(&pool).await
}

#[derive(Debug, Deserialize)]
pub struct AddRuleArgs {
    pub name: String,
    pub pattern: String,
    pub action: String,
    #[serde(default)]
    pub priority: Option<u32>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub action_color: Option<String>,
}

#[tauri::command]
pub async fn add_rule(pool: State<'_, SqlitePool>, args: AddRuleArgs) -> Result<String, String> {
    let id = format!("r{}", uuid::Uuid::new_v4().simple());
    let r = Rule {
        id: id.clone(),
        name: args.name,
        pattern: args.pattern,
        action: args.action,
        priority: args.priority.unwrap_or(100),
        enabled: args.enabled.unwrap_or(true),
        hits: 0,
        action_color: args.action_color.unwrap_or_else(|| "blue".into()),
    };
    db::insert_rule(&pool, &r).await?;
    crate::refresh_rules_cache(&pool).await;
    Ok(id)
}

#[derive(Debug, Deserialize)]
pub struct UpdateRuleArgs {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub pattern: Option<String>,
    #[serde(default)]
    pub action: Option<String>,
    #[serde(default)]
    pub priority: Option<u32>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub action_color: Option<String>,
}

#[tauri::command]
pub async fn update_rule(pool: State<'_, SqlitePool>, args: UpdateRuleArgs) -> Result<String, String> {
    db::update_rule_fields(
        &pool,
        &args.id,
        args.name.as_deref(),
        args.pattern.as_deref(),
        args.action.as_deref(),
        args.priority,
        args.enabled,
        args.action_color.as_deref(),
    ).await?;
    crate::refresh_rules_cache(&pool).await;
    Ok("Rule updated".into())
}

#[tauri::command]
pub async fn remove_rule(pool: State<'_, SqlitePool>, id: String) -> Result<String, String> {
    let removed = db::delete_rule(&pool, &id).await?;
    if !removed {
        return Err(format!("Rule {} not found", id));
    }
    crate::refresh_rules_cache(&pool).await;
    Ok(format!("Rule {} removed", id))
}

#[tauri::command]
pub async fn toggle_rule(pool: State<'_, SqlitePool>, id: String) -> Result<String, String> {
    // Read current state, flip, write back.
    let rules = db::list_rules(&pool).await?;
    let r = rules.iter().find(|r| r.id == id)
        .ok_or_else(|| format!("Rule {} not found", id))?;
    db::set_rule_enabled(&pool, &id, !r.enabled).await?;
    crate::refresh_rules_cache(&pool).await;
    Ok(format!("Rule {} toggled", id))
}

#[tauri::command]
pub async fn reorder_rules(pool: State<'_, SqlitePool>, ids: Vec<String>) -> Result<String, String> {
    db::reorder_rules(&pool, &ids).await?;
    crate::refresh_rules_cache(&pool).await;
    Ok("Rules reordered".into())
}

/* ── settings ───────────────────────────────────────────────────────────── */

#[tauri::command]
pub async fn get_settings(pool: State<'_, SqlitePool>) -> Result<Settings, String> {
    db::get_settings(&pool).await
}

#[tauri::command]
pub async fn save_settings(pool: State<'_, SqlitePool>, settings: Settings) -> Result<String, String> {
    // Keep proxy port in sync if it changed.
    if let Ok(p) = settings.port.parse::<u16>() {
        *APP_STATE.proxy_port.write() = p;
    }
    // Keep CONFIG switches in sync with settings.
    {
        let mut cfg = crate::commands::CONFIG.lock();
        cfg.enable_mirror = settings.mirror_enabled;
        cfg.enable_cache = settings.cache_enabled;
        cfg.enable_p2p = settings.p2p;
        cfg.auto_start = settings.startup;
    }
    db::save_settings(&pool, &settings).await?;
    Ok("Settings saved".into())
}

#[tauri::command]
pub async fn reset_settings(pool: State<'_, SqlitePool>) -> Result<String, String> {
    db::reset_settings(&pool).await?;
    Ok("Settings reset to defaults".into())
}

/* ── stats persistence ──────────────────────────────────────────────────── */

/// Persist the current in-memory cumulative stats to SQLite.
/// Should be called periodically and on shutdown.
#[tauri::command]
pub async fn flush_stats(pool: State<'_, SqlitePool>) -> Result<String, String> {
    let persisted = APP_STATE.stats.read().to_persisted();
    db::save_persisted_stats(&pool, &persisted).await?;
    Ok("Stats flushed".into())
}

/* ── misc ───────────────────────────────────────────────────────────────── */

#[tauri::command]
pub async fn run_speed_test() -> Result<SpeedTestResult, String> {
    // No real measurement subsystem yet — return zeroes rather than fabricated numbers.
    Ok(SpeedTestResult {
        download_mbps: 0.0,
        upload_mbps: 0.0,
        latency_ms: 0,
    })
}

#[tauri::command]
pub async fn export_logs() -> Result<String, String> {
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
    // Touch proxy server to keep compiler happy that the import is exercised.
    let _ = PROXY_SERVER.lock();
    Ok(format!("Logs exported to {}", path.display()))
}
