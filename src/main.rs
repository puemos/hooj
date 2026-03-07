#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use hooj::state::AppState;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // Focus the existing window when a second instance is launched
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            app.manage(AppState::new());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hooj::commands::project::import_video,
            hooj::commands::project::get_project,
            hooj::commands::segments::split_at,
            hooj::commands::segments::delete_segment,
            hooj::commands::segments::duplicate_segment,
            hooj::commands::segments::set_segment_speed,
            hooj::commands::segments::set_segment_volume,
            hooj::commands::segments::reorder_segments,
            hooj::commands::segments::update_segment_bounds,
            hooj::commands::segments::undo,
            hooj::commands::segments::redo,
            hooj::commands::export::export_video,
            hooj::commands::thumbnails::generate_thumbnails,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
