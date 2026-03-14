import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@/store/project-store';
import type { Project, Segment } from '@/types';

function makeSegment(id: string, start = 0, end = 10): Segment {
  return { id, start_time: start, end_time: end, speed: 1.0, volume: 1.0 };
}

function makeProject(segments: Segment[]): Project {
  return {
    source_path: '/test/video.mp4',
    video_info: {
      duration_secs: 60,
      width: 1920,
      height: 1080,
      fps: 30,
      codec: 'h264',
      file_size_bytes: 1000000,
    },
    segments,
  };
}

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().clearProject();
  });

  it('starts with null project', () => {
    const state = useProjectStore.getState();
    expect(state.project).toBeNull();
    expect(state.segments).toEqual([]);
    expect(state.selectedSegmentId).toBeNull();
  });

  it('sets project and selects first segment', () => {
    const seg = makeSegment('s1');
    const project = makeProject([seg]);

    useProjectStore.getState().setProject(project);

    const state = useProjectStore.getState();
    expect(state.project).toEqual(project);
    expect(state.segments).toHaveLength(1);
    expect(state.selectedSegmentId).toBe('s1');
  });

  it('updates segments and preserves selection', () => {
    const seg1 = makeSegment('s1');
    const seg2 = makeSegment('s2', 10, 20);
    useProjectStore.getState().setProject(makeProject([seg1, seg2]));
    useProjectStore.getState().setSelectedSegmentId('s2');

    // Update segments (s2 still exists)
    const updated = [makeSegment('s1'), makeSegment('s2', 10, 15)];
    useProjectStore.getState().setSegments(updated);

    expect(useProjectStore.getState().selectedSegmentId).toBe('s2');
  });

  it('clears selection when selected segment is removed', () => {
    const seg1 = makeSegment('s1');
    const seg2 = makeSegment('s2', 10, 20);
    useProjectStore.getState().setProject(makeProject([seg1, seg2]));
    useProjectStore.getState().setSelectedSegmentId('s2');

    // Remove s2
    useProjectStore.getState().setSegments([seg1]);

    // Should fall back to first segment
    expect(useProjectStore.getState().selectedSegmentId).toBe('s1');
  });

  it('clears project', () => {
    useProjectStore.getState().setProject(makeProject([makeSegment('s1')]));
    useProjectStore.getState().clearProject();

    const state = useProjectStore.getState();
    expect(state.project).toBeNull();
    expect(state.segments).toEqual([]);
    expect(state.selectedSegmentId).toBeNull();
    expect(state.thumbnails).toEqual([]);
  });
});
