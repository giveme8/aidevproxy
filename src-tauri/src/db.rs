//! SQLite-backed mirror persistence.
//!
//! Uses `sqlx` with a shared `SqlitePool`. The `tauri-plugin-sql` plugin
//! manages the DB lifecycle; this module provides typed CRUD helpers that
//! the Tauri commands in `commands_extra` delegate to.

use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqliteRow};
use sqlx::Row;
use std::path::Path;

/// Mirror record stored in the `mirrors` table.
///
/// Field types match the SQLite schema: booleans are stored as INTEGER 0/1,
/// which sqlx transparently converts.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Mirror {
    pub id: String,
    pub name: String,
    pub url: String,
    pub ecosystem: String,
    pub latency: u32,
    pub healthy: bool,
    pub health_text: String,
    pub priority: u32,
    pub enabled: bool,
    pub last_test: String,
    pub protocol: String,
    #[serde(default)]
    pub recommended: bool,
    #[serde(default)]
    pub fallback_enabled: bool,
    #[serde(default = "default_max_fail")]
    pub max_failures: u32,
    #[serde(default)]
    pub health_check_enabled: bool,
    #[serde(default = "default_check_interval")]
    pub check_interval: String,
}

fn default_max_fail() -> u32 { 3 }
fn default_check_interval() -> String { "30秒".into() }

/* ── Stats record (persisted to SQLite, single-row) ─────────────────── */

/// Proxy statistics persisted to SQLite as a single-row table.
/// Fields that are inherently session-only (`active_peers`, `uptime_seconds`)
/// are NOT persisted — they stay in-memory and reset on restart.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PersistedStats {
    pub total_requests: u64,
    pub total_bytes_saved: u64,
    pub total_bytes_transferred: u64,
    pub mirror_hits: u64,
    pub p2p_hits: u64,
}

impl Default for PersistedStats {
    fn default() -> Self {
        Self {
            total_requests: 0,
            total_bytes_saved: 0,
            total_bytes_transferred: 0,
            mirror_hits: 0,
            p2p_hits: 0,
        }
    }
}

/* ── Rule record (persisted to SQLite) ──────────────────────────────── */

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Rule {
    pub id: String,
    pub name: String,
    pub pattern: String,
    pub action: String,
    pub priority: u32,
    pub enabled: bool,
    #[serde(default)]
    pub hits: u64,
    #[serde(default = "default_action_color")]
    pub action_color: String,
}

fn default_action_color() -> String { "blue".into() }

/* ── Settings record (persisted to SQLite, key-value rows) ─────────── */

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Settings {
    pub port: String,
    pub startup: bool,
    pub sys_proxy: bool,
    pub theme: String,
    pub lang: String,
    pub min_tray: bool,
    pub tray_action: String,
    pub cache_dir: String,
    pub cache_max: u32,
    pub auto_clean: bool,
    pub clean_policy: String,
    pub keep_days: String,
    pub low_disk: String,
    pub p2p: bool,
    pub mirror_enabled: bool,
    pub cache_enabled: bool,
    pub lan_discovery: bool,
    pub device_name: String,
    pub same_subnet: bool,
    pub max_conn: String,
    pub up_limit: String,
    pub up_unit: String,
    pub down_limit: String,
    pub down_unit: String,
    pub sha256: bool,
    pub cert_verify: String,
    pub allow_insecure: bool,
    pub log_desensitize: bool,
    pub desens_level: String,
    pub acl: String,
    pub allowed_ips: String,
    pub concurrent: String,
    pub idle_timeout: String,
    pub dns: String,
    pub tcp_opt: String,
    pub udp_relay: bool,
    pub ipv6: bool,
}

impl Settings {
    /// Serialize all fields into key-value pairs for SQLite storage.
    pub fn to_kv_pairs(&self) -> Vec<(String, String)> {
        vec![
            ("port".into(), self.port.clone()),
            ("startup".into(), (self.startup as i64).to_string()),
            ("sys_proxy".into(), (self.sys_proxy as i64).to_string()),
            ("theme".into(), self.theme.clone()),
            ("lang".into(), self.lang.clone()),
            ("min_tray".into(), (self.min_tray as i64).to_string()),
            ("tray_action".into(), self.tray_action.clone()),
            ("cache_dir".into(), self.cache_dir.clone()),
            ("cache_max".into(), (self.cache_max as i64).to_string()),
            ("auto_clean".into(), (self.auto_clean as i64).to_string()),
            ("clean_policy".into(), self.clean_policy.clone()),
            ("keep_days".into(), self.keep_days.clone()),
            ("low_disk".into(), self.low_disk.clone()),
            ("p2p".into(), (self.p2p as i64).to_string()),
            ("mirror_enabled".into(), (self.mirror_enabled as i64).to_string()),
            ("cache_enabled".into(), (self.cache_enabled as i64).to_string()),
            ("lan_discovery".into(), (self.lan_discovery as i64).to_string()),
            ("device_name".into(), self.device_name.clone()),
            ("same_subnet".into(), (self.same_subnet as i64).to_string()),
            ("max_conn".into(), self.max_conn.clone()),
            ("up_limit".into(), self.up_limit.clone()),
            ("up_unit".into(), self.up_unit.clone()),
            ("down_limit".into(), self.down_limit.clone()),
            ("down_unit".into(), self.down_unit.clone()),
            ("sha256".into(), (self.sha256 as i64).to_string()),
            ("cert_verify".into(), self.cert_verify.clone()),
            ("allow_insecure".into(), (self.allow_insecure as i64).to_string()),
            ("log_desensitize".into(), (self.log_desensitize as i64).to_string()),
            ("desens_level".into(), self.desens_level.clone()),
            ("acl".into(), self.acl.clone()),
            ("allowed_ips".into(), self.allowed_ips.clone()),
            ("concurrent".into(), self.concurrent.clone()),
            ("idle_timeout".into(), self.idle_timeout.clone()),
            ("dns".into(), self.dns.clone()),
            ("tcp_opt".into(), self.tcp_opt.clone()),
            ("udp_relay".into(), (self.udp_relay as i64).to_string()),
            ("ipv6".into(), (self.ipv6 as i64).to_string()),
        ]
    }

    /// Build a Settings from key-value rows, filling missing keys from defaults.
    pub fn from_kv_rows(rows: &[(String, String)]) -> Self {
        let defaults = Self::default();
        let get = |key: &str| -> String {
            rows.iter()
                .find(|(k, _)| k == key)
                .map(|(_, v)| v.clone())
                .unwrap_or_default()
        };
        let get_bool = |key: &str, default: bool| -> bool {
            rows.iter().find(|(k, _)| k == key)
                .map(|(_, v)| v == "1")
                .unwrap_or(default)
        };
        Self {
            port: get("port"),
            startup: get_bool("startup", defaults.startup),
            sys_proxy: get_bool("sys_proxy", defaults.sys_proxy),
            theme: get("theme"),
            lang: get("lang"),
            min_tray: get_bool("min_tray", defaults.min_tray),
            tray_action: get("tray_action"),
            cache_dir: get("cache_dir"),
            cache_max: get("cache_max").parse().unwrap_or(defaults.cache_max),
            auto_clean: get_bool("auto_clean", defaults.auto_clean),
            clean_policy: get("clean_policy"),
            keep_days: get("keep_days"),
            low_disk: get("low_disk"),
            p2p: get_bool("p2p", defaults.p2p),
            mirror_enabled: get_bool("mirror_enabled", defaults.mirror_enabled),
            cache_enabled: get_bool("cache_enabled", defaults.cache_enabled),
            lan_discovery: get_bool("lan_discovery", defaults.lan_discovery),
            device_name: get("device_name"),
            same_subnet: get_bool("same_subnet", defaults.same_subnet),
            max_conn: get("max_conn"),
            up_limit: get("up_limit"),
            up_unit: get("up_unit"),
            down_limit: get("down_limit"),
            down_unit: get("down_unit"),
            sha256: get_bool("sha256", defaults.sha256),
            cert_verify: get("cert_verify"),
            allow_insecure: get_bool("allow_insecure", defaults.allow_insecure),
            log_desensitize: get_bool("log_desensitize", defaults.log_desensitize),
            desens_level: get("desens_level"),
            acl: get("acl"),
            allowed_ips: get("allowed_ips"),
            concurrent: get("concurrent"),
            idle_timeout: get("idle_timeout"),
            dns: get("dns"),
            tcp_opt: get("tcp_opt"),
            udp_relay: get_bool("udp_relay", defaults.udp_relay),
            ipv6: get_bool("ipv6", defaults.ipv6),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        let cache_dir = dirs::cache_dir()
            .map(|p| p.join("aidevproxy").to_string_lossy().into_owned())
            .unwrap_or_else(|| "~/.cache/aidevproxy".into());
        let device_name = std::env::var("HOSTNAME")
            .or_else(|_| std::env::var("COMPUTERNAME"))
            .unwrap_or_else(|_| "this-device".into());
        Self {
            port: "8899".into(),
            startup: false,
            sys_proxy: false,
            theme: "深色".into(),
            lang: "简体中文".into(),
            min_tray: false,
            tray_action: "显示主窗口".into(),
            cache_dir,
            cache_max: 50,
            auto_clean: true,
            clean_policy: "LRU (最近最少使用)".into(),
            keep_days: "7".into(),
            low_disk: "可用空间小于 10GB".into(),
            p2p: true,
            mirror_enabled: true,
            cache_enabled: true,
            lan_discovery: true,
            device_name,
            same_subnet: true,
            max_conn: "200".into(),
            up_limit: "0".into(),
            up_unit: "MB/s".into(),
            down_limit: "0".into(),
            down_unit: "MB/s".into(),
            sha256: true,
            cert_verify: "严格校验".into(),
            allow_insecure: false,
            log_desensitize: true,
            desens_level: "标准".into(),
            acl: "白名单模式".into(),
            allowed_ips: "".into(),
            concurrent: "1024".into(),
            idle_timeout: "60".into(),
            dns: "系统 DNS".into(),
            tcp_opt: "启用".into(),
            udp_relay: true,
            ipv6: false,
        }
    }
}

/// Create the database pool at the given directory and ensure the `mirrors`
/// table exists.
pub async fn init_pool(db_dir: &Path) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    std::fs::create_dir_all(db_dir)?;
    let db_path = db_dir.join("mirrors.db");
    // Create the file explicitly so the sandbox can't block sqlite3_open_v2.
    if !db_path.exists() {
        std::fs::File::create(&db_path)?;
    }
    let options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true);
    let pool = SqlitePool::connect_with(options).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS mirrors (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            ecosystem TEXT NOT NULL DEFAULT 'pypi',
            latency INTEGER NOT NULL DEFAULT 0,
            healthy INTEGER NOT NULL DEFAULT 0,
            health_text TEXT NOT NULL DEFAULT '未测速',
            priority INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1,
            last_test TEXT NOT NULL DEFAULT '—',
            protocol TEXT NOT NULL DEFAULT 'HTTPS',
            recommended INTEGER NOT NULL DEFAULT 0,
            fallback_enabled INTEGER NOT NULL DEFAULT 0,
            max_failures INTEGER NOT NULL DEFAULT 3,
            health_check_enabled INTEGER NOT NULL DEFAULT 0,
            check_interval TEXT NOT NULL DEFAULT '30秒'
        )"
    ).execute(&pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS rules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            pattern TEXT NOT NULL,
            action TEXT NOT NULL DEFAULT 'mirror',
            priority INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1,
            hits INTEGER NOT NULL DEFAULT 0,
            action_color TEXT NOT NULL DEFAULT 'blue'
        )"
    ).execute(&pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS traffic_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            time TEXT NOT NULL,
            tool TEXT NOT NULL DEFAULT '',
            host TEXT NOT NULL DEFAULT '',
            path TEXT NOT NULL DEFAULT '',
            mode TEXT NOT NULL DEFAULT 'Direct',
            source TEXT NOT NULL DEFAULT '',
            size TEXT NOT NULL DEFAULT '0 B',
            latency INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 0
        )"
    ).execute(&pool).await?;

    // Drop old wide-table schema if it exists (migration from single-row to KV).
    sqlx::query("DROP TABLE IF EXISTS settings_old").execute(&pool).await?;
    // If the current settings table has the old wide schema, rename and recreate.
    let table_info: Vec<(String,)> = sqlx::query_as(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'"
    ).fetch_all(&pool).await.unwrap_or_default();
    let needs_migration = table_info.iter().any(|(sql,)| sql.contains("port TEXT"));
    if needs_migration {
        sqlx::query("ALTER TABLE settings RENAME TO settings_old").execute(&pool).await?;
    }
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )"
    ).execute(&pool).await?;
    // Migrate data: read old wide row, write as KV rows, then drop old table.
    if needs_migration {
        if let Ok(Some(row)) = sqlx::query("SELECT * FROM settings_old").fetch_optional(&pool).await {
            // Build a Settings from the old wide row using column names.
            let s = row_to_settings_old(&row)?;
            save_settings(&pool, &s).await?;
        }
        sqlx::query("DROP TABLE IF EXISTS settings_old").execute(&pool).await?;
    }

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_requests INTEGER NOT NULL DEFAULT 0,
            total_bytes_saved INTEGER NOT NULL DEFAULT 0,
            total_bytes_transferred INTEGER NOT NULL DEFAULT 0,
            mirror_hits INTEGER NOT NULL DEFAULT 0,
            p2p_hits INTEGER NOT NULL DEFAULT 0
        )"
    ).execute(&pool).await?;

    // Seed default mirrors on first run (empty table).
    seed_defaults(&pool).await?;
    // Seed default rules on first run (empty table).
    seed_default_rules(&pool).await?;
    // Seed default settings on first run (empty table).
    seed_default_settings(&pool).await?;
    // Seed default stats row on first run (empty table).
    seed_default_stats(&pool).await?;
    // Populate in-memory rules cache from DB.
    crate::refresh_rules_cache(&pool).await;

    Ok(pool)
}

/// Read a row from the old wide-column `settings` table (migration helper).
fn row_to_settings_old(r: &SqliteRow) -> Result<Settings, String> {
    use sqlx::Row;
    Ok(Settings {
        port: r.try_get("port").map_err(|e| e.to_string())?,
        startup: r.try_get::<i64, _>("startup").map_err(|e| e.to_string())? != 0,
        sys_proxy: r.try_get::<i64, _>("sys_proxy").map_err(|e| e.to_string())? != 0,
        theme: r.try_get("theme").map_err(|e| e.to_string())?,
        lang: r.try_get("lang").map_err(|e| e.to_string())?,
        min_tray: r.try_get::<i64, _>("min_tray").map_err(|e| e.to_string())? != 0,
        tray_action: r.try_get("tray_action").map_err(|e| e.to_string())?,
        cache_dir: r.try_get("cache_dir").map_err(|e| e.to_string())?,
        cache_max: r.try_get::<i64, _>("cache_max").map_err(|e| e.to_string())? as u32,
        auto_clean: r.try_get::<i64, _>("auto_clean").map_err(|e| e.to_string())? != 0,
        clean_policy: r.try_get("clean_policy").map_err(|e| e.to_string())?,
        keep_days: r.try_get("keep_days").map_err(|e| e.to_string())?,
        low_disk: r.try_get("low_disk").map_err(|e| e.to_string())?,
        p2p: r.try_get::<i64, _>("p2p").map_err(|e| e.to_string())? != 0,
        mirror_enabled: r.try_get::<i64, _>("mirror_enabled").unwrap_or(1) != 0,
        cache_enabled: r.try_get::<i64, _>("cache_enabled").unwrap_or(1) != 0,
        lan_discovery: r.try_get::<i64, _>("lan_discovery").map_err(|e| e.to_string())? != 0,
        device_name: r.try_get("device_name").map_err(|e| e.to_string())?,
        same_subnet: r.try_get::<i64, _>("same_subnet").map_err(|e| e.to_string())? != 0,
        max_conn: r.try_get("max_conn").map_err(|e| e.to_string())?,
        up_limit: r.try_get("up_limit").map_err(|e| e.to_string())?,
        up_unit: r.try_get("up_unit").map_err(|e| e.to_string())?,
        down_limit: r.try_get("down_limit").map_err(|e| e.to_string())?,
        down_unit: r.try_get("down_unit").map_err(|e| e.to_string())?,
        sha256: r.try_get::<i64, _>("sha256").map_err(|e| e.to_string())? != 0,
        cert_verify: r.try_get("cert_verify").map_err(|e| e.to_string())?,
        allow_insecure: r.try_get::<i64, _>("allow_insecure").map_err(|e| e.to_string())? != 0,
        log_desensitize: r.try_get::<i64, _>("log_desensitize").map_err(|e| e.to_string())? != 0,
        desens_level: r.try_get("desens_level").map_err(|e| e.to_string())?,
        acl: r.try_get("acl").map_err(|e| e.to_string())?,
        allowed_ips: r.try_get("allowed_ips").map_err(|e| e.to_string())?,
        concurrent: r.try_get("concurrent").map_err(|e| e.to_string())?,
        idle_timeout: r.try_get("idle_timeout").map_err(|e| e.to_string())?,
        dns: r.try_get("dns").map_err(|e| e.to_string())?,
        tcp_opt: r.try_get("tcp_opt").map_err(|e| e.to_string())?,
        udp_relay: r.try_get::<i64, _>("udp_relay").map_err(|e| e.to_string())? != 0,
        ipv6: r.try_get::<i64, _>("ipv6").map_err(|e| e.to_string())? != 0,
    })
}

/// Insert default settings key-value rows when the table is empty.
async fn seed_default_settings(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM settings")
        .fetch_one(pool)
        .await?;
    if count.0 > 0 {
        return Ok(());
    }
    let s = Settings::default();
    for (key, value) in s.to_kv_pairs() {
        sqlx::query("INSERT INTO settings (key, value) VALUES (?1, ?2)")
            .bind(&key)
            .bind(&value)
            .execute(pool)
            .await?;
    }
    Ok(())
}

/// Insert the built-in mirror list when the table is empty.
async fn seed_defaults(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM mirrors")
        .fetch_one(pool)
        .await?;
    if count.0 > 0 {
        return Ok(());
    }

    let defaults: Vec<Mirror> = vec![
        // ── PyPI ──────────────────────────────────────────────
        Mirror {
            id: "m1".into(), name: "清华大学源".into(),
            url: "https://pypi.tuna.tsinghua.edu.cn/simple".into(),
            ecosystem: "pypi".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 1, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: true, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "30秒".into(),
        },
        Mirror {
            id: "m2".into(), name: "阿里云源".into(),
            url: "https://mirrors.aliyun.com/pypi/simple".into(),
            ecosystem: "pypi".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 2, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: false, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "30秒".into(),
        },
        Mirror {
            id: "m3".into(), name: "腾讯云源".into(),
            url: "https://mirrors.cloud.tencent.com/pypi/simple".into(),
            ecosystem: "pypi".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 3, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: false, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "30秒".into(),
        },
        Mirror {
            id: "m4".into(), name: "华为云源".into(),
            url: "https://mirrors.huaweicloud.com/repository/pypi".into(),
            ecosystem: "pypi".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 4, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: false, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "30秒".into(),
        },
        Mirror {
            id: "m5".into(), name: "中科大源".into(),
            url: "https://pypi.mirrors.ustc.edu.cn/simple".into(),
            ecosystem: "pypi".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 5, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: false, fallback_enabled: false, max_failures: 5,
            health_check_enabled: true, check_interval: "1分钟".into(),
        },
        Mirror {
            id: "m6".into(), name: "豆瓣源".into(),
            url: "https://pypi.douban.com/simple".into(),
            ecosystem: "pypi".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 6, enabled: false,
            last_test: "—".into(), protocol: "HTTP".into(),
            recommended: false, fallback_enabled: false, max_failures: 2,
            health_check_enabled: false, check_interval: "5分钟".into(),
        },
        Mirror {
            id: "m7".into(), name: "PyPI 官方源".into(),
            url: "https://pypi.org/simple".into(),
            ecosystem: "pypi".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 99, enabled: false,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: false, fallback_enabled: false, max_failures: 1,
            health_check_enabled: false, check_interval: "5分钟".into(),
        },
        // ── npm ───────────────────────────────────────────────
        Mirror {
            id: "m8".into(), name: "npm 淘宝源".into(),
            url: "https://registry.npmmirror.com".into(),
            ecosystem: "npm".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 1, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: true, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "30秒".into(),
        },
        Mirror {
            id: "m9".into(), name: "腾讯云 npm".into(),
            url: "https://mirrors.cloud.tencent.com/npm/".into(),
            ecosystem: "npm".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 2, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: false, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "30秒".into(),
        },
        // ── HuggingFace ───────────────────────────────────────
        Mirror {
            id: "m10".into(), name: "HF-Mirror".into(),
            url: "https://hf-mirror.com".into(),
            ecosystem: "hf".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 1, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: true, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "1分钟".into(),
        },
        // ── Conda ─────────────────────────────────────────────
        Mirror {
            id: "m11".into(), name: "清华 Conda 源".into(),
            url: "https://mirrors.tuna.tsinghua.edu.cn/anaconda".into(),
            ecosystem: "conda".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 1, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: true, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "30秒".into(),
        },
        // ── Docker ────────────────────────────────────────────
        Mirror {
            id: "m12".into(), name: "Docker 1ms".into(),
            url: "https://docker.1ms.run".into(),
            ecosystem: "docker".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 1, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: true, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "1分钟".into(),
        },
        Mirror {
            id: "m13".into(), name: "中科大 Docker".into(),
            url: "https://docker.mirrors.ustc.edu.cn".into(),
            ecosystem: "docker".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 2, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: false, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "1分钟".into(),
        },
        // ── crates.io ─────────────────────────────────────────
        Mirror {
            id: "m14".into(), name: "清华 crates".into(),
            url: "https://mirrors.tuna.tsinghua.edu.cn/crates.io-index".into(),
            ecosystem: "crates".into(), latency: 0, healthy: false,
            health_text: "未测速".into(), priority: 1, enabled: true,
            last_test: "—".into(), protocol: "HTTPS".into(),
            recommended: true, fallback_enabled: true, max_failures: 3,
            health_check_enabled: true, check_interval: "30秒".into(),
        },
    ];

    for m in &defaults {
        insert_mirror(pool, m).await?;
    }
    Ok(())
}

/// Insert the built-in rule list when the table is empty.
/// These rules mirror the hard-coded KNOWN_HOSTS table in proxy::interceptor.
async fn seed_default_rules(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM rules")
        .fetch_one(pool)
        .await?;
    if count.0 > 0 {
        return Ok(());
    }

    let defaults: Vec<Rule> = vec![
        Rule { id: "r1".into(), name: "PyPI 加速".into(),
               pattern: "pypi.org".into(), action: "mirror".into(),
               priority: 1, enabled: true, hits: 0, action_color: "blue".into() },
        Rule { id: "r2".into(), name: "PyPI 文件加速".into(),
               pattern: "files.pythonhosted.org".into(), action: "mirror".into(),
               priority: 2, enabled: true, hits: 0, action_color: "blue".into() },
        Rule { id: "r3".into(), name: "HuggingFace 加速".into(),
               pattern: "huggingface.co".into(), action: "mirror".into(),
               priority: 3, enabled: true, hits: 0, action_color: "green".into() },
        Rule { id: "r4".into(), name: "HF CDN 加速".into(),
               pattern: "cdn-lfs.huggingface.co".into(), action: "mirror".into(),
               priority: 4, enabled: true, hits: 0, action_color: "green".into() },
        Rule { id: "r5".into(), name: "npm 加速".into(),
               pattern: "registry.npmjs.org".into(), action: "mirror".into(),
               priority: 5, enabled: true, hits: 0, action_color: "purple".into() },
        Rule { id: "r6".into(), name: "Conda 加速".into(),
               pattern: "repo.anaconda.com".into(), action: "mirror".into(),
               priority: 6, enabled: true, hits: 0, action_color: "yellow".into() },
        Rule { id: "r7".into(), name: "Conda Forge 加速".into(),
               pattern: "conda.anaconda.org".into(), action: "mirror".into(),
               priority: 7, enabled: true, hits: 0, action_color: "yellow".into() },
        Rule { id: "r8".into(), name: "Docker 加速".into(),
               pattern: "registry-1.docker.io".into(), action: "mirror".into(),
               priority: 8, enabled: true, hits: 0, action_color: "orange".into() },
    ];

    for r in &defaults {
        sqlx::query(
            "INSERT INTO rules (id, name, pattern, action, priority, enabled, hits, action_color)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
        )
        .bind(&r.id)
        .bind(&r.name)
        .bind(&r.pattern)
        .bind(&r.action)
        .bind(r.priority as i64)
        .bind(r.enabled as i64)
        .bind(r.hits as i64)
        .bind(&r.action_color)
        .execute(pool)
        .await?;
    }

    Ok(())
}

/// Map a `SqliteRow` to a `Mirror` manually (avoids derive-macro issues with
/// sqlx type mapping across workspace setups).
fn row_to_mirror(row: &SqliteRow) -> Mirror {
    Mirror {
        id: row.get("id"),
        name: row.get("name"),
        url: row.get("url"),
        ecosystem: row.get("ecosystem"),
        latency: row.get::<i64, _>("latency") as u32,
        healthy: row.get::<i64, _>("healthy") != 0,
        health_text: row.get("health_text"),
        priority: row.get::<i64, _>("priority") as u32,
        enabled: row.get::<i64, _>("enabled") != 0,
        last_test: row.get("last_test"),
        protocol: row.get("protocol"),
        recommended: row.get::<i64, _>("recommended") != 0,
        fallback_enabled: row.get::<i64, _>("fallback_enabled") != 0,
        max_failures: row.get::<i64, _>("max_failures") as u32,
        health_check_enabled: row.get::<i64, _>("health_check_enabled") != 0,
        check_interval: row.get("check_interval"),
    }
}

/// Return all mirrors ordered by priority.
pub async fn list_mirrors(pool: &SqlitePool) -> Result<Vec<Mirror>, String> {
    let rows = sqlx::query("SELECT * FROM mirrors ORDER BY priority ASC")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(rows.iter().map(row_to_mirror).collect())
}

/// Insert a new mirror and return its generated id.
pub async fn insert_mirror(pool: &SqlitePool, m: &Mirror) -> Result<String, String> {
    sqlx::query(
        "INSERT INTO mirrors (id, name, url, ecosystem, latency, healthy, health_text,
            priority, enabled, last_test, protocol, recommended,
            fallback_enabled, max_failures, health_check_enabled, check_interval)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)"
    )
    .bind(&m.id)
    .bind(&m.name)
    .bind(&m.url)
    .bind(&m.ecosystem)
    .bind(m.latency as i64)
    .bind(m.healthy as i64)
    .bind(&m.health_text)
    .bind(m.priority as i64)
    .bind(m.enabled as i64)
    .bind(&m.last_test)
    .bind(&m.protocol)
    .bind(m.recommended as i64)
    .bind(m.fallback_enabled as i64)
    .bind(m.max_failures as i64)
    .bind(m.health_check_enabled as i64)
    .bind(&m.check_interval)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(m.id.clone())
}

/// Delete a mirror by id. Returns `true` if a row was removed.
pub async fn delete_mirror(pool: &SqlitePool, id: &str) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM mirrors WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(result.rows_affected() > 0)
}

/// Update a single integer column on a mirror row.
async fn set_col(pool: &SqlitePool, id: &str, col: &str, val: i64) -> Result<(), String> {
    let sql = format!("UPDATE mirrors SET {} = ?1 WHERE id = ?2", col);
    sqlx::query(&sql)
        .bind(val)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Update a single text column on a mirror row.
async fn set_col_text(pool: &SqlitePool, id: &str, col: &str, val: &str) -> Result<(), String> {
    let sql = format!("UPDATE mirrors SET {} = ?1 WHERE id = ?2", col);
    sqlx::query(&sql)
        .bind(val)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Update mutable fields of an existing mirror.
/// `None` fields are left unchanged.
#[allow(clippy::too_many_arguments)]
pub async fn update_mirror(
    pool: &SqlitePool,
    id: &str,
    name: Option<&str>,
    url: Option<&str>,
    protocol: Option<&str>,
    priority: Option<u32>,
    enabled: Option<bool>,
    ecosystem: Option<&str>,
    fallback_enabled: Option<bool>,
    max_failures: Option<u32>,
    health_check_enabled: Option<bool>,
    check_interval: Option<&str>,
) -> Result<(), String> {
    if let Some(v) = name { set_col_text(pool, id, "name", v).await?; }
    if let Some(v) = url { set_col_text(pool, id, "url", v).await?; }
    if let Some(v) = protocol { set_col_text(pool, id, "protocol", v).await?; }
    if let Some(v) = priority { set_col(pool, id, "priority", v as i64).await?; }
    if let Some(v) = enabled { set_col(pool, id, "enabled", v as i64).await?; }
    if let Some(v) = ecosystem { set_col_text(pool, id, "ecosystem", v).await?; }
    if let Some(v) = fallback_enabled { set_col(pool, id, "fallback_enabled", v as i64).await?; }
    if let Some(v) = max_failures { set_col(pool, id, "max_failures", v as i64).await?; }
    if let Some(v) = health_check_enabled { set_col(pool, id, "health_check_enabled", v as i64).await?; }
    if let Some(v) = check_interval { set_col_text(pool, id, "check_interval", v).await?; }
    Ok(())
}

/// Mark all mirrors as tested (set `last_test` = "刚刚").
pub async fn mark_all_tested(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query("UPDATE mirrors SET last_test = '刚刚'")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Persist the result of a single health probe.
pub async fn update_health(
    pool: &SqlitePool,
    id: &str,
    latency: u32,
    healthy: bool,
    health_text: &str,
    last_test: &str,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE mirrors SET latency = ?1, healthy = ?2, health_text = ?3, last_test = ?4 \
         WHERE id = ?5",
    )
    .bind(latency as i64)
    .bind(healthy as i64)
    .bind(health_text)
    .bind(last_test)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

/* ── rules (persisted) ───────────────────────────────────────────────── */

/// List all rules ordered by priority (lowest first = highest priority).
pub async fn list_rules(pool: &SqlitePool) -> Result<Vec<Rule>, String> {
    let rows = sqlx::query(
        "SELECT id, name, pattern, action, priority, enabled, hits, action_color
         FROM rules ORDER BY priority ASC"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    rows.into_iter()
        .map(|row| {
            Ok(Rule {
                id: row.try_get("id")?,
                name: row.try_get("name")?,
                pattern: row.try_get("pattern")?,
                action: row.try_get("action")?,
                priority: {
                    let v: i32 = row.try_get("priority")?;
                    v as u32
                },
                enabled: {
                    let v: i32 = row.try_get("enabled")?;
                    v != 0
                },
                hits: {
                    let v: i32 = row.try_get("hits")?;
                    v as u64
                },
                action_color: row.try_get("action_color")?,
            })
        })
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e: sqlx::Error| e.to_string())
}

/// Insert a new rule and return its id.
pub async fn insert_rule(pool: &SqlitePool, r: &Rule) -> Result<String, String> {
    sqlx::query(
        "INSERT INTO rules (id, name, pattern, action, priority, enabled, hits, action_color)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
    )
    .bind(&r.id)
    .bind(&r.name)
    .bind(&r.pattern)
    .bind(&r.action)
    .bind(r.priority as i64)
    .bind(r.enabled as i64)
    .bind(r.hits as i64)
    .bind(&r.action_color)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(r.id.clone())
}

/// Delete a rule by id. Returns `true` if a row was removed.
pub async fn delete_rule(pool: &SqlitePool, id: &str) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM rules WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(result.rows_affected() > 0)
}

/// Update mutable fields of a rule. `None` fields are left unchanged.
#[allow(clippy::too_many_arguments)]
pub async fn update_rule_fields(
    pool: &SqlitePool,
    id: &str,
    name: Option<&str>,
    pattern: Option<&str>,
    action: Option<&str>,
    priority: Option<u32>,
    enabled: Option<bool>,
    action_color: Option<&str>,
) -> Result<(), String> {
    if let Some(v) = name {
        sqlx::query("UPDATE rules SET name = ?1 WHERE id = ?2")
            .bind(v).bind(id).execute(pool).await.map_err(|e| e.to_string())?;
    }
    if let Some(v) = pattern {
        sqlx::query("UPDATE rules SET pattern = ?1 WHERE id = ?2")
            .bind(v).bind(id).execute(pool).await.map_err(|e| e.to_string())?;
    }
    if let Some(v) = action {
        sqlx::query("UPDATE rules SET action = ?1 WHERE id = ?2")
            .bind(v).bind(id).execute(pool).await.map_err(|e| e.to_string())?;
    }
    if let Some(v) = priority {
        sqlx::query("UPDATE rules SET priority = ?1 WHERE id = ?2")
            .bind(v as i64).bind(id).execute(pool).await.map_err(|e| e.to_string())?;
    }
    if let Some(v) = enabled {
        sqlx::query("UPDATE rules SET enabled = ?1 WHERE id = ?2")
            .bind(v as i64).bind(id).execute(pool).await.map_err(|e| e.to_string())?;
    }
    if let Some(v) = action_color {
        sqlx::query("UPDATE rules SET action_color = ?1 WHERE id = ?2")
            .bind(v).bind(id).execute(pool).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Toggle the enabled flag of a rule by id.
pub async fn set_rule_enabled(pool: &SqlitePool, id: &str, enabled: bool) -> Result<(), String> {
    sqlx::query("UPDATE rules SET enabled = ?1 WHERE id = ?2")
        .bind(enabled as i64)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Reorder rules: reassign priorities to match the supplied id order.
/// Rules not in `ids` keep their existing priority but shift behind the explicit set.
pub async fn reorder_rules(pool: &SqlitePool, ids: &[String]) -> Result<(), String> {
    for (idx, id) in ids.iter().enumerate() {
        sqlx::query("UPDATE rules SET priority = ?1 WHERE id = ?2")
            .bind((idx + 1) as i64)
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Increment the hit counter for a rule.
pub async fn inc_rule_hits(pool: &SqlitePool, id: &str) -> Result<(), String> {
    sqlx::query("UPDATE rules SET hits = hits + 1 WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/* ── settings CRUD ─────────────────────────────────────────────────── */

/// Read all settings key-value rows and build a Settings struct.
/// Missing keys fall back to defaults.
pub async fn get_settings(pool: &SqlitePool) -> Result<Settings, String> {
    let rows: Vec<(String, String)> = sqlx::query_as("SELECT key, value FROM settings")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(Settings::from_kv_rows(&rows))
}

/// Persist each setting as a key-value row (INSERT OR REPLACE).
pub async fn save_settings(pool: &SqlitePool, s: &Settings) -> Result<(), String> {
    for (key, value) in s.to_kv_pairs() {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)")
            .bind(&key)
            .bind(&value)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/* ── stats CRUD ─────────────────────────────────────────────────────── */

/// Ensure the stats table has a row (idempotent).
async fn seed_default_stats(pool: &SqlitePool) -> Result<(), String> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM stats")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
    if count.0 == 0 {
        sqlx::query(
            "INSERT INTO stats (id, total_requests, total_bytes_saved, total_bytes_transferred, mirror_hits, p2p_hits)
             VALUES (1, 0, 0, 0, 0, 0)"
        )
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Read the persisted stats row. Returns defaults if no row exists.
pub async fn get_persisted_stats(pool: &SqlitePool) -> Result<PersistedStats, String> {
    let row = sqlx::query_as::<_, (i64, i64, i64, i64, i64)>(
        "SELECT total_requests, total_bytes_saved, total_bytes_transferred, mirror_hits, p2p_hits FROM stats WHERE id = 1"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    match row {
        Some((r, bs, bt, mh, ph)) => Ok(PersistedStats {
            total_requests: r as u64,
            total_bytes_saved: bs as u64,
            total_bytes_transferred: bt as u64,
            mirror_hits: mh as u64,
            p2p_hits: ph as u64,
        }),
        None => Ok(PersistedStats::default()),
    }
}

/// Persist the cumulative stats fields to the stats row.
pub async fn save_persisted_stats(pool: &SqlitePool, s: &PersistedStats) -> Result<(), String> {
    sqlx::query(
        "INSERT OR REPLACE INTO stats (id, total_requests, total_bytes_saved, total_bytes_transferred, mirror_hits, p2p_hits)
         VALUES (1, ?1, ?2, ?3, ?4, ?5)"
    )
    .bind(s.total_requests as i64)
    .bind(s.total_bytes_saved as i64)
    .bind(s.total_bytes_transferred as i64)
    .bind(s.mirror_hits as i64)
    .bind(s.p2p_hits as i64)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Reset settings to defaults (delete all rows and re-insert defaults).
pub async fn reset_settings(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query("DELETE FROM settings")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    let s = Settings::default();
    save_settings(pool, &s).await
}

/* ── traffic logs CRUD ──────────────────────────────────────────────────── */

/// Insert a single traffic log entry. Returns the auto-incremented id.
pub async fn insert_traffic_log(
    pool: &SqlitePool,
    time: &str,
    tool: &str,
    host: &str,
    path: &str,
    mode: &str,
    source: &str,
    size: &str,
    latency: u32,
    status: u32,
) -> Result<i64, String> {
    let row = sqlx::query(
        "INSERT INTO traffic_logs (time, tool, host, path, mode, source, size, latency, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
    )
    .bind(time)
    .bind(tool)
    .bind(host)
    .bind(path)
    .bind(mode)
    .bind(source)
    .bind(size)
    .bind(latency as i64)
    .bind(status as i64)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row.last_insert_rowid())
}

/// Query traffic logs with optional time-range filter and pagination.
/// `before_hours`: 0 = all, otherwise only entries within N hours.
/// Returns rows as tuples: (id, time, tool, host, path, mode, source, size, latency, status).
pub async fn list_traffic_logs(
    pool: &SqlitePool,
    before_hours: u32,
    limit: u32,
    offset: u32,
) -> Result<Vec<(i64, String, String, String, String, String, String, String, i64, i64)>, String> {
    let rows: Vec<(i64, String, String, String, String, String, String, String, i64, i64)> = if before_hours > 0 {
        sqlx::query_as(
            "SELECT id, time, tool, host, path, mode, source, size, latency, status
             FROM traffic_logs
             WHERE created_at >= datetime('now', 'localtime', ?1)
             ORDER BY id DESC LIMIT ?2 OFFSET ?3"
        )
        .bind(format!("-{} hours", before_hours))
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?
    } else {
        sqlx::query_as(
            "SELECT id, time, tool, host, path, mode, source, size, latency, status
             FROM traffic_logs ORDER BY id DESC LIMIT ?1 OFFSET ?2"
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?
    };
    Ok(rows)
}

/// Delete traffic log entries older than `retention_hours`.
/// Called periodically (e.g. once per hour) to keep the table size bounded.
pub async fn cleanup_traffic_logs(pool: &SqlitePool, retention_hours: u32) -> Result<u64, String> {
    let result = sqlx::query(
        "DELETE FROM traffic_logs WHERE created_at < datetime('now', 'localtime', ?1)"
    )
    .bind(format!("-{} hours", retention_hours))
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(result.rows_affected())
}

#[cfg(test)]
mod rule_tests {
    use super::*;
    use sqlx::sqlite::SqliteConnectOptions;

    async fn temp_pool() -> SqlitePool {
        use sqlx::sqlite::SqlitePoolOptions;
        let options = SqliteConnectOptions::new()
            .filename(":memory:")
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                pattern TEXT NOT NULL,
                action TEXT NOT NULL DEFAULT 'mirror',
                priority INTEGER NOT NULL DEFAULT 100,
                enabled INTEGER NOT NULL DEFAULT 1,
                hits INTEGER NOT NULL DEFAULT 0,
                action_color TEXT NOT NULL DEFAULT 'blue'
            )"
        ).execute(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn test_insert_and_list_rules() {
        let pool = temp_pool().await;
        let r = Rule {
            id: "t1".into(), name: "Test".into(), pattern: "test.com".into(),
            action: "mirror".into(), priority: 10, enabled: true,
            hits: 0, action_color: "blue".into(),
        };
        let id = insert_rule(&pool, &r).await.unwrap();
        assert_eq!(id, "t1");

        let list = list_rules(&pool).await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].pattern, "test.com");
    }
}