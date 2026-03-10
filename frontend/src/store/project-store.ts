import { create } from 'zustand';
import type { Project, Segment } from '@/types';

interface ProjectState {
  project: Project | null;
  segments: Segment[];
  selectedSegmentId: string | null;
  thumbnails: string[];

  setProject: (project: Project) => void;
  setSegments: (segments: Segment[]) => void;
  setSelectedSegmentId: (id: string | null) => void;
  setThumbnails: (thumbnails: string[]) => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  segments: [],
  selectedSegmentId: null,
  thumbnails: [],

  setProject: (project) => {
    try {
      const stored = localStorage.getItem('hooj:recent-videos');
      const recent: string[] = stored ? JSON.parse(stored) : [];
      const updated = [project.source_path, ...recent.filter((p) => p !== project.source_path)].slice(0, 5);
      localStorage.setItem('hooj:recent-videos', JSON.stringify(updated));
    } catch {}
    set({
      project,
      segments: project.segments,
      selectedSegmentId: project.segments[0]?.id ?? null,
    });
  },

  setSegments: (segments) =>
    set((state) => ({
      segments,
      // If selected segment was removed, clear selection
      selectedSegmentId:
        state.selectedSegmentId && segments.some((s) => s.id === state.selectedSegmentId)
          ? state.selectedSegmentId
          : segments[0]?.id ?? null,
    })),

  setSelectedSegmentId: (id) => set({ selectedSegmentId: id }),
  setThumbnails: (thumbnails) => set({ thumbnails }),
  clearProject: () =>
    set({ project: null, segments: [], selectedSegmentId: null, thumbnails: [] }),
}));
