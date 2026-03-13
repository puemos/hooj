import { useRef, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { usePlaybackStore } from '@/store/playback-store';
import { useUiStore } from '@/store/ui-store';
import { useTauri } from '@/hooks/use-tauri';
import { TimelineRuler } from './timeline-ruler';
import { TimelineSegment } from './timeline-segment';
import { TimelinePlayhead } from './timeline-playhead';
import { totalSegmentsDuration } from '@/lib/time';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const BASE_PX_PER_SEC = 80;
const DRAG_THRESHOLD = 5;

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const hasAutoFit = useRef(false);
  const project = useProjectStore((s) => s.project);
  const segments = useProjectStore((s) => s.segments);
  const setSegments = useProjectStore((s) => s.setSegments);
  const thumbnails = useProjectStore((s) => s.thumbnails);
  const { currentTime, setCurrentTime, setIsPlaying, setIsScrubbing } = usePlaybackStore();
  const { timelineZoom, setTimelineZoom } = useUiStore();
  const { reorderSegments } = useTauri();

  const totalDuration = totalSegmentsDuration(segments);
  const pxPerSecond = BASE_PX_PER_SEC * timelineZoom;
  const timelineWidth = totalDuration * pxPerSecond;

  // Drag-to-reorder state
  const dragRef = useRef<{
    segmentId: string;
    startClientX: number;
    activated: boolean;
    dropIndex: number | null;
    suppressClick: boolean;
  } | null>(null);
  const [dragRender, setDragRender] = useState<{
    sourceId: string;
    dropIndex: number | null;
  } | null>(null);

  const fitZoom = useCallback(() => {
    const container = containerRef.current;
    if (!container || totalDuration <= 0) return;
    const zoom = container.clientWidth / (totalDuration * BASE_PX_PER_SEC);
    setTimelineZoom(zoom);
  }, [totalDuration, setTimelineZoom]);

  // Auto-fit on first render with segments
  useEffect(() => {
    if (hasAutoFit.current || segments.length === 0) return;
    hasAutoFit.current = true;
    // Wait for container to be laid out
    requestAnimationFrame(() => fitZoom());
  }, [segments, fitZoom]);

  const clampTime = useCallback(
    (time: number) => Math.max(0, Math.min(totalDuration, time)),
    [totalDuration]
  );

  const xToTime = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return 0;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left + container.scrollLeft;
      return clampTime(x / pxPerSecond);
    },
    [pxPerSecond, clampTime]
  );

  // Compute segment widths helper
  const getSegmentWidths = useCallback(() => {
    return segments.map((seg) => {
      const dur = (seg.end_time - seg.start_time) / seg.speed;
      return dur * pxPerSecond;
    });
  }, [segments, pxPerSecond]);

  // Compute drop index from cursor X position
  const computeDropIndex = useCallback(
    (clientX: number): number | null => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const cursorX = clientX - rect.left + container.scrollLeft;
      const widths = getSegmentWidths();

      let accum = 0;
      for (let i = 0; i < widths.length; i++) {
        const mid = accum + widths[i] / 2;
        if (cursorX < mid) return i;
        accum += widths[i];
      }
      return widths.length;
    },
    [getSegmentWidths]
  );

  // Drag move handler
  const handleDragMove = useCallback(
    (ev: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (!drag.activated) {
        if (Math.abs(ev.clientX - drag.startClientX) < DRAG_THRESHOLD) return;
        drag.activated = true;
        document.body.style.cursor = 'grabbing';
        setDragRender({ sourceId: drag.segmentId, dropIndex: null });
      }

      const rawDropIndex = computeDropIndex(ev.clientX);
      if (rawDropIndex === null) return;

      // Find current index of dragged segment
      const currentIndex = segments.findIndex((s) => s.id === drag.segmentId);
      // Skip if dropping at same position (before or after current)
      const effectiveDropIndex =
        rawDropIndex === currentIndex || rawDropIndex === currentIndex + 1
          ? null
          : rawDropIndex;

      if (effectiveDropIndex !== drag.dropIndex) {
        drag.dropIndex = effectiveDropIndex;
        setDragRender((prev) =>
          prev ? { ...prev, dropIndex: effectiveDropIndex } : prev
        );
      }
    },
    [computeDropIndex, segments]
  );

  // Drag end handler
  const handleDragEnd = useCallback(
    async () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';

      const drag = dragRef.current;
      if (!drag) return;

      if (drag.activated && drag.dropIndex !== null) {
        drag.suppressClick = true;
        // Compute new order
        const currentIndex = segments.findIndex((s) => s.id === drag.segmentId);
        const newSegments = [...segments];
        const [moved] = newSegments.splice(currentIndex, 1);
        const insertAt =
          drag.dropIndex > currentIndex ? drag.dropIndex - 1 : drag.dropIndex;
        newSegments.splice(insertAt, 0, moved);
        const newIds = newSegments.map((s) => s.id);

        try {
          const updated = await reorderSegments(newIds);
          setSegments(updated);
        } catch {
          /* ignore */
        }
      }

      setDragRender(null);
      // Keep dragRef around briefly for click suppression
      if (!drag.activated) {
        dragRef.current = null;
      } else {
        // Clear after a tick so onClickCapture can read suppressClick
        requestAnimationFrame(() => {
          dragRef.current = null;
        });
      }
    },
    [handleDragMove, segments, reorderSegments, setSegments]
  );

  // Click to seek + drag-to-reorder initiation
  const handleTimelineMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left button
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('[data-playhead]')) return;

      // Check if clicking on a segment for drag-to-reorder
      const segmentEl = (e.target as HTMLElement).closest('[data-segment-id]');
      if (segmentEl) {
        const segmentId = segmentEl.getAttribute('data-segment-id');
        if (!segmentId) return;
        e.preventDefault();
        dragRef.current = {
          segmentId,
          startClientX: e.clientX,
          activated: false,
          dropIndex: null,
          suppressClick: false,
        };
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        return;
      }

      // Non-segment click: seek
      if ((e.target as HTMLElement).closest('[data-segment]')) return;

      e.preventDefault();
      setIsPlaying(false);
      setIsScrubbing(true);
      const time = xToTime(e.clientX);
      setCurrentTime(time);

      const onMove = (ev: MouseEvent) => {
        const t = xToTime(ev.clientX);
        setCurrentTime(t);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        setIsScrubbing(false);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [xToTime, setCurrentTime, setIsPlaying, setIsScrubbing, handleDragMove, handleDragEnd]
  );

  // Suppress click after drag completes
  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragRef.current?.suppressClick) {
      e.stopPropagation();
      dragRef.current.suppressClick = false;
    }
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setTimelineZoom(timelineZoom * delta);
      }
    },
    [timelineZoom, setTimelineZoom]
  );

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const playheadX = currentTime * pxPerSecond;
    const { scrollLeft, clientWidth } = container;
    if (playheadX < scrollLeft + 40) {
      container.scrollLeft = Math.max(0, playheadX - 40);
    } else if (playheadX > scrollLeft + clientWidth - 40) {
      container.scrollLeft = playheadX - clientWidth + 40;
    }
  }, [currentTime, pxPerSecond]);

  if (segments.length === 0) return null;

  const thumbCount = thumbnails.length;
  const thumbWidth = thumbCount > 0 ? timelineWidth / thumbCount : 0;

  // Compute drop indicator X position
  let dropIndicatorX: number | null = null;
  if (dragRender?.dropIndex !== null && dragRender?.dropIndex !== undefined) {
    const widths = getSegmentWidths();
    let x = 0;
    for (let i = 0; i < dragRender.dropIndex; i++) {
      x += widths[i];
    }
    dropIndicatorX = x;
  }

  return (
    <div className="flex flex-col border-t border-border bg-background">
      {/* Zoom control */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
        <ZoomOut className="h-3 w-3 text-muted-foreground" />
        <Slider
          value={[timelineZoom]}
          onValueChange={([v]) => setTimelineZoom(v)}
          min={0.1}
          max={5}
          step={0.05}
          className="w-24"
        />
        <ZoomIn className="h-3 w-3 text-muted-foreground" />
        <button
          onClick={fitZoom}
          className="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Fit to view"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-hidden cursor-crosshair"
        style={{ height: 120 }}
        onMouseDown={handleTimelineMouseDown}
        onClickCapture={handleClickCapture}
        onWheel={handleWheel}
      >
        <div
          ref={trackRef}
          className="relative"
          style={{ width: timelineWidth, minWidth: '100%', height: '100%' }}
        >
          {/* Ruler */}
          <TimelineRuler totalDuration={totalDuration} pxPerSecond={pxPerSecond} />

          {/* Thumbnail strip */}
          {thumbCount > 0 && (
            <div className="absolute top-5 left-0 flex h-[24px] opacity-20 pointer-events-none">
              {thumbnails.map((thumb, i) => (
                <img
                  key={i}
                  src={`asset://localhost/${encodeURIComponent(thumb)}`}
                  className="h-full object-cover"
                  style={{ width: thumbWidth }}
                  alt=""
                />
              ))}
            </div>
          )}

          {/* Segments */}
          <div className="absolute top-[30px] left-0 flex" style={{ height: 56 }}>
            {segments.map((segment, i) => {
              const segDuration = (segment.end_time - segment.start_time) / segment.speed;
              const segWidth = segDuration * pxPerSecond;
              return (
                <TimelineSegment
                  key={segment.id}
                  segment={segment}
                  index={i}
                  width={segWidth}
                  isDragSource={dragRender?.sourceId === segment.id}
                  videoDuration={project?.video_info.duration_secs ?? Infinity}
                  pxPerSecond={pxPerSecond}
                />
              );
            })}
          </div>

          {/* Drop indicator */}
          {dropIndicatorX !== null && (
            <div
              className="absolute top-[30px] w-0.5 bg-blue-400 rounded-full pointer-events-none z-20"
              style={{
                left: dropIndicatorX,
                height: 56,
                boxShadow: '0 0 6px rgba(96,165,250,0.6)',
              }}
            />
          )}

          {/* Playhead */}
          <TimelinePlayhead
            currentTime={currentTime}
            pxPerSecond={pxPerSecond}
            totalDuration={totalDuration}
            height={120}
            containerRef={containerRef}
            onSeek={(time) => {
              setIsPlaying(false);
              setCurrentTime(time);
            }}
            onScrubStart={() => {
              setIsPlaying(false);
              setIsScrubbing(true);
            }}
            onScrubEnd={() => setIsScrubbing(false)}
          />
        </div>
      </div>
    </div>
  );
}
