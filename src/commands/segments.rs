use tauri::State;

use crate::domain::error::HoojError;
use crate::domain::segment::Segment;
use crate::state::AppState;

fn with_project_segments<F>(
    state: &State<'_, AppState>,
    mutate: F,
) -> Result<Vec<Segment>, HoojError>
where
    F: FnOnce(&mut Vec<Segment>) -> Result<(), HoojError>,
{
    let mut proj_lock = state.project.lock().unwrap();
    let project = proj_lock.as_mut().ok_or(HoojError::NoProject)?;

    // Save current state for undo
    state.history.lock().unwrap().push(project.segments.clone());

    // Apply mutation
    mutate(&mut project.segments)?;

    Ok(project.segments.clone())
}

#[tauri::command]
pub fn split_at(
    segment_id: String,
    time: f64,
    state: State<'_, AppState>,
) -> Result<Vec<Segment>, HoojError> {
    with_project_segments(&state, |segments| {
        let idx = segments
            .iter()
            .position(|s| s.id == segment_id)
            .ok_or_else(|| HoojError::InvalidSegment("Segment not found".into()))?;

        let segment = &segments[idx];

        if time <= segment.start_time || time >= segment.end_time {
            return Err(HoojError::InvalidSegment(
                "Split time must be within segment bounds".into(),
            ));
        }

        let mut right = Segment::new(time, segment.end_time);
        right.speed = segment.speed;
        right.volume = segment.volume;

        segments[idx].end_time = time;
        segments.insert(idx + 1, right);

        Ok(())
    })
}

#[tauri::command]
pub fn delete_segment(
    segment_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Segment>, HoojError> {
    with_project_segments(&state, |segments| {
        let idx = segments
            .iter()
            .position(|s| s.id == segment_id)
            .ok_or_else(|| HoojError::InvalidSegment("Segment not found".into()))?;

        if segments.len() <= 1 {
            return Err(HoojError::InvalidSegment(
                "Cannot delete the last segment".into(),
            ));
        }

        segments.remove(idx);
        Ok(())
    })
}

#[tauri::command]
pub fn duplicate_segment(
    segment_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Segment>, HoojError> {
    with_project_segments(&state, |segments| {
        let idx = segments
            .iter()
            .position(|s| s.id == segment_id)
            .ok_or_else(|| HoojError::InvalidSegment("Segment not found".into()))?;

        let mut clone = segments[idx].clone();
        clone.id = uuid::Uuid::new_v4().to_string();

        segments.insert(idx + 1, clone);
        Ok(())
    })
}

#[tauri::command]
pub fn set_segment_speed(
    segment_id: String,
    speed: f64,
    state: State<'_, AppState>,
) -> Result<Vec<Segment>, HoojError> {
    let speed = speed.clamp(0.1, 32.0);

    with_project_segments(&state, |segments| {
        let segment = segments
            .iter_mut()
            .find(|s| s.id == segment_id)
            .ok_or_else(|| HoojError::InvalidSegment("Segment not found".into()))?;

        segment.speed = speed;
        Ok(())
    })
}

#[tauri::command]
pub fn set_segment_volume(
    segment_id: String,
    volume: f64,
    state: State<'_, AppState>,
) -> Result<Vec<Segment>, HoojError> {
    let volume = volume.clamp(0.0, 2.0);

    with_project_segments(&state, |segments| {
        let segment = segments
            .iter_mut()
            .find(|s| s.id == segment_id)
            .ok_or_else(|| HoojError::InvalidSegment("Segment not found".into()))?;

        segment.volume = volume;
        Ok(())
    })
}

#[tauri::command]
pub fn reorder_segments(
    segment_ids: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Segment>, HoojError> {
    with_project_segments(&state, |segments| {
        let mut reordered = Vec::with_capacity(segment_ids.len());
        for id in &segment_ids {
            let seg = segments
                .iter()
                .find(|s| &s.id == id)
                .ok_or_else(|| HoojError::InvalidSegment(format!("Segment {} not found", id)))?
                .clone();
            reordered.push(seg);
        }
        *segments = reordered;
        Ok(())
    })
}

#[tauri::command]
pub fn update_segment_bounds(
    segment_id: String,
    start: f64,
    end: f64,
    state: State<'_, AppState>,
) -> Result<Vec<Segment>, HoojError> {
    if start >= end {
        return Err(HoojError::InvalidSegment("Start must be before end".into()));
    }

    // Read video duration before with_project_segments re-acquires the lock
    let duration_secs = {
        let proj_lock = state.project.lock().unwrap();
        let project = proj_lock.as_ref().ok_or(HoojError::NoProject)?;
        project.video_info.duration_secs
    };

    with_project_segments(&state, |segments| {
        let segment = segments
            .iter_mut()
            .find(|s| s.id == segment_id)
            .ok_or_else(|| HoojError::InvalidSegment("Segment not found".into()))?;

        segment.start_time = start.max(0.0);
        segment.end_time = end.min(duration_secs);
        Ok(())
    })
}

#[tauri::command]
pub fn undo(state: State<'_, AppState>) -> Result<Vec<Segment>, HoojError> {
    let mut proj_lock = state.project.lock().unwrap();
    let project = proj_lock.as_mut().ok_or(HoojError::NoProject)?;

    let mut history = state.history.lock().unwrap();
    match history.undo(project.segments.clone()) {
        Some(previous) => {
            project.segments = previous.clone();
            Ok(previous)
        }
        None => Ok(project.segments.clone()),
    }
}

#[tauri::command]
pub fn redo(state: State<'_, AppState>) -> Result<Vec<Segment>, HoojError> {
    let mut proj_lock = state.project.lock().unwrap();
    let project = proj_lock.as_mut().ok_or(HoojError::NoProject)?;

    let mut history = state.history.lock().unwrap();
    match history.redo(project.segments.clone()) {
        Some(next) => {
            project.segments = next.clone();
            Ok(next)
        }
        None => Ok(project.segments.clone()),
    }
}
