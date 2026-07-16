pub mod scan;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(scan::ScanState::default())
        .invoke_handler(tauri::generate_handler![
            scan::scan_path,
            scan::list_volumes,
            scan::cancel_scan
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
