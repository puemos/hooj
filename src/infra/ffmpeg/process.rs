use tokio::process::Command;

use crate::domain::error::HoojError;

/// Run ffprobe and return stdout as a string.
pub async fn run_ffprobe(args: Vec<String>) -> Result<String, HoojError> {
    let output = Command::new("ffprobe")
        .args(&args)
        .output()
        .await
        .map_err(|e| HoojError::FFprobe(e.to_string()))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(HoojError::FFprobe(format!(
            "ffprobe exited with status {}: {}",
            output.status.code().unwrap_or(-1),
            stderr
        )));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Run ffmpeg and return stderr (ffmpeg logs to stderr).
pub async fn run_ffmpeg(args: Vec<String>) -> Result<String, HoojError> {
    let output = Command::new("ffmpeg")
        .args(&args)
        .output()
        .await
        .map_err(|e| HoojError::FFmpeg(e.to_string()))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(HoojError::FFmpeg(format!(
            "ffmpeg exited with status {}: {}",
            output.status.code().unwrap_or(-1),
            stderr
        )));
    }

    Ok(String::from_utf8_lossy(&output.stderr).to_string())
}

/// Run ffmpeg with line-by-line stderr callback for progress parsing.
pub async fn run_ffmpeg_with_progress<F>(
    args: Vec<String>,
    on_stderr_line: F,
) -> Result<(), HoojError>
where
    F: Fn(&str) + Send + 'static,
{
    use tokio::io::{AsyncBufReadExt, BufReader};

    let mut child = Command::new("ffmpeg")
        .args(&args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| HoojError::FFmpeg(e.to_string()))?;

    let stderr = child.stderr.take().unwrap();
    let reader = BufReader::new(stderr);
    let mut lines = reader.lines();

    while let Some(line) = lines.next_line().await.map_err(|e| HoojError::FFmpeg(e.to_string()))? {
        on_stderr_line(&line);
    }

    let status = child.wait().await.map_err(|e| HoojError::FFmpeg(e.to_string()))?;
    if !status.success() {
        return Err(HoojError::FFmpeg(format!(
            "ffmpeg exited with code {:?}",
            status.code()
        )));
    }

    Ok(())
}
