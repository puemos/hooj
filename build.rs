fn main() {
    // Ensure frontend/dist exists for tauri::generate_context!() at compile time.
    // During `tauri dev`, the beforeDevCommand builds it properly.
    let dist = std::path::Path::new("frontend/dist");
    if !dist.exists() {
        std::fs::create_dir_all(dist).unwrap();
        std::fs::write(
            dist.join("index.html"),
            "<!DOCTYPE html><html><head></head><body></body></html>",
        )
        .unwrap();
    }
    tauri_build::build();
}
