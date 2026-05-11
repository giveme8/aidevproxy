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

    // Seed default mirrors on first run (empty table).
    seed_defaults(&pool).await?;

    Ok(pool)
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
