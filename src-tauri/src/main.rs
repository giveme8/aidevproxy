// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use aidev_proxy_lib::{commands, commands_extra as cx, db, health_check, http_server, traffic, APP_STATE};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:mirrors.db",
                    vec![Migration {
                        version: 1,
                        description: "create mirrors table",
                        sql: "CREATE TABLE IF NOT EXISTS mirrors (
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
                        )",
                        kind: MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .setup(|app| {
            let app_data_dir = if cfg!(debug_assertions) {
                std::env::current_dir()
                    .unwrap_or_else(|_| std::path::PathBuf::from("."))
                    .join(".aidevproxy-data")
            } else {
                app.path().app_local_data_dir()
                    .expect("failed to resolve app local data directory")
            };
            let pool = tauri::async_runtime::block_on(db::init_pool(&app_data_dir))
                .expect("Failed to initialize SQLite database");

            // Load persisted stats into the in-memory APP_STATE.
            match tauri::async_runtime::block_on(db::get_persisted_stats(&pool)) {
                Ok(ps) => {
                    APP_STATE.stats.write().load_persisted(&ps);
                }
                Err(e) => {
                    log::warn!("Failed to load persisted stats: {}", e);
                }
            }

            health_check::spawn_scheduler(pool.clone());

            // Initialize traffic recorder (buffered SQLite writes + cleanup).
            traffic::set_pool(pool.clone());
            traffic::start_background_tasks();

            // Start the HTTP API server for browser dev mode.
            // Port can be overridden via HTTP_API_PORT env var (default 3001).
            let http_port: u16 = std::env::var("HTTP_API_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3001);
            http_server::set_db_pool(pool.clone());
            tauri::async_runtime::spawn(async move {
                if let Err(e) = http_server::start(http_port).await {
                    log::error!("HTTP API server failed: {}", e);
                }
            });

            app.manage(pool);
            Ok(())
        })
        .manage(APP_STATE.clone())
        .invoke_handler(tauri::generate_handler![
            commands::start_proxy,
            commands::stop_proxy,
            commands::get_proxy_status,
            commands::get_stats,
            commands::start_p2p,
            commands::stop_p2p,
            commands::get_p2p_status,
            commands::update_config,
            commands::get_config,
            // Dashboard / traffic
            cx::get_recent_requests,
            cx::get_peers,
            cx::get_mirror_latency,
            cx::get_traffic_logs,
            cx::run_speed_test,
            cx::export_logs,
            // Cache
            cx::get_cache_entries,
            cx::get_cache_config,
            cx::update_cache_config,
            cx::clear_cache,
            cx::reindex_cache,
            cx::open_cache_dir,
            // Nodes
            cx::get_nodes,
            cx::scan_nodes,
            cx::add_trusted_node,
            cx::remove_node,
            // Mirrors
            cx::get_mirrors,
            cx::add_mirror,
            cx::remove_mirror,
            cx::update_mirror,
            cx::test_mirror_speed,
            cx::probe_mirrors,
            // Rules
            cx::get_rules,
            cx::add_rule,
            cx::update_rule,
            cx::remove_rule,
            cx::toggle_rule,
            cx::reorder_rules,
            // Settings
            cx::get_settings,
            cx::save_settings,
            cx::reset_settings,
            cx::flush_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
