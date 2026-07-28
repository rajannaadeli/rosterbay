import { useEffect, useState } from 'react';

import { LATE_THRESHOLD_MIN } from '@/lib/compliance';
import { cn } from '@/lib/utils';

/**
 * Row-scale data marks — the inline cousins of `stat-spark.tsx`.
 *
 * Those live in KPI segments; these live inside table cells and list rows,
 * where the job is to replace a number you have to *read* with a shape you can
 * *scan*. A column of "−19m / +1m / +5m" makes you parse a sign on every row;
 * a column of bars leaning off a centre line does not.
 *
 * All of them take data the calling screen already has. None fetch.
 */

// ── Deviation bar ───────────────────────────────────────────────────────────

/** Minutes at which the bar is full-width; beyond this it caps and flares. */
const DEVIATION_FULL_SCALE = 45;

interface DeviationBarProps {
  /** Signed magnitude. Negative renders left of centre, positive right. */
  value: number;
  /** Below this the value is treated as noise and rendered neutral. */
  graceThreshold?: number;
  className?: string;
}

/**
 * A signed magnitude around a fixed centre line — for timesheet variance.
 *
 * Direction carries meaning that the sign character alone makes you decode:
 * left is short of scheduled, right is over. Values past full scale cap rather
 * than rescaling the column, so one four-hour overrun can't flatten every
 * other row into invisibility.
 */
export function DeviationBar({ value, graceThreshold = 5, className }: DeviationBarProps) {
  const magnitude = Math.min(1, Math.abs(value) / DEVIATION_FULL_SCALE);
  const capped = Math.abs(value) > DEVIATION_FULL_SCALE;
  const notable = Math.abs(value) > graceThreshold;
  const negative = value < 0;

  return (
    <span
      className={cn('relative block h-2.5 w-full overflow-hidden rounded-[2px]', className)}
      aria-hidden
    >
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-subtle" />
      {/* Centre line — the zero the bar is read against. */}
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong" />
      {/* Hue encodes *magnitude past grace*, never direction — which side of
          centre the bar sits on already says short-or-over, and colouring
          "short" green would assert that under-delivering a client's booked
          hours is the good outcome. */}
      <span
        className={cn(
          'absolute top-1/2 h-[5px] -translate-y-1/2',
          negative ? 'right-1/2 rounded-l-[2px]' : 'left-1/2 rounded-r-[2px]',
          notable ? 'bg-warning' : 'bg-text-tertiary/55',
        )}
        style={{ width: `${magnitude * 50}%` }}
      />
      {capped && (
        <span
          className={cn(
            'absolute top-1/2 size-1 -translate-y-1/2 rotate-45 bg-warning',
            negative ? 'left-0' : 'right-0',
          )}
        />
      )}
    </span>
  );
}

// ── Week strip ──────────────────────────────────────────────────────────────

export type DayLoad = 'none' | 'shift' | 'unfilled' | 'today';

interface WeekStripProps {
  /** Seven entries, Monday first. */
  days: readonly DayLoad[];
  className?: string;
}

/**
 * Seven ticks, Monday to Sunday — turns "4 shifts" into *which* four.
 *
 * The distinction matters when assigning: four shifts spread across the week
 * and four stacked Thursday-to-Sunday are very different availability, and the
 * count alone cannot tell them apart.
 */
export function WeekStrip({ days, className }: WeekStripProps) {
  return (
    <span className={cn('flex items-end gap-[2px]', className)} aria-hidden>
      {days.map((load, index) => (
        <span
          key={index}
          className={cn(
            'w-full rounded-[1px] transition-colors',
            load === 'none' && 'h-1.5 bg-text-tertiary/25',
            load === 'shift' && 'h-3 bg-primary',
            load === 'unfilled' && 'h-3 bg-danger',
            load === 'today' && 'h-3 bg-primary ring-1 ring-primary/40 ring-offset-1 ring-offset-transparent',
          )}
        />
      ))}
    </span>
  );
}

// ── Load bar ────────────────────────────────────────────────────────────────

interface LoadBarProps {
  value: number;
  /** Scale ceiling. Pass the cohort's own peak, never an invented cap. */
  peak: number;
  className?: string;
}

/**
 * A value against the highest value in its own cohort.
 *
 * Scaled to the peak rather than to a fixed "full week" figure because this
 * product has no contracted-hours model — inventing a ceiling of six shifts
 * would be asserting a business rule the schema doesn't hold. Relative load is
 * a fact; capacity would be a guess.
 */
export function LoadBar({ value, peak, className }: LoadBarProps) {
  const share = peak <= 0 ? 0 : Math.min(1, value / peak);
  return (
    <span
      className={cn('relative block h-1 w-full overflow-hidden rounded-full bg-text-tertiary/20', className)}
      aria-hidden
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 rounded-full',
          share > 0.85 ? 'bg-warning' : 'bg-primary',
        )}
        style={{ width: `${Math.max(share * 100, value > 0 ? 6 : 0)}%` }}
      />
    </span>
  );
}

// ── Attendance bar ──────────────────────────────────────────────────────────

interface AttendanceBarProps {
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string | null;
  /** Minutes of slack before a difference is worth colouring. */
  graceMin?: number;
  className?: string;
}

/**
 * Wall-clock "now", ticking each minute, but only while `active`.
 *
 * An in-progress shift has no end time, so its bar runs to the present moment
 * — which means reading `Date.now()` during render (impure, and the bar would
 * silently freeze at whatever the last unrelated re-render happened to be).
 * Ticking makes the live bar actually grow as the shift runs, which is the
 * behaviour the screen was implying anyway.
 */
function useNowMs(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [active]);

  return now;
}

/**
 * Scheduled span as a track, actual span drawn over it.
 *
 * This is the whole timesheet question in one shape: a bar that starts right
 * of the track was a late clock-in, one that ends short was an early finish,
 * one that runs past the end was an overrun. Reading it off three separate
 * time columns is arithmetic; reading it here is a glance.
 *
 * The window is padded either side of the scheduled span so overruns have
 * somewhere to render instead of being clipped at the edge.
 */
export function AttendanceBar({
  scheduledStart,
  scheduledEnd,
  actualStart,
  actualEnd,
  graceMin = LATE_THRESHOLD_MIN,
  className,
}: AttendanceBarProps) {
  const inProgress = actualEnd === null;
  const nowMs = useNowMs(inProgress);

  const schedFrom = new Date(scheduledStart).getTime();
  const schedTo = new Date(scheduledEnd).getTime();
  const actFrom = new Date(actualStart).getTime();
  const actTo = actualEnd ? new Date(actualEnd).getTime() : nowMs;

  const schedSpan = Math.max(1, schedTo - schedFrom);
  const pad = schedSpan * 0.12;
  const windowFrom = Math.min(schedFrom, actFrom) - pad;
  const windowTo = Math.max(schedTo, actTo) + pad;
  const windowSpan = Math.max(1, windowTo - windowFrom);

  const pct = (t: number) => ((t - windowFrom) / windowSpan) * 100;
  // Grace-aware: a two-minute clock-in is not a late clock-in, and colouring
  // it amber would make amber mean nothing by the third row.
  const graceMs = graceMin * 60_000;
  const late = actFrom - schedFrom > graceMs;
  const short = actualEnd !== null && schedTo - actTo > graceMs;

  return (
    <span className={cn('relative block h-[18px] w-full', className)} aria-hidden>
      {/* Scheduled */}
      <span
        className="absolute top-[3px] h-[5px] rounded-[2px] bg-text-tertiary/30"
        style={{ left: `${pct(schedFrom)}%`, width: `${pct(schedTo) - pct(schedFrom)}%` }}
      />
      {/* Actual, directly beneath so the two edges can be compared by eye */}
      <span
        className={cn(
          'absolute top-[10px] h-[5px] rounded-[2px]',
          inProgress ? 'bg-primary' : late || short ? 'bg-warning' : 'bg-success',
        )}
        style={{ left: `${pct(actFrom)}%`, width: `${Math.max(1.5, pct(actTo) - pct(actFrom))}%` }}
      />
      {/* Scheduled start and end — the references the actual bar is read against. */}
      <span
        className="absolute inset-y-0 w-px bg-border-strong"
        style={{ left: `${pct(schedFrom)}%` }}
      />
      <span
        className="absolute inset-y-0 w-px bg-border-strong/60"
        style={{ left: `${pct(schedTo)}%` }}
      />
    </span>
  );
}
