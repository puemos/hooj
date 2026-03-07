use crate::domain::export::{ExportFormat, ExportQuality};

/// Build ffprobe args to probe a video file.
pub fn probe_args(input: &str) -> Vec<String> {
    vec![
        "-v".into(),
        "quiet".into(),
        "-print_format".into(),
        "json".into(),
        "-show_format".into(),
        "-show_streams".into(),
        input.into(),
    ]
}

/// Build ffmpeg args to extract a segment from a video.
/// If speed == 1.0 and volume == 1.0, uses stream copy (no re-encoding).
/// `source_fps` is used to cap the output frame rate at high speeds.
pub fn extract_segment_args(
    input: &str,
    start: f64,
    end: f64,
    speed: f64,
    volume: f64,
    source_fps: f64,
    output: &str,
) -> Vec<String> {
    let needs_reencode = (speed - 1.0).abs() > f64::EPSILON || (volume - 1.0).abs() > f64::EPSILON;

    if !needs_reencode {
        return vec![
            "-y".into(),
            "-ss".into(),
            format!("{:.6}", start),
            "-to".into(),
            format!("{:.6}", end),
            "-i".into(),
            input.into(),
            "-c".into(),
            "copy".into(),
            "-avoid_negative_ts".into(),
            "make_zero".into(),
            output.into(),
        ];
    }

    let mut args = vec![
        "-y".into(),
        "-ss".into(),
        format!("{:.6}", start),
        "-to".into(),
        format!("{:.6}", end),
        "-i".into(),
        input.into(),
    ];

    // Video filter: reset PTS after input seeking, then adjust for speed.
    // At high speeds (>4x) the PTS compression creates an absurdly high effective
    // frame rate (e.g. 32x on 30fps → ~960fps) which corrupts the output.
    // Appending fps=<source_fps> drops excess frames and keeps timing sane.
    let setpts = format!("setpts=(PTS-STARTPTS)*{}", 1.0 / speed);
    let video_filter = if speed > 4.0 {
        format!("{},fps={:.4}", setpts, source_fps)
    } else {
        setpts
    };
    args.extend(["-vf".into(), video_filter]);

    // Audio filter: atempo for speed + volume, then reset PTS to match video
    let audio_filter = format!("{},asetpts=PTS-STARTPTS", build_audio_filter(speed, volume));
    args.extend(["-af".into(), audio_filter]);

    // Lossless fast intermediate — these get re-encoded in the concat step anyway
    args.extend([
        "-c:v".into(),
        "libx264".into(),
        "-preset".into(),
        "ultrafast".into(),
        "-crf".into(),
        "0".into(),
        "-c:a".into(),
        "flac".into(),
    ]);

    args.push(output.into());
    args
}

/// Prepend `-threads N` to an ffmpeg args vector.
/// Used to limit per-process CPU usage during parallel extraction.
pub fn with_thread_limit(args: Vec<String>, threads: usize) -> Vec<String> {
    let mut limited = Vec::with_capacity(args.len() + 2);
    limited.push("-threads".into());
    limited.push(threads.to_string());
    limited.extend(args);
    limited
}

/// Build audio filter string for atempo and volume.
/// atempo only supports 0.5–100.0 range, so chain multiple for extreme values.
fn build_audio_filter(speed: f64, volume: f64) -> String {
    let mut filters: Vec<String> = Vec::new();

    // Chain atempo filters for speed
    let mut remaining_speed = speed;
    while remaining_speed > 100.0 {
        filters.push("atempo=100.0".into());
        remaining_speed /= 100.0;
    }
    while remaining_speed < 0.5 {
        filters.push("atempo=0.5".into());
        remaining_speed /= 0.5;
    }
    if (remaining_speed - 1.0).abs() > f64::EPSILON {
        filters.push(format!("atempo={:.4}", remaining_speed));
    }

    // Volume filter
    if (volume - 1.0).abs() > f64::EPSILON {
        filters.push(format!("volume={:.4}", volume));
    }

    if filters.is_empty() {
        "anull".into()
    } else {
        filters.join(",")
    }
}

/// Build ffmpeg args to concatenate segments using a filelist.
pub fn concat_args(filelist_path: &str, output: &str, format: &ExportFormat, quality: &ExportQuality) -> Vec<String> {
    let mut args = vec![
        "-y".into(),
        "-f".into(),
        "concat".into(),
        "-safe".into(),
        "0".into(),
        "-i".into(),
        filelist_path.into(),
    ];

    match format {
        ExportFormat::Mp4H264 => {
            let (crf, preset, audio_bitrate) = match quality {
                ExportQuality::Low => ("28", "faster", "128k"),
                ExportQuality::Medium => ("23", "medium", "192k"),
                ExportQuality::High => ("18", "slow", "320k"),
            };
            args.extend([
                "-c:v".into(),
                "libx264".into(),
                "-crf".into(),
                crf.into(),
                "-preset".into(),
                preset.into(),
                "-c:a".into(),
                "aac".into(),
                "-b:a".into(),
                audio_bitrate.into(),
                "-movflags".into(),
                "+faststart".into(),
            ]);
        }
        ExportFormat::WebmVp9 => {
            let (crf, audio_bitrate) = match quality {
                ExportQuality::Low => ("40", "96k"),
                ExportQuality::Medium => ("31", "192k"),
                ExportQuality::High => ("24", "320k"),
            };
            args.extend([
                "-c:v".into(),
                "libvpx-vp9".into(),
                "-crf".into(),
                crf.into(),
                "-b:v".into(),
                "0".into(),
                "-c:a".into(),
                "libopus".into(),
                "-b:a".into(),
                audio_bitrate.into(),
            ]);
        }
        ExportFormat::MovProres => {
            let profile = match quality {
                ExportQuality::Low => "0",
                ExportQuality::Medium => "2",
                ExportQuality::High => "3",
            };
            args.extend([
                "-c:v".into(),
                "prores_ks".into(),
                "-profile:v".into(),
                profile.into(),
                "-c:a".into(),
                "pcm_s16le".into(),
            ]);
        }
    }

    args.push(output.into());
    args
}

/// Build ffmpeg args to generate thumbnail images from a video.
pub fn thumbnail_args(input: &str, output_pattern: &str, interval: f64) -> Vec<String> {
    vec![
        "-i".into(),
        input.into(),
        "-vf".into(),
        format!("fps=1/{:.2}", interval),
        "-frames:v".into(),
        "50".into(),
        output_pattern.into(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_probe_args() {
        let args = probe_args("/path/to/video.mp4");
        assert_eq!(
            args,
            vec![
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                "/path/to/video.mp4"
            ]
        );
    }

    #[test]
    fn test_extract_segment_copy() {
        let args = extract_segment_args("/input.mp4", 10.0, 20.0, 1.0, 1.0, 30.0, "/output.mp4");
        assert!(args.contains(&"-c".to_string()));
        assert!(args.contains(&"copy".to_string()));
        assert!(!args.contains(&"-vf".to_string()));
        // -ss should be before -i for fast seeking
        let ss_idx = args.iter().position(|a| a == "-ss").unwrap();
        let i_idx = args.iter().position(|a| a == "-i").unwrap();
        assert!(ss_idx < i_idx, "-ss must come before -i for stream copy path");
        // Should normalize timestamps for concat compatibility
        assert!(args.contains(&"-avoid_negative_ts".to_string()));
        assert!(args.contains(&"make_zero".to_string()));
    }

    #[test]
    fn test_extract_segment_with_speed() {
        let args = extract_segment_args("/input.mp4", 0.0, 10.0, 2.0, 1.0, 30.0, "/output.mp4");
        assert!(args.contains(&"-vf".to_string()));
        assert!(args.contains(&"setpts=(PTS-STARTPTS)*0.5".to_string()));
        assert!(args.contains(&"-af".to_string()));
        // -ss and -to should be before -i (input options)
        let ss_idx = args.iter().position(|a| a == "-ss").unwrap();
        let i_idx = args.iter().position(|a| a == "-i").unwrap();
        assert!(ss_idx < i_idx, "-ss must come before -i for re-encode path");
        // Audio filter should include PTS reset for A/V sync
        let af_idx = args.iter().position(|a| a == "-af").unwrap();
        let audio_filter = &args[af_idx + 1];
        assert!(audio_filter.contains("atempo=2.0000"));
        assert!(audio_filter.ends_with(",asetpts=PTS-STARTPTS"));
        // Lossless fast intermediate codecs
        assert!(args.contains(&"-c:v".to_string()));
        assert!(args.contains(&"libx264".to_string()));
        assert!(args.contains(&"-preset".to_string()));
        assert!(args.contains(&"ultrafast".to_string()));
        assert!(args.contains(&"-crf".to_string()));
        assert!(args.contains(&"0".to_string()));
        assert!(args.contains(&"-c:a".to_string()));
        assert!(args.contains(&"flac".to_string()));
    }

    #[test]
    fn test_extract_segment_extreme_speed_has_fps_filter() {
        let args = extract_segment_args("/input.mp4", 0.0, 60.0, 32.0, 1.0, 30.0, "/output.mp4");
        let vf_idx = args.iter().position(|a| a == "-vf").unwrap();
        let video_filter = &args[vf_idx + 1];
        assert!(video_filter.contains("fps=30.0000"), "extreme speed must cap at source fps: {video_filter}");
        assert!(video_filter.starts_with("setpts="));
    }

    #[test]
    fn test_extract_segment_extreme_speed_preserves_source_fps() {
        // 60fps source at 32x — should cap at 60, not 30
        let args = extract_segment_args("/input.mp4", 0.0, 60.0, 32.0, 1.0, 60.0, "/output.mp4");
        let vf_idx = args.iter().position(|a| a == "-vf").unwrap();
        let video_filter = &args[vf_idx + 1];
        assert!(video_filter.contains("fps=60.0000"), "must use source fps, not hardcoded 30: {video_filter}");
    }

    #[test]
    fn test_extract_segment_moderate_speed_no_fps_filter() {
        let args = extract_segment_args("/input.mp4", 0.0, 10.0, 4.0, 1.0, 30.0, "/output.mp4");
        let vf_idx = args.iter().position(|a| a == "-vf").unwrap();
        let video_filter = &args[vf_idx + 1];
        assert!(!video_filter.contains("fps="), "moderate speed should not include fps cap: {video_filter}");
    }

    #[test]
    fn test_extract_segment_with_volume() {
        let args = extract_segment_args("/input.mp4", 0.0, 10.0, 1.0, 1.5, 30.0, "/output.mp4");
        assert!(args.contains(&"-vf".to_string()));
        assert!(args.contains(&"-af".to_string()));
        let af_idx = args.iter().position(|a| a == "-af").unwrap();
        let filter = &args[af_idx + 1];
        assert!(filter.contains("volume=1.5000"));
        assert!(filter.ends_with(",asetpts=PTS-STARTPTS"));
    }

    #[test]
    fn test_extract_segment_with_speed_and_volume() {
        let args = extract_segment_args("/input.mp4", 0.0, 10.0, 0.5, 0.5, 30.0, "/output.mp4");
        let af_idx = args.iter().position(|a| a == "-af").unwrap();
        let filter = &args[af_idx + 1];
        assert!(filter.contains("atempo="));
        assert!(filter.contains("volume=0.5000"));
        assert!(filter.ends_with(",asetpts=PTS-STARTPTS"));
    }

    #[test]
    fn test_concat_args_mp4_high() {
        let args = concat_args("/tmp/filelist.txt", "/output.mp4", &ExportFormat::Mp4H264, &ExportQuality::High);
        assert!(args.contains(&"libx264".to_string()));
        assert!(args.contains(&"aac".to_string()));
        assert!(args.contains(&"-crf".to_string()));
        assert!(args.contains(&"18".to_string()));
        assert!(args.contains(&"-preset".to_string()));
        assert!(args.contains(&"slow".to_string()));
        assert!(args.contains(&"-movflags".to_string()));
        assert!(args.contains(&"+faststart".to_string()));
        assert!(args.contains(&"-b:a".to_string()));
        assert!(args.contains(&"320k".to_string()));
    }

    #[test]
    fn test_concat_args_mp4_low() {
        let args = concat_args("/tmp/filelist.txt", "/output.mp4", &ExportFormat::Mp4H264, &ExportQuality::Low);
        assert!(args.contains(&"28".to_string()));
        assert!(args.contains(&"faster".to_string()));
        assert!(args.contains(&"128k".to_string()));
    }

    #[test]
    fn test_concat_args_webm() {
        let args = concat_args("/tmp/filelist.txt", "/output.webm", &ExportFormat::WebmVp9, &ExportQuality::Medium);
        assert!(args.contains(&"libvpx-vp9".to_string()));
        assert!(args.contains(&"libopus".to_string()));
        assert!(args.contains(&"-crf".to_string()));
        assert!(args.contains(&"31".to_string()));
        assert!(args.contains(&"-b:v".to_string()));
        assert!(args.contains(&"0".to_string()));
        assert!(args.contains(&"192k".to_string()));
    }

    #[test]
    fn test_concat_args_mov() {
        let args = concat_args("/tmp/filelist.txt", "/output.mov", &ExportFormat::MovProres, &ExportQuality::High);
        assert!(args.contains(&"prores_ks".to_string()));
        assert!(args.contains(&"pcm_s16le".to_string()));
        assert!(args.contains(&"-profile:v".to_string()));
        assert!(args.contains(&"3".to_string()));
    }

    #[test]
    fn test_concat_args_mov_low() {
        let args = concat_args("/tmp/filelist.txt", "/output.mov", &ExportFormat::MovProres, &ExportQuality::Low);
        assert!(args.contains(&"0".to_string())); // ProRes Proxy profile
    }

    #[test]
    fn test_thumbnail_args() {
        let args = thumbnail_args("/input.mp4", "/tmp/thumb_%03d.jpg", 5.0);
        assert!(args.contains(&"/input.mp4".to_string()));
        assert!(args.contains(&"50".to_string()));
        assert!(args.contains(&"fps=1/5.00".to_string()));
    }

    #[test]
    fn test_build_audio_filter_normal_speed() {
        let filter = build_audio_filter(1.5, 1.0);
        assert_eq!(filter, "atempo=1.5000");
    }

    #[test]
    fn test_build_audio_filter_very_slow() {
        let filter = build_audio_filter(0.25, 1.0);
        // 0.25 < 0.5, so should chain: atempo=0.5, then atempo=0.5
        assert!(filter.contains("atempo=0.5"));
    }

    #[test]
    fn test_build_audio_filter_identity() {
        let filter = build_audio_filter(1.0, 1.0);
        assert_eq!(filter, "anull");
    }

    #[test]
    fn test_with_thread_limit() {
        let args = vec!["-y".into(), "-i".into(), "input.mp4".into()];
        let limited = with_thread_limit(args, 2);
        assert_eq!(limited[0], "-threads");
        assert_eq!(limited[1], "2");
        assert_eq!(limited[2], "-y");
        assert_eq!(limited[3], "-i");
        assert_eq!(limited[4], "input.mp4");
        assert_eq!(limited.len(), 5);
    }

    #[test]
    fn test_extract_segment_reencode_has_lossless_codecs() {
        let args = extract_segment_args("/input.mp4", 0.0, 10.0, 1.0, 2.0, 30.0, "/output.mkv");
        // Should have lossless intermediate codecs before the output path
        let cv_idx = args.iter().position(|a| a == "-c:v").unwrap();
        let out_idx = args.iter().position(|a| a == "/output.mkv").unwrap();
        assert!(cv_idx < out_idx, "-c:v must come before output path");
        assert_eq!(args[cv_idx + 1], "libx264");

        let preset_idx = args.iter().position(|a| a == "-preset").unwrap();
        assert_eq!(args[preset_idx + 1], "ultrafast");

        let ca_idx = args.iter().position(|a| a == "-c:a").unwrap();
        assert_eq!(args[ca_idx + 1], "flac");
    }

    #[test]
    fn test_extract_segment_copy_has_no_codecs() {
        let args = extract_segment_args("/input.mp4", 0.0, 10.0, 1.0, 1.0, 30.0, "/output.mkv");
        // Stream copy path should NOT have explicit codec args
        assert!(!args.contains(&"-c:v".to_string()));
        assert!(!args.contains(&"-preset".to_string()));
    }
}
