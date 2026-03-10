import { create } from 'zustand';

interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  isScrubbing: boolean;

  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsScrubbing: (scrubbing: boolean) => void;
  togglePlayback: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentTime: 0,
  isPlaying: false,
  isScrubbing: false,

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsScrubbing: (scrubbing) => set({ isScrubbing: scrubbing }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
