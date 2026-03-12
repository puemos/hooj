import { invoke, Channel } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useCallback } from 'react';
import type { Project, Segment, ExportSettings, ExportEvent, ExportFormat } from '@/types';

export const useTauri = () => {
  const importVideo = useCallback(async (path: string): Promise<Project> => {
    return invoke('import_video', { path });
  }, []);

  const getProject = useCallback(async (): Promise<Project | null> => {
    return invoke('get_project');
  }, []);

  const splitAt = useCallback(async (segmentId: string, time: number): Promise<Segment[]> => {
    return invoke('split_at', { segmentId, time });
  }, []);

  const deleteSegment = useCallback(async (segmentId: string): Promise<Segment[]> => {
    return invoke('delete_segment', { segmentId });
  }, []);

  const duplicateSegment = useCallback(async (segmentId: string): Promise<Segment[]> => {
    return invoke('duplicate_segment', { segmentId });
  }, []);

  const setSegmentSpeed = useCallback(
    async (segmentId: string, speed: number): Promise<Segment[]> => {
      return invoke('set_segment_speed', { segmentId, speed });
    },
    []
  );

  const setSegmentVolume = useCallback(
    async (segmentId: string, volume: number): Promise<Segment[]> => {
      return invoke('set_segment_volume', { segmentId, volume });
    },
    []
  );

  const reorderSegments = useCallback(async (segmentIds: string[]): Promise<Segment[]> => {
    return invoke('reorder_segments', { segmentIds });
  }, []);

  const updateSegmentBounds = useCallback(
    async (segmentId: string, start: number, end: number): Promise<Segment[]> => {
      return invoke('update_segment_bounds', { segmentId, start, end });
    },
    []
  );

  const undo = useCallback(async (): Promise<Segment[]> => {
    return invoke('undo');
  }, []);

  const redo = useCallback(async (): Promise<Segment[]> => {
    return invoke('redo');
  }, []);

  const exportVideo = useCallback(
    async (settings: ExportSettings, onProgress: Channel<ExportEvent>): Promise<void> => {
      return invoke('export_video', { settings, onProgress });
    },
    []
  );

  const generateThumbnails = useCallback(async (): Promise<string[]> => {
    return invoke('generate_thumbnails');
  }, []);

  const openVideoDialog = useCallback(async (): Promise<string | null> => {
    const result = await open({
      multiple: false,
      filters: [
        {
          name: 'Video',
          extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'ts', 'm4v'],
        },
      ],
    });
    return result as string | null;
  }, []);

  const saveExportDialog = useCallback(
    async (format: ExportFormat): Promise<string | null> => {
      const extMap: Record<ExportFormat, string> = {
        Mp4H264: 'mp4',
        WebmVp9: 'webm',
        MovProres: 'mov',
      };
      const result = await save({
        filters: [{ name: 'Video', extensions: [extMap[format]] }],
      });
      return result as string | null;
    },
    []
  );

  return {
    importVideo,
    getProject,
    splitAt,
    deleteSegment,
    duplicateSegment,
    setSegmentSpeed,
    setSegmentVolume,
    reorderSegments,
    updateSegmentBounds,
    undo,
    redo,
    exportVideo,
    generateThumbnails,
    openVideoDialog,
    saveExportDialog,
  };
};
