export const SPEED_STEP = 0.25;
export const MAX_SPEED = 32;

export const MIN_VOLUME = 0;
export const MAX_VOLUME = 2.0;
export const VOLUME_STEP = 0.1;

export const SEGMENT_COLORS = [
  'bg-[var(--color-segment-1)]',
  'bg-[var(--color-segment-2)]',
  'bg-[var(--color-segment-3)]',
  'bg-[var(--color-segment-4)]',
  'bg-[var(--color-segment-5)]',
  'bg-[var(--color-segment-6)]',
  'bg-[var(--color-segment-7)]',
  'bg-[var(--color-segment-8)]',
];

export const EXPORT_FORMATS = [
  { value: 'Mp4H264' as const, label: 'MP4 (H.264)', ext: '.mp4' },
  { value: 'WebmVp9' as const, label: 'WebM (VP9)', ext: '.webm' },
  { value: 'MovProres' as const, label: 'MOV (ProRes)', ext: '.mov' },
];

export const EXPORT_QUALITIES = [
  { value: 'Low' as const, label: 'Low' },
  { value: 'Medium' as const, label: 'Medium' },
  { value: 'High' as const, label: 'High' },
];

/**
 * Estimated video bitrates in bits/sec at 1080p30 for each format+quality.
 * Used for file size estimation. Scales linearly with pixel count and fps.
 */
export const ESTIMATED_BITRATES: Record<string, { video: number; audio: number }> = {
  'Mp4H264:Low':    { video: 2_000_000,   audio: 128_000 },
  'Mp4H264:Medium': { video: 5_000_000,   audio: 192_000 },
  'Mp4H264:High':   { video: 12_000_000,  audio: 320_000 },
  'WebmVp9:Low':    { video: 1_500_000,   audio: 96_000 },
  'WebmVp9:Medium': { video: 3_000_000,   audio: 192_000 },
  'WebmVp9:High':   { video: 8_000_000,   audio: 320_000 },
  'MovProres:Low':  { video: 40_000_000,  audio: 1_536_000 },
  'MovProres:Medium':{ video: 80_000_000, audio: 1_536_000 },
  'MovProres:High': { video: 120_000_000, audio: 1_536_000 },
};
