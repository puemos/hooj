use tauri::State;

use crate::domain::error::HoojError;
use crate::infra::ffmpeg::{commands as ffcmd, process};
use crate::state::AppState;

#[tauri::command]
pub async fn generate_thumbnails(state: State<'_, AppState>) -> Result<Vec<String>, HoojError> {
    let (source_path, duration) = {
        let proj_lock = state.project.lock().unwrap();
        let project = proj_lock.as_ref().ok_or(HoojError::NoProject)?;
        (
            project.source_path.clone(),
            project.video_info.duration_secs,
        )
    };

    let thumb_dir = format!("{}/thumbnails", state.temp_dir);
    let _ = std::fs::remove_dir_all(&thumb_dir);
    std::fs::create_dir_all(&thumb_dir)?;

    // Generate ~1 thumbnail per 2 seconds, max 50
    let interval = (duration / 50.0).max(2.0);
    let output_pattern = format!("{}/thumb_%03d.jpg", thumb_dir);

    let args = ffcmd::thumbnail_args(&source_path, &output_pattern, interval);
    process::run_ffmpeg(args).await?;

    // Collect generated thumbnail paths
    let mut paths: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&thumb_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("jpg") {
                paths.push(path.to_string_lossy().to_string());
            }
        }
    }
    paths.sort();

    Ok(paths)
}
