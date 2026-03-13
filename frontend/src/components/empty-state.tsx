import { useState, useCallback, useMemo } from 'react';
import { useTauri } from '@/hooks/use-tauri';
import { useProjectStore } from '@/store/project-store';
import { Button } from '@/components/ui/button';

function getRecentVideos(): string[] {
  try {
    const stored = localStorage.getItem('hooj:recent-videos');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function EmptyState() {
  const { openVideoDialog, importVideo, generateThumbnails } = useTauri();
  const setProject = useProjectStore((s) => s.setProject);
  const setThumbnails = useProjectStore((s) => s.setThumbnails);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recentVideos = useMemo(getRecentVideos, []);

  const handleImport = useCallback(
    async (path: string) => {
      setIsLoading(true);
      try {
        const project = await importVideo(path);
        setProject(project);
        try {
          const thumbs = await generateThumbnails();
          setThumbnails(thumbs);
        } catch {
          // Thumbnails are optional
        }
      } catch (err) {
        console.error('Import failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [importVideo, setProject, generateThumbnails, setThumbnails]
  );

  const handleClick = useCallback(async () => {
    const path = await openVideoDialog();
    if (path) handleImport(path);
  }, [openVideoDialog, handleImport]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        const path = (file as unknown as { path?: string }).path ?? file.name;
        if (path) handleImport(path);
      }
    },
    [handleImport]
  );

  return (
    <div
      className="flex-1 flex items-center justify-center"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div
        className={`flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed p-16 transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background'
        }`}
      >
        <svg
          className="h-16 w-16"
          viewBox="0 0 1024 1024"
        >
          <path d="M 962.0,512.0 L 961.13,689.72 L 958.52,746.05 L 954.15,786.37 L 947.97,818.44 L 939.94,845.09 L 929.98,867.72 L 917.96,887.11 L 903.75,903.75 L 887.11,917.96 L 867.72,929.98 L 845.09,939.94 L 818.44,947.97 L 786.37,954.15 L 746.05,958.52 L 689.72,961.13 L 512.0,962.0 L 334.28,961.13 L 277.95,958.52 L 237.63,954.15 L 205.56,947.97 L 178.91,939.94 L 156.28,929.98 L 136.89,917.96 L 120.25,903.75 L 106.04,887.11 L 94.02,867.72 L 84.06,845.09 L 76.03,818.44 L 69.85,786.37 L 65.48,746.05 L 62.87,689.72 L 62.0,512.0 L 62.87,334.28 L 65.48,277.95 L 69.85,237.63 L 76.03,205.56 L 84.06,178.91 L 94.02,156.28 L 106.04,136.89 L 120.25,120.25 L 136.89,106.04 L 156.28,94.02 L 178.91,84.06 L 205.56,76.03 L 237.63,69.85 L 277.95,65.48 L 334.28,62.87 L 512.0,62.0 L 689.72,62.87 L 746.05,65.48 L 786.37,69.85 L 818.44,76.03 L 845.09,84.06 L 867.72,94.02 L 887.11,106.04 L 903.75,120.25 L 917.96,136.89 L 929.98,156.28 L 939.94,178.91 L 947.97,205.56 L 954.15,237.63 L 958.52,277.95 L 961.13,334.28 Z" fill="currentColor" className="text-foreground"/>
          <text x="512" y="600" fontFamily="-apple-system, SF Pro Display, Helvetica Neue, Arial, sans-serif" fontWeight="800" fontSize="280" fill="var(--color-tooltip-foreground)" textAnchor="middle">Hooj</text>
        </svg>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            {recentVideos.length > 0 ? 'Welcome back' : 'Import a video to start editing'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLoading ? 'Loading...' : recentVideos.length > 0 ? 'Open a recent video or import a new one' : 'or drag & drop a video file here'}
          </p>
        </div>

        {recentVideos.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent</p>
            <ul className="flex flex-col rounded-lg border border-border overflow-hidden">
              {recentVideos.map((videoPath, i) => {
                const parts = videoPath.split('/');
                const fileName = parts.pop() ?? videoPath;
                const dir = parts.join('/');
                return (
                  <li key={videoPath}>
                    <button
                      onClick={() => handleImport(videoPath)}
                      disabled={isLoading}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-50 ${
                        i > 0 ? 'border-t border-border' : ''
                      }`}
                    >
                      <svg
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                        />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{fileName}</p>
                        <p className="truncate text-xs text-muted-foreground">{dir}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Button onClick={handleClick} disabled={isLoading}>
          {isLoading ? 'Importing...' : 'Import Video'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Supports MP4, MKV, AVI, MOV, WebM, and more
        </p>
      </div>
    </div>
  );
}
