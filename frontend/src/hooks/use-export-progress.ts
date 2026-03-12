import { useState, useCallback } from 'react';
import { Channel } from '@tauri-apps/api/core';
import { useTauri } from '@/hooks/use-tauri';
import type { ExportSettings, ExportEvent, ExportFormat, ExportQuality } from '@/types';

interface ExportProgress {
  isExporting: boolean;
  percent: number;
  currentSegment: number;
  totalSegments: number;
  status: string;
  outputPath: string | null;
}

export function useExportProgress() {
  const { exportVideo, saveExportDialog } = useTauri();
  const [progress, setProgress] = useState<ExportProgress>({
    isExporting: false,
    percent: 0,
    currentSegment: 0,
    totalSegments: 0,
    status: '',
    outputPath: null,
  });

  const startExport = useCallback(
    async (format: ExportFormat, quality: ExportQuality) => {
      const outputPath = await saveExportDialog(format);
      if (!outputPath) return;

      const settings: ExportSettings = { format, quality, output_path: outputPath };

      const channel = new Channel<ExportEvent>();
      channel.onmessage = (event) => {
        switch (event.type) {
          case 'Progress':
            setProgress((p) => ({
              ...p,
              isExporting: true,
              percent: event.percent,
              currentSegment: event.current_segment,
              totalSegments: event.total_segments,
              status: `Processing segment ${event.current_segment} of ${event.total_segments}...`,
            }));
            break;
          case 'SegmentDone':
            break;
          case 'Concatenating':
            setProgress((p) => ({
              ...p,
              status: 'Concatenating segments...',
              percent: 95,
            }));
            break;
          case 'Done':
            setProgress({
              isExporting: false,
              percent: 100,
              currentSegment: 0,
              totalSegments: 0,
              status: 'Export complete!',
              outputPath,
            });
            break;
          case 'Error':
            setProgress({
              isExporting: false,
              percent: 0,
              currentSegment: 0,
              totalSegments: 0,
              status: `Error: ${event.message}`,
              outputPath: null,
            });
            break;
        }
      };

      setProgress({
        isExporting: true,
        percent: 0,
        currentSegment: 0,
        totalSegments: 0,
        status: 'Starting export...',
        outputPath: null,
      });

      try {
        await exportVideo(settings, channel);
      } catch (err) {
        setProgress({
          isExporting: false,
          percent: 0,
          currentSegment: 0,
          totalSegments: 0,
          status: `Error: ${err}`,
          outputPath: null,
        });
      }
    },
    [exportVideo, saveExportDialog]
  );

  const resetProgress = useCallback(() => {
    setProgress({
      isExporting: false,
      percent: 0,
      currentSegment: 0,
      totalSegments: 0,
      status: '',
      outputPath: null,
    });
  }, []);

  return { progress, startExport, resetProgress };
}
