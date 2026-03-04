use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum HoojError {
    #[error("No project loaded")]
    NoProject,

    #[error("FFmpeg error: {0}")]
    FFmpeg(String),

    #[error("FFprobe error: {0}")]
    FFprobe(String),

    #[error("Invalid segment: {0}")]
    InvalidSegment(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),
}

impl Serialize for HoojError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
