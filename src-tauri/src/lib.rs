// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Runtime, Window};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn minimize_window<R: Runtime>(window: Window<R>) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn maximize_window<R: Runtime>(window: Window<R>) -> Result<(), String> {
    window.maximize().map_err(|e| e.to_string())
}

#[tauri::command]
fn unmaximize_window<R: Runtime>(window: Window<R>) -> Result<(), String> {
    window.unmaximize().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_maximize<R: Runtime>(window: Window<R>) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn close_window<R: Runtime>(window: Window<R>) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            minimize_window,
            maximize_window,
            unmaximize_window,
            toggle_maximize,
            close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
