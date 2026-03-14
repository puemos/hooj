import { describe, it, expect } from 'vitest';
import { SEGMENT_COLORS, EXPORT_FORMATS, SPEED_STEP } from '@/lib/constants';

describe('constants', () => {
  it('has segment colors', () => {
    expect(SEGMENT_COLORS.length).toBeGreaterThan(0);
    SEGMENT_COLORS.forEach((c) => expect(c).toMatch(/^bg-/));
  });

  it('has export formats', () => {
    expect(EXPORT_FORMATS).toHaveLength(3);
    const values = EXPORT_FORMATS.map((f) => f.value);
    expect(values).toContain('Mp4H264');
    expect(values).toContain('WebmVp9');
    expect(values).toContain('MovProres');
  });

  it('has valid speed step', () => {
    expect(SPEED_STEP).toBe(0.25);
    expect(SPEED_STEP).toBeGreaterThan(0);
  });
});
