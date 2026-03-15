use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use tauri::State;
use tauri::ipc::Channel;
use tokio::sync::Semaphore;

use crate::domain::error::HoojError;
use crate::domain::export::{ExportEvent, ExportSettings};
use crate::infra::ffmpeg::{commands as ffcmd, process, progress};
use crate::state::AppState;

#[tauri::command]
pub async fn export_video(
    settings: ExportSettings,
    on_progress: Channel<ExportEvent>,
    state: State<'_, AppState>,
) -> Result<(), HoojError> {
    let (source_path, segments, source_fps) = {
        let proj_lock = state.project.lock().unwrap();
        let project = proj_lock.as_ref().ok_or(HoojError::NoProject)?;
        (
            project.source_path.clone(),
            project.segments.clone(),
            project.video_info.fps,
        )
    };

    let total_segments = segments.len();
    let export_id = uuid::Uuid::new_v4().to_string();
    let temp_dir = format!("{}/hooj-export-{}", state.temp_dir, export_id);
    std::fs::create_dir_all(&temp_dir)?;

    // Cap concurrency: min(available cores, 4)
    let max_parallel = std::thread::available_parallelism()
        .map(|n| n.get().min(4))
        .unwrap_or(2);
    let semaphore = Arc::new(Semaphore::new(max_parallel));
    let threads_per_segment = 2usize;

    let completed = Arc::new(AtomicUsize::new(0));

    // Step 1: Extract segments in parallel
    let mut handles = Vec::with_capacity(total_segments);

    for (i, segment) in segments.iter().enumerate() {
        let output_file = format!("{}/segment_{:04}.mkv", temp_dir, i);
        let source = source_path.clone();
        let seg = segment.clone();
        let sem = semaphore.clone();
        let progress_channel = on_progress.clone();
        let completed = completed.clone();
        let total = total_segments;

        let handle = tokio::spawn(async move {
            let _permit = sem
                .acquire()
                .await
                .map_err(|_| HoojError::FFmpeg("semaphore closed".into()))?;

            let needs_reencode =
                (seg.speed - 1.0).abs() > f64::EPSILON || (seg.volume - 1.0).abs() > f64::EPSILON;

            let args = ffcmd::extract_segment_args(
                &source,
                seg.start_time,
                seg.end_time,
                seg.speed,
                seg.volume,
                source_fps,
                &output_file,
            );
            let args = ffcmd::with_thread_limit(args, threads_per_segment);

            if needs_reencode {
                let mut args = args;
                args.insert(0, "-progress".into());
                args.insert(1, "pipe:2".into());

                let segment_duration_us =
                    ((seg.end_time - seg.start_time) / seg.speed) * 1_000_000.0;
                let seg_idx = i;
                let progress_percent = Arc::new(Mutex::new(0.0f64));
                let progress_percent_clone = progress_percent.clone();

                process::run_ffmpeg_with_progress(args, move |line| {
                    if let Some(p) = progress::parse_progress_line(line, segment_duration_us) {
                        let mut pct = progress_percent_clone.lock().unwrap();
                        *pct = p;
                        let overall = ((seg_idx as f64 + p) / total as f64) * 100.0;
                        let _ = progress_channel.send(ExportEvent::Progress {
                            percent: overall,
                            current_segment: seg_idx + 1,
                            total_segments: total,
                        });
                    }
                })
                .await?;
            } else {
                process::run_ffmpeg(args).await?;
            }

            completed.fetch_add(1, Ordering::Relaxed);

            Ok::<String, HoojError>(output_file)
        });

        handles.push(handle);
    }

    // Wait for all segments, collect results
    let results = futures::future::join_all(handles).await;

    let mut segment_files = Vec::with_capacity(total_segments);
    for result in results {
        let output_file = result.map_err(|e| HoojError::FFmpeg(e.to_string()))??;
        segment_files.push(output_file);
    }

    // Emit SegmentDone events in order
    for i in 0..total_segments {
        let _ = on_progress.send(ExportEvent::SegmentDone { index: i });
    }

    // Step 2: Create concat filelist
    let _ = on_progress.send(ExportEvent::Concatenating);

    let filelist_path = format!("{}/filelist.txt", temp_dir);
    let filelist_content: String = segment_files
        .iter()
        .map(|f| format!("file '{}'\n", f))
        .collect();
    std::fs::write(&filelist_path, filelist_content)?;

    // Step 3: Concatenate
    let concat_args = ffcmd::concat_args(
        &filelist_path,
        &settings.output_path,
        &settings.format,
        &settings.quality,
    );
    process::run_ffmpeg(concat_args).await?;

    // Step 4: Cleanup
    let _ = std::fs::remove_dir_all(&temp_dir);

    let _ = on_progress.send(ExportEvent::Done);

    Ok(())
}
