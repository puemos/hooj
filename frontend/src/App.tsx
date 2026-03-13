import { useProjectStore } from '@/store/project-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { AppToolbar } from '@/components/app-toolbar';
import { VideoPreview } from '@/components/video-preview';
import { SegmentToolbar } from '@/components/segment-toolbar';
import { Timeline } from '@/components/timeline/timeline';
import { ExportDialog } from '@/components/export-dialog';
import { EmptyState } from '@/components/empty-state';

export default function App() {
  useKeyboardShortcuts();
  const project = useProjectStore((s) => s.project);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground select-none">
      <AppToolbar />
      {project ? (
        <>
          <div className="flex-1 flex flex-col min-h-0">
            <VideoPreview />
            <SegmentToolbar />
            <Timeline />
          </div>
        </>
      ) : (
        <EmptyState />
      )}
      <ExportDialog />
    </div>
  );
}
