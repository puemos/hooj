use tauri::State;

use crate::domain::error::HoojError;
use crate::domain::project::{Project, VideoInfo};
use crate::domain::segment::Segment;
use crate::infra::ffmpeg::{commands as ffcmd, process};
use crate::state::AppState;

#[tauri::command]
pub async fn import_video(path: String, state: State<'_, AppState>) -> Result<Project, HoojError> {
    let args = ffcmd::probe_args(&path);
    let output = process::run_ffprobe(args).await?;

    let probe: serde_json::Value =
        serde_json::from_str(&output).map_err(|e| HoojError::FFprobe(e.to_string()))?;

    let video_stream = probe["streams"]
        .as_array()
        .and_then(|streams| {
            streams
                .iter()
                .find(|s| s["codec_type"].as_str() == Some("video"))
        })
        .ok_or_else(|| HoojError::FFprobe("No video stream found".into()))?;

    let format = &probe["format"];

    let duration_secs = format["duration"]
        .as_str()
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    let width = video_stream["width"].as_u64().unwrap_or(0) as u32;
    let height = video_stream["height"].as_u64().unwrap_or(0) as u32;

    let fps = parse_fps(video_stream["r_frame_rate"].as_str().unwrap_or("30/1"));

    let codec = video_stream["codec_name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    let file_size_bytes = format["size"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);

    let video_info = VideoInfo {
        duration_secs,
        width,
        height,
        fps,
        codec,
        file_size_bytes,
    };

    let segment = Segment::new(0.0, duration_secs);

    let project = Project {
        source_path: path,
        video_info,
        segments: vec![segment],
    };

    // Reset state
    let mut proj_lock = state.project.lock().unwrap();
    *proj_lock = Some(project.clone());
    state.history.lock().unwrap().clear();

    Ok(project)
}

#[tauri::command]
pub fn get_project(state: State<'_, AppState>) -> Result<Option<Project>, HoojError> {
    let proj = state.project.lock().unwrap();
    Ok(proj.clone())
}

fn parse_fps(rate_str: &str) -> f64 {
    if let Some((num, den)) = rate_str.split_once('/') {
        let n: f64 = num.parse().unwrap_or(30.0);
        let d: f64 = den.parse().unwrap_or(1.0);
        if d == 0.0 { 30.0 } else { n / d }
    } else {
        rate_str.parse().unwrap_or(30.0)
    }
}
