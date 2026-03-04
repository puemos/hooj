use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportSettings {
    pub format: ExportFormat,
    pub quality: ExportQuality,
    pub output_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    Mp4H264,
    WebmVp9,
    MovProres,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportQuality {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ExportEvent {
    Progress {
        percent: f64,
        current_segment: usize,
        total_segments: usize,
    },
    SegmentDone {
        index: usize,
    },
    Concatenating,
    Done,
    Error {
        message: String,
    },
}
