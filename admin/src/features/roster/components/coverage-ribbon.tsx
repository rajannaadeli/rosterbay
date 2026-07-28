import { useMemo } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  COVERAGE_BUCKET_MIN,
  coverageBuckets,
  dayWindow,
  peakStaffed,
  type AxisShift,
} from '../time-axis';

const CELL_HEIGHT = 14;

interface CoverageRibbonProps {
  shifts: readonly AxisShift[];
  ymd: string;
  /** Width of the sticky site column, so cells line up with the axis above. */
  leftInsetPx: number;
  onWindowPick?: (startMin: number) => void;
}

/**
 * A half-hourly staffing heat-strip, pixel-aligned to the time axis beneath it.
 *
 * Answers "where is the day thin?" before you have read a single shift. Every
 * value is derived from shifts already in the cache — the ribbon issues no
 * query of its own.
 *
 * Intensity is relative to the day's own peak rather than an absolute headcount:
 * an absolute ramp would render a quiet Sunday as uniformly empty and tell you
 * nothing about where its one gap is.
 */
export function CoverageRibbon({ shifts, ymd, leftInsetPx, onWindowPick }: CoverageRibbonProps) {
  const win = useMemo(() => dayWindow(ymd), [ymd]);
  const buckets = useMemo(() => coverageBuckets(shifts, ymd), [shifts, ymd]);
  const peak = Math.max(1, peakStaffed(buckets));

  return (
    <div className="flex border-b border-border-subtle bg-surface-1">
      <div
        style={{ width: leftInsetPx }}
        className="sticky left-0 z-20 flex shrink-0 items-center justify-between gap-2 border-r border-border-subtle bg-surface-1 px-3 py-2"
      >
        <span className="label-micro">Coverage</span>
        <Legend />
      </div>

      <div className="relative flex min-w-0 flex-1 items-center py-2">
        <div className="flex w-full gap-px">
          {buckets.map((bucket, index) => {
            const startLabel = formatACST(
              new Date(win.startMs + bucket.startMin * 60_000),
              'HH:mm',
            );
            const endLabel = formatACST(
              new Date(win.startMs + (bucket.startMin + COVERAGE_BUCKET_MIN) * 60_000),
              'HH:mm',
            );
            const intensity = bucket.staffed / peak;
            const empty = bucket.staffed === 0 && bucket.unfilled === 0;

            return (
              <Tooltip key={bucket.startMin}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={`${startLabel} to ${endLabel}: ${bucket.staffed} staffed, ${bucket.unfilled} unfilled`}
                      onClick={() => onWindowPick?.(bucket.startMin)}
                      // Cells draw in left-to-right on mount; the delay is
                      // inline because 48 nth-child rules would be absurd.
                      style={{
                        height: CELL_HEIGHT,
                        animationDelay: `${Math.min(index, 24) * 12}ms`,
                        ...(bucket.unfilled === 0 && !empty
                          ? { backgroundColor: `color-mix(in oklab, var(--accent) ${Math.round(18 + intensity * 82)}%, transparent)` }
                          : {}),
                      }}
                      className={cn(
                        'relative flex-1 overflow-hidden rounded-[2px] transition-[filter] duration-[var(--duration-micro)]',
                        'animate-[fade-in_var(--duration-entrance)_var(--ease-out)_both]',
                        'hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        empty && 'bg-surface-2',
                        bucket.unfilled > 0 && 'bg-danger-muted',
                      )}
                    />
                  }
                >
                  {bucket.unfilled > 0 && (
                    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full">
                      <rect width="100%" height="100%" fill="url(#rb-hatch-danger-dense)" />
                    </svg>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <span className="num">
                    {startLabel}–{endLabel}
                  </span>
                  {' · '}
                  <span className="num">{bucket.staffed}</span> staffed
                  {bucket.unfilled > 0 && (
                    <>
                      {' · '}
                      <span className="num text-danger">{bucket.unfilled}</span> unfilled
                    </>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <span className="flex shrink-0 items-center gap-1" aria-hidden>
      <span className="size-2 rounded-[2px] bg-surface-2" title="No cover" />
      <span
        className="size-2 rounded-[2px]"
        style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 55%, transparent)' }}
        title="Staffed"
      />
      <span className="size-2 rounded-[2px] bg-danger-muted ring-1 ring-danger/40" title="Unfilled" />
    </span>
  );
}
