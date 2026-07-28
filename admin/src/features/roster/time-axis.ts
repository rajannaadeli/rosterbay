import { formatACST } from '@/lib/format';
import { acstMidnight } from '@/lib/week';

/**
 * Pure geometry for the roster time axis.
 *
 * Everything the day view draws — bar position, midnight wraps, overlap lanes,
 * the coverage histogram — is computed here and nowhere else, so it can be
 * tested without a DOM and reused by the ribbon and the week micro-track.
 *
 * Two rules this module exists to enforce:
 *
 *  1. **A day is not always 1440 minutes.** South Australia observes daylight
 *     saving (ACST +9:30 / ACDT +10:30), so the October and April transition
 *     days are 23 and 25 hours. Every position here is a fraction of the *real*
 *     length of that ACST day, which is why `dayWindow()` measures it rather
 *     than assuming it. Assuming 1440 would shift every bar on those two days.
 *
 *  2. **Shifts are clipped to the day, not bucketed by start date.** A
 *     22:00–06:00 night shift belongs to two columns. `daySegments()` returns
 *     one segment per day it touches, each flagged so the renderer can draw
 *     the chevron caps.
 */

/** Minimal shape the axis needs — avoids dragging the full row type around. */
export interface AxisShift {
  id: string;
  site_id: string;
  starts_at: string;
  ends_at: string;
  worker_id: string | null;
  status: string;
}

export interface DayWindow {
  /** ACST calendar date, `yyyy-MM-dd`. */
  ymd: string;
  /** UTC epoch ms of 00:00 ACST. */
  startMs: number;
  /** UTC epoch ms of 00:00 ACST the following day. */
  endMs: number;
  /** Real length of this ACST day in minutes — 1440, or 1380/1500 on a DST day. */
  lengthMin: number;
}

/**
 * The next calendar date, by pure arithmetic on the date parts.
 *
 * Deliberately not `addDays` on an instant: adding 24 hours to ACST midnight
 * on the April fall-back day lands at 23:00 the *same* date, so the window
 * would measure zero. Calendar arithmetic has no clock to get wrong.
 */
function nextCalendarDay(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/** The [00:00, 24:00) ACST window for a calendar date, measured not assumed. */
export function dayWindow(ymd: string): DayWindow {
  const startMs = acstMidnight(ymd).getTime();
  const endMs = acstMidnight(nextCalendarDay(ymd)).getTime();
  return { ymd, startMs, endMs, lengthMin: Math.round((endMs - startMs) / 60_000) };
}

/** Minutes from the start of `win` to `iso`. Negative before, > length after. */
export function minutesInto(win: DayWindow, iso: string): number {
  return (new Date(iso).getTime() - win.startMs) / 60_000;
}

/** Minutes since ACST midnight for a moment — used to place the "now" line. */
export function minutesIntoToday(now: Date = new Date()): number {
  const win = dayWindow(formatACST(now, 'yyyy-MM-dd'));
  return (now.getTime() - win.startMs) / 60_000;
}

export interface DaySegment {
  shift: AxisShift;
  /** Minutes from day start where the drawn bar begins (clamped to 0). */
  startMin: number;
  /** Minutes from day start where it ends (clamped to the day length). */
  endMin: number;
  /** The shift began before this day — draw a leading chevron. */
  continuesLeft: boolean;
  /** The shift runs past this day — draw a trailing chevron. */
  continuesRight: boolean;
  /** Overlap lane index within its site row, 0-based. */
  lane: number;
}

/**
 * Every shift touching `ymd`, clipped to that day and packed into lanes.
 *
 * Segments are returned per site in the order the caller supplied sites; the
 * renderer groups by `shift.site_id`.
 */
export function daySegments(shifts: readonly AxisShift[], ymd: string): DaySegment[] {
  const win = dayWindow(ymd);

  const clipped: Omit<DaySegment, 'lane'>[] = [];
  for (const shift of shifts) {
    const rawStart = minutesInto(win, shift.starts_at);
    const rawEnd = minutesInto(win, shift.ends_at);
    // Half-open: a shift ending exactly at midnight belongs to the day before.
    if (rawEnd <= 0 || rawStart >= win.lengthMin) continue;
    clipped.push({
      shift,
      startMin: Math.max(0, rawStart),
      endMin: Math.min(win.lengthMin, rawEnd),
      continuesLeft: rawStart < 0,
      continuesRight: rawEnd > win.lengthMin,
    });
  }

  return packLanes(clipped);
}

/**
 * Greedy interval packing, per site.
 *
 * Sorted by start, each segment takes the first lane whose last segment has
 * already ended. Two shifts that merely touch (one ends exactly where the next
 * begins) share a lane — that is a handover, not an overlap, and stacking it
 * would double the row height for nothing.
 */
function packLanes(segments: Omit<DaySegment, 'lane'>[]): DaySegment[] {
  const bySite = new Map<string, Omit<DaySegment, 'lane'>[]>();
  for (const seg of segments) {
    const list = bySite.get(seg.shift.site_id) ?? [];
    list.push(seg);
    bySite.set(seg.shift.site_id, list);
  }

  const out: DaySegment[] = [];
  for (const list of bySite.values()) {
    const sorted = [...list].sort(
      (a, b) => a.startMin - b.startMin || a.shift.id.localeCompare(b.shift.id),
    );
    const laneEnds: number[] = [];
    for (const seg of sorted) {
      let lane = laneEnds.findIndex((end) => end <= seg.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(seg.endMin);
      } else {
        laneEnds[lane] = seg.endMin;
      }
      out.push({ ...seg, lane });
    }
  }
  return out;
}

/** Highest lane index used by a site on this day — drives its row height. */
export function laneCount(segments: readonly DaySegment[], siteId: string): number {
  let max = -1;
  for (const seg of segments) {
    if (seg.shift.site_id === siteId && seg.lane > max) max = seg.lane;
  }
  return max + 1;
}

export interface CoverageBucket {
  /** Minutes from day start where this bucket begins. */
  startMin: number;
  /** Shifts with a worker assigned that are live during this bucket. */
  staffed: number;
  /** Shifts with no worker that are live during this bucket. */
  unfilled: number;
}

export const COVERAGE_BUCKET_MIN = 30;

/**
 * Half-hourly staffing histogram for a day.
 *
 * Derived entirely from shifts already loaded for the week — the ribbon adds
 * no query. A shift counts toward a bucket if it is live for any part of it.
 */
export function coverageBuckets(
  shifts: readonly AxisShift[],
  ymd: string,
  bucketMin: number = COVERAGE_BUCKET_MIN,
): CoverageBucket[] {
  const win = dayWindow(ymd);
  const count = Math.ceil(win.lengthMin / bucketMin);
  const buckets: CoverageBucket[] = Array.from({ length: count }, (_, i) => ({
    startMin: i * bucketMin,
    staffed: 0,
    unfilled: 0,
  }));

  for (const seg of daySegments(shifts, ymd)) {
    if (seg.shift.status === 'cancelled') continue;
    const first = Math.floor(seg.startMin / bucketMin);
    // A shift ending exactly on a boundary does not occupy the next bucket.
    const last = Math.ceil(seg.endMin / bucketMin) - 1;
    for (let i = Math.max(0, first); i <= Math.min(count - 1, last); i++) {
      if (seg.shift.worker_id === null) buckets[i]!.unfilled += 1;
      else buckets[i]!.staffed += 1;
    }
  }

  return buckets;
}

/** Peak staffed count across a set of buckets — the alpha ramp's denominator. */
export function peakStaffed(buckets: readonly CoverageBucket[]): number {
  return buckets.reduce((max, b) => Math.max(max, b.staffed), 0);
}

/** `0` → "12:00am", `810` → "1:30pm". Day-relative, for axis ticks and tooltips. */
export function minuteLabel(win: DayWindow, min: number): string {
  return formatACST(new Date(win.startMs + min * 60_000), 'h:mma').toLowerCase();
}

/** Snaps a minute offset to the nearest `step`, clamped inside the day. */
export function snapMinutes(min: number, step: number, lengthMin: number): number {
  return Math.max(0, Math.min(lengthMin, Math.round(min / step) * step));
}

/** `HH:mm` for a minute offset — feeds the create dialog's time inputs. */
export function minutesToHm(win: DayWindow, min: number): string {
  return formatACST(new Date(win.startMs + min * 60_000), 'HH:mm');
}
