pub mod proxy;
pub mod p2p;
pub mod commands;
pub mod commands_extra;
pub mod db;
pub mod health_check;
pub mod http_server;
pub mod traffic;

use std::sync::Arc;
use parking_lot::RwLock;
use once_cell::sync::Lazy;
use std::sync::atomic::AtomicBool;

use crate::db::Rule;
use sqlx::SqlitePool;

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

impl ProxyStats {
    /// Extract the fields that should survive a restart.
    pub fn to_persisted(&self) -> crate::db::PersistedStats {
        crate::db::PersistedStats {
            total_requests: self.total_requests,
            total_bytes_saved: self.total_bytes_saved,
            total_bytes_transferred: self.total_bytes_transferred,
            mirror_hits: self.mirror_hits,
            p2p_hits: self.p2p_hits,
        }
    }

    /// Load persisted cumulative values on startup.
    /// Session-only fields (`active_peers`, `cache_size_bytes`, `uptime_seconds`)
    /// stay at zero and are populated at runtime.
    pub fn load_persisted(&mut self, p: &crate::db::PersistedStats) {
        self.total_requests = p.total_requests;
        self.total_bytes_saved = p.total_bytes_saved;
        self.total_bytes_transferred = p.total_bytes_transferred;
        self.mirror_hits = p.mirror_hits;
        self.p2p_hits = p.p2p_hits;
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

/* ── rules cache ────────────────────────────────────────────────────── */

/// In-memory cache of rules, refreshed from SQLite after every mutation.
/// The proxy interceptor reads this without blocking — it holds a read lock
/// for microseconds per request, and writes are rare (user edits rules).
pub(crate) static RULES_CACHE: Lazy<RwLock<Vec<Rule>>> = Lazy::new(|| RwLock::new(Vec::new()));

/// Reload the rules cache from the database.
pub(crate) async fn refresh_rules_cache(pool: &SqlitePool) {
    match crate::db::list_rules(pool).await {
        Ok(rules) => {
            *RULES_CACHE.write() = rules;
        }
        Err(e) => {
            log::warn!("refresh_rules_cache: failed to load rules: {}", e);
        }
    }
}
