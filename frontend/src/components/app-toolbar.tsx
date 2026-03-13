import { useCallback } from 'react';
import { useTauri } from '@/hooks/use-tauri';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Import, Undo2, Redo2, Download } from 'lucide-react';

export function AppToolbar() {
  const { openVideoDialog, importVideo, undo, redo, generateThumbnails } = useTauri();
  const { project, setProject, setSegments, setThumbnails } = useProjectStore();
  const setExportDialogOpen = useUiStore((s) => s.setExportDialogOpen);

  const handleImport = useCallback(async () => {
    const path = await openVideoDialog();
    if (!path) return;
    try {
      const proj = await importVideo(path);
      setProject(proj);
      try {
        const thumbs = await generateThumbnails();
        setThumbnails(thumbs);
      } catch { /* optional */ }
    } catch (err) {
      console.error('Import failed:', err);
    }
  }, [openVideoDialog, importVideo, setProject, generateThumbnails, setThumbnails]);

  const handleUndo = useCallback(async () => {
    try {
      const updated = await undo();
      setSegments(updated);
    } catch { /* nothing to undo */ }
  }, [undo, setSegments]);

  const handleRedo = useCallback(async () => {
    try {
      const updated = await redo();
      setSegments(updated);
    } catch { /* nothing to redo */ }
  }, [redo, setSegments]);

  return (
    <div data-tauri-drag-region className="flex h-11 items-center gap-1 border-b border-border bg-background pl-20 pr-3 shadow-xs">
      <Button variant="ghost" size="sm" onClick={handleImport}>
        <Import className="h-4 w-4" />
        Import
      </Button>

      {project && (
        <>
          <Separator orientation="vertical" className="mx-1 h-4" />

          <Button variant="ghost" size="icon" onClick={handleUndo} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={handleRedo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          <Button variant="success" size="sm" onClick={() => setExportDialogOpen(true)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </>
      )}
    </div>
  );
}
