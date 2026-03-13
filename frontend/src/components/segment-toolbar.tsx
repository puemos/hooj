import { useCallback, useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { usePlaybackStore } from '@/store/playback-store';
import { useTauri } from '@/hooks/use-tauri';
import { SPEED_STEP, MAX_SPEED } from '@/lib/constants';
import { outputTimeToSourceTime, sourceTimeToOutputTime } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Scissors, Copy, Trash2, Minus, Plus } from 'lucide-react';

export function SegmentToolbar() {
  const { segments, selectedSegmentId, setSegments } = useProjectStore();
  const { currentTime, setCurrentTime } = usePlaybackStore();
  const { splitAt, deleteSegment, duplicateSegment, setSegmentSpeed, setSegmentVolume } = useTauri();

  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);
  const [speedInput, setSpeedInput] = useState('');

  const handleSplit = useCallback(async () => {
    if (!selectedSegment) return;
    let accum = 0;
    for (const seg of segments) {
      const segDur = (seg.end_time - seg.start_time) / seg.speed;
      if (currentTime < accum + segDur) {
        const offset = currentTime - accum;
        const sourceTime = seg.start_time + offset * seg.speed;
        if (sourceTime > seg.start_time + 0.1 && sourceTime < seg.end_time - 0.1) {
          try {
            const updated = await splitAt(seg.id, sourceTime);
            setSegments(updated);
          } catch { /* ignore */ }
        }
        return;
      }
      accum += segDur;
    }
  }, [selectedSegment, segments, currentTime, splitAt, setSegments]);

  const handleDelete = useCallback(async () => {
    if (!selectedSegmentId || segments.length <= 1) return;
    try {
      const updated = await deleteSegment(selectedSegmentId);
      setSegments(updated);
    } catch { /* ignore */ }
  }, [selectedSegmentId, segments.length, deleteSegment, setSegments]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedSegmentId) return;
    try {
      const updated = await duplicateSegment(selectedSegmentId);
      setSegments(updated);
    } catch { /* ignore */ }
  }, [selectedSegmentId, duplicateSegment, setSegments]);

  const handleSpeedChange = useCallback(
    async (newSpeed: number) => {
      if (!selectedSegment || newSpeed <= 0) return;
      try {
        // Capture which source frame the playhead is on before the speed change
        const sourceInfo = outputTimeToSourceTime(currentTime, segments);
        const updated = await setSegmentSpeed(selectedSegment.id, newSpeed);
        // Adjust playhead so it stays on the same source frame
        if (sourceInfo) {
          const adjustedTime = sourceTimeToOutputTime(sourceInfo.segmentId, sourceInfo.sourceTime, updated);
          setCurrentTime(adjustedTime);
        }
        setSegments(updated);
      } catch { /* ignore */ }
    },
    [selectedSegment, currentTime, segments, setSegmentSpeed, setSegments, setCurrentTime]
  );

  const handleSpeedInputSubmit = useCallback(() => {
    const val = parseFloat(speedInput);
    if (!isNaN(val) && val > 0) {
      handleSpeedChange(val);
    }
    setSpeedInput('');
  }, [speedInput, handleSpeedChange]);

  const handleVolumeChange = useCallback(
    async (value: number[]) => {
      if (!selectedSegment) return;
      try {
        const updated = await setSegmentVolume(selectedSegment.id, value[0]);
        setSegments(updated);
      } catch { /* ignore */ }
    },
    [selectedSegment, setSegmentVolume, setSegments]
  );

  if (!selectedSegment) {
    return (
      <div className="flex h-10 items-center border-y border-border bg-muted/30 px-4">
        <span className="text-xs text-muted-foreground">No segment selected</span>
      </div>
    );
  }

  const segIndex = segments.findIndex((s) => s.id === selectedSegmentId);

  return (
    <div className="flex h-10 items-center gap-2 border-y border-border bg-muted/30 px-3">
      <span className="text-xs font-medium text-muted-foreground">
        Seg {segIndex + 1}
      </span>

      <Separator orientation="vertical" className="h-4" />

      {/* Speed */}
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground">Speed</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleSpeedChange(selectedSegment.speed - SPEED_STEP)}
          disabled={selectedSegment.speed <= 0.1}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          className="w-14 h-6 text-center text-xs font-mono px-1"
          value={speedInput || `${selectedSegment.speed.toFixed(2)}x`}
          onChange={(e) => setSpeedInput(e.target.value)}
          onBlur={handleSpeedInputSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleSpeedInputSubmit()}
          onFocus={(e) => {
            setSpeedInput(selectedSegment.speed.toFixed(2));
            e.target.select();
          }}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleSpeedChange(selectedSegment.speed + SPEED_STEP)}
          disabled={selectedSegment.speed >= MAX_SPEED}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* Volume */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">Vol</span>
        <Slider
          value={[selectedSegment.volume]}
          onValueChange={handleVolumeChange}
          min={0}
          max={2}
          step={0.05}
          className="w-16"
        />
        <span className="w-7 text-[11px] font-mono text-muted-foreground">
          {Math.round(selectedSegment.volume * 100)}%
        </span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* Actions */}
      <Button variant="ghost" size="xs" onClick={handleSplit} title="Split at playhead (K)">
        <Scissors className="h-3 w-3" />
        <span>Split</span>
      </Button>
      <Button variant="ghost" size="xs" onClick={handleDuplicate} title="Duplicate (Ctrl+D)">
        <Copy className="h-3 w-3" />
        <span>Dup</span>
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={handleDelete}
        disabled={segments.length <= 1}
        className="text-destructive hover:text-destructive/80"
        title="Delete (Del)"
      >
        <Trash2 className="h-3 w-3" />
        <span>Del</span>
      </Button>
    </div>
  );
}
