//! Traffic log recording and persistence.
//!
//! The proxy server calls `record()` for every proxied request. Entries are
//! buffered and flushed to SQLite in batches for performance. A background
//! cleanup task prunes entries older than the retention window.

use crate::db;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use sqlx::SqlitePool;
use tokio::sync::mpsc;

/// Maximum number of entries to buffer before forcing a flush.
const FLUSH_BATCH: usize = 200;

/// Flush interval (seconds) — flush even if batch isn't full.
const FLUSH_INTERVAL_SECS: u64 = 5;

/// Default retention window (hours). Entries older than this are pruned.
const RETENTION_HOURS: u32 = 168; // 7 days

/// Cleanup interval (seconds).
const CLEANUP_INTERVAL_SECS: u64 = 3600; // 1 hour

/* ── Traffic entry (matches TrafficLogEntry in commands_extra) ──────────── */

#[derive(Debug, Clone)]
pub struct TrafficEntry {
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

/* ── Global pool ────────────────────────────────────────────────────────── */

static DB_POOL: Lazy<Mutex<Option<SqlitePool>>> = Lazy::new(|| Mutex::new(None));

/// Inject the SQLite pool. Called once from main.rs before the proxy starts.
pub fn set_pool(pool: SqlitePool) {
    *DB_POOL.lock() = Some(pool);
}

fn get_pool() -> Result<SqlitePool, String> {
    DB_POOL
        .lock()
        .clone()
        .ok_or_else(|| "traffic DB pool not initialised".to_string())
}

/* ── Recording channel ──────────────────────────────────────────────────── */

/// Channel sender — proxy calls `record()` which sends here.
static SENDER: Lazy<Mutex<Option<mpsc::UnboundedSender<TrafficEntry>>>> =
    Lazy::new(|| Mutex::new(None));

/// Push an entry into the recording buffer. Non-blocking — if the channel is
/// full (unbounded, so it won't be), the entry is dropped silently.
pub fn record(entry: TrafficEntry) {
    if let Some(tx) = SENDER.lock().as_ref() {
        let _ = tx.send(entry);
    }
}

/* ── Background flush + cleanup task ────────────────────────────────────── */

/// Spawn the background flush and cleanup tasks.
/// Must be called after `set_pool()` and before the proxy starts accepting
/// traffic. Returns immediately; the tasks run on the Tokio runtime.
pub fn start_background_tasks() {
    let pool = match get_pool() {
        Ok(p) => p,
        Err(e) => {
            log::error!("traffic::start_background_tasks: {}", e);
            return;
        }
    };

    let (tx, mut rx) = mpsc::unbounded_channel::<TrafficEntry>();
    *SENDER.lock() = Some(tx);

    // Flush task
    let flush_pool = pool.clone();
    tauri::async_runtime::spawn(async move {
        let mut buf: Vec<TrafficEntry> = Vec::with_capacity(FLUSH_BATCH);

        loop {
            // Wait for the first entry or the interval timer.
            let deadline = tokio::time::Instant::now()
                + std::time::Duration::from_secs(FLUSH_INTERVAL_SECS);

            let timed_out = loop {
                tokio::select! {
                    entry = rx.recv() => {
                        match entry {
                            Some(e) => {
                                buf.push(e);
                                if buf.len() >= FLUSH_BATCH {
                                    break true; // batch full, flush now
                                }
                            }
                            None => {
                                // Channel closed — flush remaining and exit.
                                if !buf.is_empty() {
                                    flush_batch(&flush_pool, &buf).await;
                                }
                                return;
                            }
                        }
                    }
                    _ = tokio::time::sleep_until(deadline) => {
                        break true; // interval elapsed
                    }
                }
            };

            if timed_out && !buf.is_empty() {
                flush_batch(&flush_pool, &buf).await;
                buf.clear();
            }
        }
    });

    // Cleanup task
    let cleanup_pool = pool.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(CLEANUP_INTERVAL_SECS)).await;
            match db::cleanup_traffic_logs(&cleanup_pool, RETENTION_HOURS).await {
                Ok(deleted) => {
                    if deleted > 0 {
                        log::info!("traffic cleanup: removed {} old entries", deleted);
                    }
                }
                Err(e) => {
                    log::error!("traffic cleanup error: {}", e);
                }
            }
        }
    });
}

async fn flush_batch(pool: &SqlitePool, entries: &[TrafficEntry]) {
    for entry in entries {
        if let Err(e) = db::insert_traffic_log(
            pool,
            &entry.time,
            &entry.tool,
            &entry.host,
            &entry.path,
            &entry.mode,
            &entry.source,
            &entry.size,
            entry.latency,
            entry.status,
        )
        .await
        {
            log::error!("traffic flush error: {}", e);
            // Continue with remaining entries — don't lose the whole batch.
        }
    }
}

/* ── Query helpers (used by commands) ───────────────────────────────────── */

/// Query traffic logs from the database, returning results as
/// `commands_extra::TrafficLogEntry` compatible values.
pub async fn get_logs(
    before_hours: u32,
    limit: u32,
    offset: u32,
) -> Result<Vec<crate::commands_extra::TrafficLogEntry>, String> {
    let pool = get_pool()?;
    let rows = db::list_traffic_logs(&pool, before_hours, limit, offset).await?;

    Ok(rows
        .into_iter()
        .map(|(id, time, tool, host, path, mode, source, size, latency, status)| {
            crate::commands_extra::TrafficLogEntry {
                id: id as u64,
                time,
                tool,
                host,
                path,
                mode,
                source,
                size,
                latency: latency as u32,
                status: status as u32,
            }
        })
        .collect())
}
