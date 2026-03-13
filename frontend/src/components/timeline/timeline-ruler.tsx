import { formatTime } from '@/lib/time';

interface TimelineRulerProps {
  totalDuration: number;
  pxPerSecond: number;
}

export function TimelineRuler({ totalDuration, pxPerSecond }: TimelineRulerProps) {
  let tickInterval = 1;
  if (pxPerSecond < 10) tickInterval = 60;
  else if (pxPerSecond < 30) tickInterval = 30;
  else if (pxPerSecond < 60) tickInterval = 10;
  else if (pxPerSecond < 120) tickInterval = 5;

  const ticks: { time: number; x: number }[] = [];
  for (let t = 0; t <= totalDuration; t += tickInterval) {
    ticks.push({ time: t, x: t * pxPerSecond });
  }

  return (
    <div className="relative h-5 border-b border-border pointer-events-none select-none">
      {ticks.map(({ time, x }) => (
        <div key={time} className="absolute top-0" style={{ left: x }}>
          <div className="w-px h-2 bg-ring" />
          <span className="absolute top-2 left-0.5 text-[9px] text-muted-foreground whitespace-nowrap font-mono">
            {formatTime(time)}
          </span>
        </div>
      ))}
    </div>
  );
}
