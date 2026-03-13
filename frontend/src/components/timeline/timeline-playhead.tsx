import { useCallback } from 'react';

interface TimelinePlayheadProps {
  currentTime: number;
  pxPerSecond: number;
  totalDuration: number;
  height: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSeek: (time: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}

export function TimelinePlayhead({
  currentTime,
  pxPerSecond,
  totalDuration,
  height,
  containerRef,
  onSeek,
  onScrubStart,
  onScrubEnd,
}: TimelinePlayheadProps) {
  const x = currentTime * pxPerSecond;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onScrubStart();

      const onMove = (ev: MouseEvent) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mouseX = ev.clientX - rect.left + container.scrollLeft;
        const time = Math.max(0, Math.min(totalDuration, mouseX / pxPerSecond));
        onSeek(time);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        onScrubEnd();
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [containerRef, pxPerSecond, totalDuration, onSeek, onScrubStart, onScrubEnd]
  );

  return (
    <div
      data-playhead
      className="absolute top-0 z-10 group"
      style={{ left: x, height }}
    >
      {/* Grab handle - wider hit area */}
      <div
        className="absolute -left-3 top-0 w-6 h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      />
      {/* Triangle head */}
      <div className="relative -left-[5px] w-[10px] h-[10px] bg-[var(--color-playhead)] rounded-sm pointer-events-none"
        style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
      />
      {/* Line */}
      <div className="w-px bg-[var(--color-playhead)] pointer-events-none" style={{ height: height - 10 }} />
    </div>
  );
}
