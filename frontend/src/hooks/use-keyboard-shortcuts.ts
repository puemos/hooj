import { useEffect } from 'react';
import { usePlaybackStore } from '@/store/playback-store';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useTauri } from '@/hooks/use-tauri';
import { SPEED_STEP } from '@/lib/constants';
import { outputTimeToSourceTime, sourceTimeToOutputTime } from '@/lib/time';

export function useKeyboardShortcuts() {
  const { togglePlayback, currentTime, setCurrentTime } = usePlaybackStore();
  const { segments, selectedSegmentId, setSelectedSegmentId, setSegments } = useProjectStore();
  const { setExportDialogOpen } = useUiStore();
  const { splitAt, deleteSegment, duplicateSegment, setSegmentSpeed, undo, redo, openVideoDialog, importVideo } =
    useTauri();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      switch (e.code) {
        case 'Space': {
          e.preventDefault();
          togglePlayback();
          break;
        }

        case 'KeyK': {
          if (!selectedSegmentId) break;
          e.preventDefault();
          let accum = 0;
          for (const seg of segments) {
            const segDur = (seg.end_time - seg.start_time) / seg.speed;
            if (currentTime < accum + segDur) {
              const offsetInSeg = currentTime - accum;
              const sourceTime = seg.start_time + offsetInSeg * seg.speed;
              if (sourceTime > seg.start_time + 0.1 && sourceTime < seg.end_time - 0.1) {
                try {
                  const updated = await splitAt(seg.id, sourceTime);
                  setSegments(updated);
                } catch { /* ignore */ }
              }
              break;
            }
            accum += segDur;
          }
          break;
        }

        case 'Delete':
        case 'Backspace': {
          if (!selectedSegmentId || segments.length <= 1) break;
          e.preventDefault();
          try {
            const updated = await deleteSegment(selectedSegmentId);
            setSegments(updated);
          } catch { /* ignore */ }
          break;
        }

        case 'KeyD': {
          if (!ctrl || !selectedSegmentId) break;
          e.preventDefault();
          try {
            const updated = await duplicateSegment(selectedSegmentId);
            setSegments(updated);
          } catch { /* ignore */ }
          break;
        }

        case 'KeyZ': {
          if (!ctrl) break;
          e.preventDefault();
          try {
            const updated = e.shiftKey ? await redo() : await undo();
            setSegments(updated);
          } catch { /* ignore */ }
          break;
        }

        case 'KeyJ': {
          // Speed down - no limit
          if (!selectedSegmentId) break;
          e.preventDefault();
          const segJ = segments.find((s) => s.id === selectedSegmentId);
          if (!segJ) break;
          const newSpeedJ = Math.max(0.01, segJ.speed - SPEED_STEP);
          try {
            const sourceInfoJ = outputTimeToSourceTime(currentTime, segments);
            const updated = await setSegmentSpeed(selectedSegmentId, newSpeedJ);
            if (sourceInfoJ) {
              setCurrentTime(sourceTimeToOutputTime(sourceInfoJ.segmentId, sourceInfoJ.sourceTime, updated));
            }
            setSegments(updated);
          } catch { /* ignore */ }
          break;
        }

        case 'KeyL': {
          // Speed up - no limit
          if (!selectedSegmentId) break;
          e.preventDefault();
          const segL = segments.find((s) => s.id === selectedSegmentId);
          if (!segL) break;
          const newSpeedL = segL.speed + SPEED_STEP;
          try {
            const sourceInfoL = outputTimeToSourceTime(currentTime, segments);
            const updated = await setSegmentSpeed(selectedSegmentId, newSpeedL);
            if (sourceInfoL) {
              setCurrentTime(sourceTimeToOutputTime(sourceInfoL.segmentId, sourceInfoL.sourceTime, updated));
            }
            setSegments(updated);
          } catch { /* ignore */ }
          break;
        }

        case 'BracketLeft': {
          e.preventDefault();
          const idx = segments.findIndex((s) => s.id === selectedSegmentId);
          if (idx > 0) setSelectedSegmentId(segments[idx - 1].id);
          break;
        }

        case 'BracketRight': {
          e.preventDefault();
          const idx = segments.findIndex((s) => s.id === selectedSegmentId);
          if (idx < segments.length - 1) setSelectedSegmentId(segments[idx + 1].id);
          break;
        }

        case 'KeyE': {
          if (!ctrl) break;
          e.preventDefault();
          setExportDialogOpen(true);
          break;
        }

        case 'KeyI': {
          if (!ctrl) break;
          e.preventDefault();
          try {
            const path = await openVideoDialog();
            if (path) {
              const project = await importVideo(path);
              useProjectStore.getState().setProject(project);
            }
          } catch { /* ignore */ }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlayback,
    currentTime,
    setCurrentTime,
    segments,
    selectedSegmentId,
    setSelectedSegmentId,
    setSegments,
    setExportDialogOpen,
    splitAt,
    deleteSegment,
    duplicateSegment,
    setSegmentSpeed,
    undo,
    redo,
    openVideoDialog,
    importVideo,
  ]);
}
