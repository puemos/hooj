import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaybackStore } from '@/store/playback-store';

describe('usePlaybackStore', () => {
  beforeEach(() => {
    usePlaybackStore.setState({ currentTime: 0, isPlaying: false });
  });

  it('starts with defaults', () => {
    const state = usePlaybackStore.getState();
    expect(state.currentTime).toBe(0);
    expect(state.isPlaying).toBe(false);
  });

  it('sets current time', () => {
    usePlaybackStore.getState().setCurrentTime(42.5);
    expect(usePlaybackStore.getState().currentTime).toBe(42.5);
  });

  it('toggles playback', () => {
    expect(usePlaybackStore.getState().isPlaying).toBe(false);

    usePlaybackStore.getState().togglePlayback();
    expect(usePlaybackStore.getState().isPlaying).toBe(true);

    usePlaybackStore.getState().togglePlayback();
    expect(usePlaybackStore.getState().isPlaying).toBe(false);
  });

  it('sets playing state directly', () => {
    usePlaybackStore.getState().setIsPlaying(true);
    expect(usePlaybackStore.getState().isPlaying).toBe(true);

    usePlaybackStore.getState().setIsPlaying(false);
    expect(usePlaybackStore.getState().isPlaying).toBe(false);
  });
});
