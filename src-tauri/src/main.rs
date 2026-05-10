// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use aidev_proxy_lib::{commands, APP_STATE};

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
