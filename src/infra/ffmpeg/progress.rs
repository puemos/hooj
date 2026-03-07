/// Parse FFmpeg stderr output for progress information.
/// FFmpeg outputs lines like: `out_time_ms=12345678` or `progress=continue`
/// When using `-progress pipe:2`, FFmpeg outputs key=value pairs.
///
/// Returns the progress as a fraction (0.0 to 1.0) given total duration in microseconds.
pub fn parse_progress_line(line: &str, total_duration_us: f64) -> Option<f64> {
    let line = line.trim();

    if let Some(time_str) = line.strip_prefix("out_time_ms=")
        && let Ok(time_us) = time_str.trim().parse::<f64>()
        && total_duration_us > 0.0
    {
        return Some((time_us / total_duration_us).min(1.0));
    }

    if let Some(time_str) = line.strip_prefix("out_time=")
        && let Some(secs) = parse_time_to_secs(time_str.trim())
    {
        let total_secs = total_duration_us / 1_000_000.0;
        if total_secs > 0.0 {
            return Some((secs / total_secs).min(1.0));
        }
    }

    None
}

/// Parse HH:MM:SS.microseconds format to seconds.
fn parse_time_to_secs(time: &str) -> Option<f64> {
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() != 3 {
        return None;
    }
    let hours: f64 = parts[0].parse().ok()?;
    let minutes: f64 = parts[1].parse().ok()?;
    let seconds: f64 = parts[2].parse().ok()?;
    Some(hours * 3600.0 + minutes * 60.0 + seconds)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_time_to_secs() {
        assert_eq!(parse_time_to_secs("00:00:10.000000"), Some(10.0));
        assert_eq!(parse_time_to_secs("01:30:00.000000"), Some(5400.0));
        assert_eq!(parse_time_to_secs("00:01:30.500000"), Some(90.5));
    }

    #[test]
    fn test_parse_time_invalid() {
        assert_eq!(parse_time_to_secs("invalid"), None);
        assert_eq!(parse_time_to_secs("00:00"), None);
    }

    #[test]
    fn test_parse_progress_line_out_time() {
        let total = 60.0 * 1_000_000.0; // 60 seconds in microseconds
        let result = parse_progress_line("out_time=00:00:30.000000", total);
        assert!((result.unwrap() - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_parse_progress_line_out_time_ms() {
        let total = 60.0 * 1_000_000.0;
        let result = parse_progress_line("out_time_ms=30000000", total);
        assert!((result.unwrap() - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_parse_progress_line_unrelated() {
        let result = parse_progress_line("frame=100", 60_000_000.0);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_progress_clamps_to_one() {
        let total = 10.0 * 1_000_000.0;
        let result = parse_progress_line("out_time=00:00:20.000000", total);
        assert_eq!(result, Some(1.0));
    }
}
