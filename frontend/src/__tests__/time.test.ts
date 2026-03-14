import { describe, it, expect } from 'vitest';
import { formatTime, formatTimePrecise, totalSegmentsDuration } from '@/lib/time';

describe('formatTime', () => {
  it('formats zero', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats seconds', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  it('formats hours', () => {
    expect(formatTime(3661)).toBe('1:01:01');
  });

  it('handles negative values', () => {
    expect(formatTime(-5)).toBe('00:00');
  });

  it('handles NaN', () => {
    expect(formatTime(NaN)).toBe('00:00');
  });

  it('handles Infinity', () => {
    expect(formatTime(Infinity)).toBe('00:00');
  });
});

describe('formatTimePrecise', () => {
  it('includes decimal', () => {
    expect(formatTimePrecise(10.5)).toBe('00:10.5');
  });

  it('handles zero', () => {
    expect(formatTimePrecise(0)).toBe('00:00.0');
  });

  it('formats with hours', () => {
    expect(formatTimePrecise(3661.3)).toBe('1:01:01.3');
  });
});

describe('totalSegmentsDuration', () => {
  it('calculates single segment', () => {
    const segments = [{ start_time: 0, end_time: 10, speed: 1.0 }];
    expect(totalSegmentsDuration(segments)).toBe(10);
  });

  it('accounts for speed', () => {
    const segments = [{ start_time: 0, end_time: 10, speed: 2.0 }];
    expect(totalSegmentsDuration(segments)).toBe(5);
  });

  it('sums multiple segments', () => {
    const segments = [
      { start_time: 0, end_time: 10, speed: 1.0 },
      { start_time: 10, end_time: 20, speed: 2.0 },
      { start_time: 20, end_time: 30, speed: 0.5 },
    ];
    // 10 + 5 + 20 = 35
    expect(totalSegmentsDuration(segments)).toBe(35);
  });

  it('returns 0 for empty array', () => {
    expect(totalSegmentsDuration([])).toBe(0);
  });
});
