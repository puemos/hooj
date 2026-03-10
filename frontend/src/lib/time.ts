/** Format seconds to MM:SS or HH:MM:SS */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/** Format seconds with decimal precision */
export function formatTimePrecise(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00.0';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(Math.floor(s))}.${Math.floor((s % 1) * 10)}`;
  }
  return `${pad(m)}:${pad(Math.floor(s))}.${Math.floor((s % 1) * 10)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Calculate total duration of segments (accounting for speed) */
export function totalSegmentsDuration(
  segments: { start_time: number; end_time: number; speed: number }[]
): number {
  return segments.reduce((sum, s) => sum + (s.end_time - s.start_time) / s.speed, 0);
}

/** Convert output timeline position to the source time within the active segment */
export function outputTimeToSourceTime(
  outputTime: number,
  segments: { id: string; start_time: number; end_time: number; speed: number }[]
): { segmentId: string; sourceTime: number } | null {
  let accum = 0;
  for (const seg of segments) {
    const segDur = (seg.end_time - seg.start_time) / seg.speed;
    if (outputTime < accum + segDur + 0.0001) {
      const offset = Math.max(0, outputTime - accum);
      return { segmentId: seg.id, sourceTime: seg.start_time + offset * seg.speed };
    }
    accum += segDur;
  }
  return null;
}

/** Convert a source time within a specific segment back to output timeline position */
export function sourceTimeToOutputTime(
  segmentId: string,
  sourceTime: number,
  segments: { id: string; start_time: number; end_time: number; speed: number }[]
): number {
  let accum = 0;
  for (const seg of segments) {
    if (seg.id === segmentId) {
      const sourceOffset = Math.max(0, sourceTime - seg.start_time);
      return accum + sourceOffset / seg.speed;
    }
    accum += (seg.end_time - seg.start_time) / seg.speed;
  }
  return accum;
}
