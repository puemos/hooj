import { create } from 'zustand';

interface UiState {
  timelineZoom: number;
  exportDialogOpen: boolean;

  setTimelineZoom: (zoom: number) => void;
  setExportDialogOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  timelineZoom: 1,
  exportDialogOpen: false,

  setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(0.1, Math.min(10, zoom)) }),
  setExportDialogOpen: (open) => set({ exportDialogOpen: open }),
}));
