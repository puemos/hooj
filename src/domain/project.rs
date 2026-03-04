use serde::{Deserialize, Serialize};

use super::segment::Segment;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub source_path: String,
    pub video_info: VideoInfo,
    pub segments: Vec<Segment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    pub duration_secs: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub codec: String,
    pub file_size_bytes: u64,
}
