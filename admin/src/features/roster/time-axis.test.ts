import { describe, expect, it } from 'vitest';

import {
  coverageBuckets,
  dayWindow,
  daySegments,
  laneCount,
  minutesToHm,
  peakStaffed,
  snapMinutes,
  type AxisShift,
} from './time-axis';

/** ACST is UTC+9:30 in winter, so 06:00 ACST is 20:30 UTC the day before. */
const acst = (ymd: string, hm: string) => `${ymd}T${hm}:00+09:30`;

function shift(over: Partial<AxisShift> & Pick<AxisShift, 'id' | 'starts_at' | 'ends_at'>): AxisShift {
  return {
    site_id: 'site-a',
    worker_id: 'worker-1',
    status: 'assigned',
    ...over,
  };
}

describe('dayWindow', () => {
  it('measures an ordinary ACST day as 1440 minutes', () => {
    expect(dayWindow('2026-07-29').lengthMin).toBe(1440);
  });

  it('measures the October DST start as a 23-hour day', () => {
    // South Australia springs forward on the first Sunday of October.
    expect(dayWindow('2026-10-04').lengthMin).toBe(1380);
  });

  it('measures the April DST end as a 25-hour day', () => {
    // …and falls back on the first Sunday of April.
    expect(dayWindow('2026-04-05').lengthMin).toBe(1500);
  });
});

describe('daySegments', () => {
  it('places a same-day shift at its true offset and duration', () => {
    const [seg] = daySegments(
      [shift({ id: 's1', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '14:00') })],
      '2026-07-29',
    );
    expect(seg).toMatchObject({ startMin: 360, endMin: 840, continuesLeft: false, continuesRight: false });
  });

  it('clips a night shift to the day it starts on and flags the wrap', () => {
    const night = shift({
      id: 'night',
      starts_at: acst('2026-07-29', '22:00'),
      ends_at: acst('2026-07-30', '06:00'),
    });
    const [seg] = daySegments([night], '2026-07-29');
    expect(seg).toMatchObject({ startMin: 1320, endMin: 1440, continuesLeft: false, continuesRight: true });
  });

  it('returns the continuation of that same night shift on the following day', () => {
    const night = shift({
      id: 'night',
      starts_at: acst('2026-07-29', '22:00'),
      ends_at: acst('2026-07-30', '06:00'),
    });
    const [seg] = daySegments([night], '2026-07-30');
    expect(seg).toMatchObject({ startMin: 0, endMin: 360, continuesLeft: true, continuesRight: false });
  });

  it('excludes a shift that ends exactly at midnight from the next day', () => {
    const s = shift({
      id: 'to-midnight',
      starts_at: acst('2026-07-29', '16:00'),
      ends_at: acst('2026-07-30', '00:00'),
    });
    expect(daySegments([s], '2026-07-29')).toHaveLength(1);
    expect(daySegments([s], '2026-07-30')).toHaveLength(0);
  });

  it('excludes a shift from a day it does not touch', () => {
    const s = shift({ id: 's', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '14:00') });
    expect(daySegments([s], '2026-07-30')).toHaveLength(0);
  });
});

describe('lane packing', () => {
  it('keeps non-overlapping shifts in one lane', () => {
    const segs = daySegments(
      [
        shift({ id: 'a', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '14:00') }),
        shift({ id: 'b', starts_at: acst('2026-07-29', '15:00'), ends_at: acst('2026-07-29', '22:00') }),
      ],
      '2026-07-29',
    );
    expect(segs.every((s) => s.lane === 0)).toBe(true);
    expect(laneCount(segs, 'site-a')).toBe(1);
  });

  it('treats a back-to-back handover as one lane, not an overlap', () => {
    const segs = daySegments(
      [
        shift({ id: 'a', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '14:00') }),
        shift({ id: 'b', starts_at: acst('2026-07-29', '14:00'), ends_at: acst('2026-07-29', '22:00') }),
      ],
      '2026-07-29',
    );
    expect(laneCount(segs, 'site-a')).toBe(1);
  });

  it('stacks genuinely overlapping shifts into separate lanes', () => {
    const segs = daySegments(
      [
        shift({ id: 'a', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '14:00') }),
        shift({ id: 'b', starts_at: acst('2026-07-29', '10:00'), ends_at: acst('2026-07-29', '18:00') }),
        shift({ id: 'c', starts_at: acst('2026-07-29', '12:00'), ends_at: acst('2026-07-29', '13:00') }),
      ],
      '2026-07-29',
    );
    expect(laneCount(segs, 'site-a')).toBe(3);
  });

  it('packs each site independently', () => {
    const segs = daySegments(
      [
        shift({ id: 'a', site_id: 'site-a', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '14:00') }),
        shift({ id: 'b', site_id: 'site-b', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '14:00') }),
      ],
      '2026-07-29',
    );
    expect(laneCount(segs, 'site-a')).toBe(1);
    expect(laneCount(segs, 'site-b')).toBe(1);
  });
});

describe('coverageBuckets', () => {
  it('produces 48 half-hour buckets for an ordinary day', () => {
    expect(coverageBuckets([], '2026-07-29')).toHaveLength(48);
  });

  it('counts a staffed shift across exactly the buckets it spans', () => {
    const buckets = coverageBuckets(
      [shift({ id: 'a', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '08:00') })],
      '2026-07-29',
    );
    // 06:00–08:00 is buckets 12..15; 16 (08:00) must stay clear.
    expect(buckets.slice(12, 16).every((b) => b.staffed === 1)).toBe(true);
    expect(buckets[11]!.staffed).toBe(0);
    expect(buckets[16]!.staffed).toBe(0);
  });

  it('separates unfilled shifts from staffed ones', () => {
    const buckets = coverageBuckets(
      [
        shift({ id: 'a', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '08:00') }),
        shift({ id: 'b', worker_id: null, status: 'open', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '08:00') }),
      ],
      '2026-07-29',
    );
    expect(buckets[12]).toMatchObject({ staffed: 1, unfilled: 1 });
  });

  it('ignores cancelled shifts', () => {
    const buckets = coverageBuckets(
      [shift({ id: 'a', status: 'cancelled', starts_at: acst('2026-07-29', '06:00'), ends_at: acst('2026-07-29', '08:00') })],
      '2026-07-29',
    );
    expect(peakStaffed(buckets)).toBe(0);
  });

  it('counts the tail of a night shift on the following day', () => {
    const buckets = coverageBuckets(
      [shift({ id: 'n', starts_at: acst('2026-07-29', '22:00'), ends_at: acst('2026-07-30', '06:00') })],
      '2026-07-30',
    );
    expect(buckets[0]!.staffed).toBe(1);
    expect(buckets[11]!.staffed).toBe(1);
    expect(buckets[12]!.staffed).toBe(0);
  });
});

describe('snapping', () => {
  const win = dayWindow('2026-07-29');

  it('snaps to the nearest 30-minute slot', () => {
    expect(snapMinutes(371, 30, win.lengthMin)).toBe(360);
    expect(snapMinutes(376, 30, win.lengthMin)).toBe(390);
  });

  it('clamps inside the day', () => {
    expect(snapMinutes(-40, 30, win.lengthMin)).toBe(0);
    expect(snapMinutes(2000, 30, win.lengthMin)).toBe(win.lengthMin);
  });

  it('renders a minute offset as an ACST HH:mm the create dialog accepts', () => {
    expect(minutesToHm(win, 360)).toBe('06:00');
    expect(minutesToHm(win, 810)).toBe('13:30');
  });
});
