import { useCallback, useRef, useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { usePlaybackStore } from '@/store/playback-store';
import { useTauri } from '@/hooks/use-tauri';
import { SEGMENT_COLORS, SPEED_STEP, MAX_SPEED } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import {
  Gauge,
  Copy,
  Trash2,
  Scissors,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import type { Segment } from '@/types';

interface TimelineSegmentProps {
  segment: Segment;
  index: number;
  width: number;
  isDragSource?: boolean;
  videoDuration: number;
  pxPerSecond: number;
}

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0, 12.0, 16.0, 24.0, 32.0];

export function TimelineSegment({ segment, index, width, isDragSource, videoDuration, pxPerSecond }: TimelineSegmentProps) {
  const { selectedSegmentId, setSelectedSegmentId, setSegments, segments } = useProjectStore();
  const { currentTime } = usePlaybackStore();
  const { updateSegmentBounds, setSegmentSpeed, deleteSegment, duplicateSegment, splitAt } = useTauri();
  const isSelected = selectedSegmentId === segment.id;
  const colorClass = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
  const segRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedSegmentId(segment.id);
    },
    [segment.id, setSelectedSegmentId]
  );

  const handleTrimStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const origStart = segment.start_time;
      const duration = segment.end_time - segment.start_time;
      let newStart = origStart;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dtSeconds = (dx / width) * duration;
        newStart = Math.max(0, Math.min(segment.end_time - 0.1, origStart + dtSeconds));
        const newDuration = (segment.end_time - newStart) / segment.speed;
        setPreviewWidth(Math.max(20, newDuration * pxPerSecond));
      };

      const onUp = async () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (Math.abs(newStart - origStart) > 0.05) {
          try {
            const updated = await updateSegmentBounds(segment.id, newStart, segment.end_time);
            setSegments(updated);
          } catch { /* ignore */ }
        }
        setPreviewWidth(null);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [segment, width, pxPerSecond, updateSegmentBounds, setSegments]
  );

  const handleTrimEnd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const origEnd = segment.end_time;
      const duration = segment.end_time - segment.start_time;
      let newEnd = origEnd;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dtSeconds = (dx / width) * duration;
        newEnd = Math.min(videoDuration, Math.max(segment.start_time + 0.1, origEnd + dtSeconds));
        const newDuration = (newEnd - segment.start_time) / segment.speed;
        setPreviewWidth(Math.max(20, newDuration * pxPerSecond));
      };

      const onUp = async () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (Math.abs(newEnd - origEnd) > 0.05) {
          try {
            const updated = await updateSegmentBounds(segment.id, segment.start_time, newEnd);
            setSegments(updated);
          } catch { /* ignore */ }
        }
        setPreviewWidth(null);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [segment, width, videoDuration, pxPerSecond, updateSegmentBounds, setSegments]
  );

  // Context menu actions
  const handleSpeedUp = useCallback(async () => {
    const newSpeed = Math.min(MAX_SPEED, segment.speed + SPEED_STEP);
    try {
      const updated = await setSegmentSpeed(segment.id, newSpeed);
      setSegments(updated);
    } catch { /* ignore */ }
  }, [segment.id, segment.speed, setSegmentSpeed, setSegments]);

  const handleSpeedDown = useCallback(async () => {
    const newSpeed = Math.max(0.1, segment.speed - SPEED_STEP);
    try {
      const updated = await setSegmentSpeed(segment.id, newSpeed);
      setSegments(updated);
    } catch { /* ignore */ }
  }, [segment.id, segment.speed, setSegmentSpeed, setSegments]);

  const handleSpeedPreset = useCallback(async (speed: number) => {
    try {
      const updated = await setSegmentSpeed(segment.id, speed);
      setSegments(updated);
    } catch { /* ignore */ }
  }, [segment.id, setSegmentSpeed, setSegments]);

  const handleResetSpeed = useCallback(async () => {
    try {
      const updated = await setSegmentSpeed(segment.id, 1.0);
      setSegments(updated);
    } catch { /* ignore */ }
  }, [segment.id, setSegmentSpeed, setSegments]);

  const handleDelete = useCallback(async () => {
    if (segments.length <= 1) return;
    try {
      const updated = await deleteSegment(segment.id);
      setSegments(updated);
    } catch { /* ignore */ }
  }, [segment.id, segments.length, deleteSegment, setSegments]);

  const handleDuplicate = useCallback(async () => {
    try {
      const updated = await duplicateSegment(segment.id);
      setSegments(updated);
    } catch { /* ignore */ }
  }, [segment.id, duplicateSegment, setSegments]);

  const handleSplit = useCallback(async () => {
    let accum = 0;
    for (const seg of segments) {
      const segDur = (seg.end_time - seg.start_time) / seg.speed;
      if (seg.id === segment.id && currentTime >= accum && currentTime < accum + segDur) {
        const offset = currentTime - accum;
        const sourceTime = seg.start_time + offset * seg.speed;
        if (sourceTime > seg.start_time + 0.1 && sourceTime < seg.end_time - 0.1) {
          try {
            const updated = await splitAt(seg.id, sourceTime);
            setSegments(updated);
          } catch { /* ignore */ }
        }
        return;
      }
      accum += segDur;
    }
  }, [segment.id, segments, currentTime, splitAt, setSegments]);

  return (
    <ContextMenu>
      <ContextMenuTrigger className="h-full">
        <div
          ref={segRef}
          data-segment
          data-segment-id={segment.id}
          className={cn(
            'relative flex h-full cursor-grab items-center justify-center rounded border',
            colorClass,
            isSelected ? 'border-[var(--color-segment-text)] ring-1 ring-[var(--color-segment-text)]/30' : 'border-[var(--color-segment-text)]/10',
            isDragSource && 'opacity-50',
            previewWidth !== null && 'opacity-70'
          )}
          style={{
            width: previewWidth ?? Math.max(20, width),
            minWidth: 20,
          }}
          onClick={handleClick}
        >
          {/* Trim handles */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--color-segment-text)]/20 rounded-l"
            onMouseDown={handleTrimStart}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--color-segment-text)]/20 rounded-r"
            onMouseDown={handleTrimEnd}
          />

          {/* Label */}
          <div className="flex items-center gap-1 pointer-events-none overflow-hidden px-2">
            <span className="text-[10px] font-medium text-[var(--color-segment-text)]/80 truncate">
              {index + 1}
            </span>
            {segment.speed !== 1.0 && (
              <span className="rounded bg-foreground/35 px-1 text-[9px] font-mono text-[var(--color-segment-text)]/70">
                {segment.speed}x
              </span>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={handleSpeedUp} disabled={segment.speed >= MAX_SPEED}>
          <ChevronUp className="size-4" />
          Speed Up
          <ContextMenuShortcut>{segment.speed.toFixed(2)}x</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSpeedDown} disabled={segment.speed <= 0.1}>
          <ChevronDown className="size-4" />
          Speed Down
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Gauge className="size-4" />
            Set Speed
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {SPEED_PRESETS.map((speed) => (
              <ContextMenuItem
                key={speed}
                onClick={() => handleSpeedPreset(speed)}
              >
                {speed}x
                {segment.speed === speed && (
                  <ContextMenuShortcut>current</ContextMenuShortcut>
                )}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onClick={handleResetSpeed} disabled={segment.speed === 1.0}>
          <RotateCcw className="size-4" />
          Reset Speed
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleSplit}>
          <Scissors className="size-4" />
          Split at Playhead
          <ContextMenuShortcut>K</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicate}>
          <Copy className="size-4" />
          Duplicate
          <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          variant="destructive"
          onClick={handleDelete}
          disabled={segments.length <= 1}
        >
          <Trash2 className="size-4" />
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
