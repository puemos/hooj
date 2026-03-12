import { useEffect, useRef, useCallback } from 'react';
import { usePlaybackStore } from '@/store/playback-store';
import { useProjectStore } from '@/store/project-store';
import type { Segment } from '@/types';

/**
 * Sync <video> element with segment-aware playback.
 * Handles: jumping between segments, adjusting playbackRate per segment speed,
 * skipping deleted segments, stopping at the end, and scrub-seeking.
 */
export function useVideoSync(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const { currentTime, isPlaying, setCurrentTime, setIsPlaying } = usePlaybackStore();
  const segments = useProjectStore((s) => s.segments);
  const animFrameRef = useRef<number>(0);
  const lastSeekTimeRef = useRef<number>(-1);
  const currentTimeRef = useRef<number>(currentTime);

  // Keep ref in sync with store so playback loop can read the latest value on init
  currentTimeRef.current = currentTime;

  const findSegmentAtOutputTime = useCallback(
    (outputTime: number): { segment: Segment; offsetInSegment: number; index: number } | null => {
      let accumulated = 0;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segDuration = (seg.end_time - seg.start_time) / seg.speed;
        if (outputTime < accumulated + segDuration) {
          const offsetInSegment = outputTime - accumulated;
          return { segment: seg, offsetInSegment, index: i };
        }
        accumulated += segDuration;
      }
      return null;
    },
    [segments]
  );

  const seekToOutputTime = useCallback(
    (outputTime: number) => {
      const video = videoRef.current;
      if (!video || segments.length === 0) return;

      const found = findSegmentAtOutputTime(outputTime);
      if (found) {
        const sourceTime = found.segment.start_time + found.offsetInSegment * found.segment.speed;
        video.currentTime = sourceTime;
        video.playbackRate = found.segment.speed;
      }
    },
    [videoRef, segments, findSegmentAtOutputTime]
  );

  // Seek video when scrubbing or when time changes while paused
  useEffect(() => {
    if (isPlaying) return;
    const video = videoRef.current;
    if (!video || segments.length === 0) return;

    // Avoid redundant seeks for the same time
    if (Math.abs(currentTime - lastSeekTimeRef.current) < 0.001) return;
    lastSeekTimeRef.current = currentTime;

    seekToOutputTime(currentTime);
  }, [currentTime, isPlaying, videoRef, segments, seekToOutputTime]);

  // Playback loop — does NOT depend on currentTime to avoid restarting every frame
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying || segments.length === 0) return;

    // Find initial segment from the latest output time
    const initial = findSegmentAtOutputTime(currentTimeRef.current);
    if (!initial) {
      setIsPlaying(false);
      return;
    }

    // Seek to correct source position and set playback rate
    const sourceTime = initial.segment.start_time + initial.offsetInSegment * initial.segment.speed;
    video.currentTime = sourceTime;
    video.playbackRate = initial.segment.speed;

    let currentSegIndex = initial.index;

    const tick = () => {
      const seg = segments[currentSegIndex];
      if (!seg) {
        setIsPlaying(false);
        return;
      }

      // Dynamic tolerance: one frame of source time + buffer, so we never miss boundaries
      const tolerance = (1 / 60) * seg.speed + 0.008;

      if (video.currentTime >= seg.end_time - tolerance) {
        if (currentSegIndex < segments.length - 1) {
          // Jump to next segment
          currentSegIndex++;
          const nextSeg = segments[currentSegIndex];
          video.currentTime = nextSeg.start_time;
          video.playbackRate = nextSeg.speed;
        } else {
          // End of timeline
          const total = segments.reduce(
            (sum, s) => sum + (s.end_time - s.start_time) / s.speed,
            0
          );
          setCurrentTime(total);
          setIsPlaying(false);
          return;
        }
      }

      // Compute accurate output time from video's actual source position
      let accum = 0;
      for (let i = 0; i < currentSegIndex; i++) {
        const s = segments[i];
        accum += (s.end_time - s.start_time) / s.speed;
      }
      const sourceOffset = Math.max(
        0,
        Math.min(video.currentTime - seg.start_time, seg.end_time - seg.start_time)
      );
      setCurrentTime(accum + sourceOffset / seg.speed);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    video.play().catch(() => setIsPlaying(false));
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      video.pause();
    };
  }, [isPlaying, videoRef, segments, findSegmentAtOutputTime, setCurrentTime, setIsPlaying]);

  return { seekToOutputTime, findSegmentAtOutputTime };
}
