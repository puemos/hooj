import { useRef, useCallback } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useProjectStore } from '@/store/project-store';
import { usePlaybackStore } from '@/store/playback-store';
import { useVideoSync } from '@/hooks/use-video-sync';
import { formatTimePrecise } from '@/lib/time';
import { totalSegmentsDuration } from '@/lib/time';
import { Play } from 'lucide-react';

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const project = useProjectStore((s) => s.project);
  const segments = useProjectStore((s) => s.segments);
  const { currentTime, isPlaying, setIsPlaying } = usePlaybackStore();
  const { seekToOutputTime } = useVideoSync(videoRef);

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      seekToOutputTime(currentTime);
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, setIsPlaying, seekToOutputTime]);

  if (!project) return null;

  const videoSrc = convertFileSrc(project.source_path);
  const totalDuration = totalSegmentsDuration(segments);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-background p-4 min-h-0">
      <div className="relative flex items-center justify-center max-h-full max-w-full min-h-0">
        <video
          ref={videoRef}
          src={videoSrc}
          className="max-h-full max-w-full rounded-lg"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
          onClick={handlePlayPause}
          preload="auto"
        />

        {!isPlaying && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg transition-opacity hover:bg-black/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm">
              <Play className="h-5 w-5 ml-0.5" />
            </div>
          </button>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground tabular-nums font-mono">
        {formatTimePrecise(currentTime)} / {formatTimePrecise(totalDuration)}
      </div>
    </div>
  );
}
