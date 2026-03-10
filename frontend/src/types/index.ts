export interface VideoInfo {
  duration_secs: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  file_size_bytes: number;
}

export interface Segment {
  id: string;
  start_time: number;
  end_time: number;
  speed: number;
  volume: number;
}

export interface Project {
  source_path: string;
  video_info: VideoInfo;
  segments: Segment[];
}

export interface ExportSettings {
  format: ExportFormat;
  quality: ExportQuality;
  output_path: string;
}

export type ExportFormat = 'Mp4H264' | 'WebmVp9' | 'MovProres';

export type ExportQuality = 'Low' | 'Medium' | 'High';

export type ExportEvent =
  | { type: 'Progress'; percent: number; current_segment: number; total_segments: number }
  | { type: 'SegmentDone'; index: number }
  | { type: 'Concatenating' }
  | { type: 'Done' }
  | { type: 'Error'; message: string };
