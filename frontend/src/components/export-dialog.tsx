import { useState, useMemo } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { useUiStore } from '@/store/ui-store';
import { useProjectStore } from '@/store/project-store';
import { useExportProgress } from '@/hooks/use-export-progress';
import { EXPORT_FORMATS, EXPORT_QUALITIES, ESTIMATED_BITRATES } from '@/lib/constants';
import { totalSegmentsDuration, formatTime } from '@/lib/time';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExportFormat, ExportQuality } from '@/types';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const REFERENCE_PIXELS = 1920 * 1080;
const REFERENCE_FPS = 30;

export function ExportDialog() {
  const { exportDialogOpen, setExportDialogOpen } = useUiStore();
  const segments = useProjectStore((s) => s.segments);
  const videoInfo = useProjectStore((s) => s.project?.video_info);
  const [format, setFormat] = useState<ExportFormat>('Mp4H264');
  const [quality, setQuality] = useState<ExportQuality>('Medium');
  const { progress, startExport, resetProgress } = useExportProgress();

  const totalDuration = totalSegmentsDuration(segments);

  const estimatedSize = useMemo(() => {
    if (!videoInfo || totalDuration <= 0) return null;

    const key = `${format}:${quality}`;
    const rates = ESTIMATED_BITRATES[key];
    if (!rates) return null;

    const pixels = videoInfo.width * videoInfo.height;
    const fps = videoInfo.fps || REFERENCE_FPS;
    const scale = (pixels / REFERENCE_PIXELS) * (fps / REFERENCE_FPS);

    const videoBits = rates.video * scale * totalDuration;
    const audioBits = rates.audio * totalDuration;
    return (videoBits + audioBits) / 8;
  }, [format, quality, videoInfo, totalDuration]);

  const handleExport = async () => {
    await startExport(format, quality);
  };

  const handleClose = () => {
    if (!progress.isExporting) {
      setExportDialogOpen(false);
      resetProgress();
    }
  };

  return (
    <Dialog open={exportDialogOpen} onOpenChange={(open) => !progress.isExporting && (open ? setExportDialogOpen(true) : handleClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            {segments.length} segment{segments.length !== 1 ? 's' : ''}, ~{formatTime(totalDuration)} total
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Format</label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              disabled={progress.isExporting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Quality</label>
            <Select
              value={quality}
              onValueChange={(v) => setQuality(v as ExportQuality)}
              disabled={progress.isExporting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_QUALITIES.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Size */}
          {estimatedSize != null && (
            <p className="text-xs text-muted-foreground">
              Estimated size: ~{formatFileSize(estimatedSize)}
            </p>
          )}

          {/* Progress */}
          {(progress.isExporting || progress.status) && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress.status}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={progress.isExporting}>
            Cancel
          </Button>
          {progress.outputPath && !progress.isExporting ? (
            <Button onClick={() => open(progress.outputPath!)}>
              Open file
            </Button>
          ) : (
            <Button onClick={handleExport} disabled={progress.isExporting}>
              {progress.isExporting ? 'Exporting...' : 'Export'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
