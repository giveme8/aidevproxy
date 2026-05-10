//! Integration tests for AIDevProxy backend.
//!
//! Tests state management and command behavior.

use aidev_proxy_lib::{APP_STATE, AppState, ProxyStats};
use aidev_proxy_lib::commands::{ProxyConfig};

#[test]
fn test_app_state_initial_values() {
    let state = AppState::new();
    use std::sync::atomic::Ordering;
    assert!(!state.proxy_running.load(Ordering::SeqCst));
    assert!(!state.p2p_running.load(Ordering::SeqCst));
    assert_eq!(*state.proxy_port.read(), 8899);
    let stats = state.stats.read();
    assert_eq!(stats.total_requests, 0);
    assert_eq!(stats.total_bytes_saved, 0);
    assert_eq!(stats.total_bytes_transferred, 0);
    assert_eq!(stats.total_bytes_transferred, 0);
    assert_eq!(stats.mirror_hits, 0);
    assert_eq!(stats.p2p_hits, 0);
    assert_eq!(stats.active_peers, 0);
    assert_eq!(stats.cache_size_bytes, 0);
    assert_eq!(stats.uptime_seconds, 0);
}

#[test]
fn test_global_app_state_initial() {
    use std::sync::atomic::Ordering;
    assert!(!APP_STATE.proxy_running.load(Ordering::SeqCst));
    assert!(!APP_STATE.p2p_running.load(Ordering::SeqCst));
    assert_eq!(*APP_STATE.proxy_port.read(), 8899);
}

#[test]
fn test_proxy_config_default() {
    let config = ProxyConfig::default();
    assert_eq!(config.port, 8899);
    assert!(config.enable_mirror);
    assert!(config.enable_p2p);
    assert!(config.enable_cache);
    assert!(!config.auto_start);
}

#[test]
fn test_proxy_stats_default() {
    let stats = ProxyStats::default();
    assert_eq!(stats.total_requests, 0);
    assert_eq!(stats.total_bytes_saved, 0);
}

#[test]
fn test_proxy_stats_serde() {
    let stats = ProxyStats {
        total_requests: 42,
        total_bytes_saved: 1024,
        total_bytes_transferred: 4096,
        mirror_hits: 10,
        p2p_hits: 5,
        active_peers: 3,
        cache_size_bytes: 2048,
        uptime_seconds: 3600,
    };

    let json = serde_json::to_value(&stats).unwrap();
    assert_eq!(json["total_requests"], 42);
    assert_eq!(json["total_bytes_saved"], 1024);
    assert_eq!(json["mirror_hits"], 10);

    // Round-trip
    let parsed: ProxyStats = serde_json::from_value(json).unwrap();
    assert_eq!(parsed.total_requests, stats.total_requests);
    assert_eq!(parsed.total_bytes_saved, stats.total_bytes_saved);
}

#[test]
fn test_proxy_config_serde() {
    let config = ProxyConfig {
        port: 3128,
        enable_mirror: false,
        enable_p2p: true,
        enable_cache: false,
        auto_start: true,
    };

    let json = serde_json::to_value(&config).unwrap();
    assert_eq!(json["port"], 3128);
    assert_eq!(json["enable_mirror"], false);
    assert_eq!(json["auto_start"], true);

    let parsed: ProxyConfig = serde_json::from_value(json).unwrap();
    assert_eq!(parsed.port, config.port);
    assert_eq!(parsed.enable_mirror, config.enable_mirror);
}
