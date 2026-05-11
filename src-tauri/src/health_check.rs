//! Background mirror health-check scheduler.
//!
//! For each mirror with `enabled = true` and `health_check_enabled = true`,
//! probes the URL on its configured `check_interval` and writes
//! `latency / healthy / health_text / last_test` back to the DB.
//!
//! The frontend reads the same row via `get_mirrors` / `get_mirror_latency`,
//! so updates surface automatically on the next UI poll.

use crate::db;
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::Instant;

const PROBE_TIMEOUT: Duration = Duration::from_secs(3);
const TICK: Duration = Duration::from_secs(5);

/// Parse the Chinese interval label stored in `mirrors.check_interval`.
/// Falls back to 60s when the value is unrecognised.
fn parse_interval(s: &str) -> Duration {
    match s.trim() {
        "30秒" => Duration::from_secs(30),
        "1分钟" => Duration::from_secs(60),
        "5分钟" => Duration::from_secs(300),
        _ => Duration::from_secs(60),
    }
}

/// Probe a single mirror URL and return (latency_ms, healthy, health_text).
pub async fn probe(url: &str) -> (u32, bool, &'static str) {
    let client = match reqwest::Client::builder()
        .timeout(PROBE_TIMEOUT)
        .build()
    {
        Ok(c) => c,
        Err(_) => return (0, false, "不可用"),
    };

    let start = Instant::now();
    match client.get(url).send().await {
        Ok(resp) => {
            let status = resp.status();
            let ms = start.elapsed().as_millis().min(60_000) as u32;
            if status.is_success() || status.is_redirection() {
                (ms, true, "正常")
            } else {
                (ms, false, "异常")
            }
        }
        Err(e) if e.is_timeout() => (0, false, "超时"),
        Err(_) => (0, false, "不可用"),
    }
}

pub fn now_hhmmss() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let h = (secs / 3600) % 24;
    let m = (secs / 60) % 60;
    let s = secs % 60;
    format!("{:02}:{:02}:{:02}", h, m, s)
}

/// Spawn the background scheduler. Returns immediately.
pub fn spawn_scheduler(pool: SqlitePool) {
    let last_probe: Arc<Mutex<HashMap<String, Instant>>> = Arc::new(Mutex::new(HashMap::new()));

    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(TICK);
        // Skip the immediate first tick — first probes fire after one TICK so
        // app startup isn't slowed by N parallel HTTP requests.
        ticker.tick().await;
        loop {
            ticker.tick().await;

            let mirrors = match db::list_mirrors(&pool).await {
                Ok(v) => v,
                Err(e) => {
                    log::warn!("health_check: list_mirrors failed: {}", e);
                    continue;
                }
            };

            for m in mirrors {
                if !m.enabled || !m.health_check_enabled {
                    continue;
                }
                let interval = parse_interval(&m.check_interval);
                let due = {
                    let map = last_probe.lock().await;
                    match map.get(&m.id) {
                        Some(t) => t.elapsed() >= interval,
                        None => true,
                    }
                };
                if !due {
                    continue;
                }

                last_probe.lock().await.insert(m.id.clone(), Instant::now());

                let pool = pool.clone();
                let id = m.id.clone();
                let url = m.url.clone();
                tauri::async_runtime::spawn(async move {
                    let (latency, healthy, health_text) = probe(&url).await;
                    if let Err(e) = db::update_health(
                        &pool,
                        &id,
                        latency,
                        healthy,
                        health_text,
                        &now_hhmmss(),
                    )
                    .await
                    {
                        log::warn!("health_check: update {} failed: {}", id, e);
                    }
                });
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_interval_known_values() {
        assert_eq!(parse_interval("30秒"), Duration::from_secs(30));
        assert_eq!(parse_interval("1分钟"), Duration::from_secs(60));
        assert_eq!(parse_interval("5分钟"), Duration::from_secs(300));
        assert_eq!(parse_interval("garbage"), Duration::from_secs(60));
    }
}
