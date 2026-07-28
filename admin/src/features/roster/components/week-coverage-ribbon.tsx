import { useMemo } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';
import { coverageBuckets, dayWindow, type AxisShift } from '../time-axis';

/** Two-hour resolution: 12 rows keeps the matrix under 44px per the spec. */
const BUCKET_MIN = 120;
const ROW_HEIGHT = 3;
const ROW_GAP = 1;

interface WeekCoverageRibbonProps {
  shifts: readonly AxisShift[];
  days: Date[];
  /** Width of the roster's sticky site column, so columns line up with it. */
  leftInsetPx: number;
}

/**
 * The week-mode heat matrix: 7 columns × 12 two-hour rows.
 *
 * Same derivation as the day ribbon, aggregated coarser. Midnight sits at the
 * top of each column and 22:00 at the bottom, so a column reads top-to-bottom
 * as a day — the night shifts that wrap are visible as filled cells at *both*
 * ends, which is exactly the shape an ops manager is looking for.
 */
export function WeekCoverageRibbon({ shifts, days, leftInsetPx }: WeekCoverageRibbonProps) {
  const columns = useMemo(
    () =>
      days.map((day) => {
        const ymd = formatACST(day, 'yyyy-MM-dd');
        return { ymd, win: dayWindow(ymd), buckets: coverageBuckets(shifts, ymd, BUCKET_MIN) };
      }),
    [shifts, days],
  );

  const peak = Math.max(
    1,
    ...columns.flatMap((col) => col.buckets.map((b) => b.staffed)),
  );

  return (
    <div className="e1 flex overflow-hidden rounded-lg">
      <div
        style={{ width: leftInsetPx }}
        className="flex shrink-0 flex-col justify-center gap-1 border-r border-border-subtle px-3 py-2"
      >
        <span className="label-micro">Coverage</span>
        <span className="flex items-center gap-1" aria-hidden>
          <span className="size-2 rounded-[2px] bg-surface-2" />
          <span
            className="size-2 rounded-[2px]"
            style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 55%, transparent)' }}
          />
          <span className="size-2 rounded-[2px] bg-danger-muted ring-1 ring-danger/40" />
        </span>
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-7 gap-px py-2">
        {columns.map((col, colIndex) => (
          <div
            key={col.ymd}
            className="flex flex-col px-1 animate-[fade-up_var(--duration-entrance)_var(--ease-out)_both]"
            style={{ gap: ROW_GAP, animationDelay: `${colIndex * 40}ms` }}
          >
            {col.buckets.map((bucket) => {
              const empty = bucket.staffed === 0 && bucket.unfilled === 0;
              const label = formatACST(
                new Date(col.win.startMs + bucket.startMin * 60_000),
                'HH:mm',
              );
              return (
                <Tooltip key={bucket.startMin}>
                  <TooltipTrigger
                    render={
                      <div
                        style={{
                          height: ROW_HEIGHT,
                          ...(bucket.unfilled === 0 && !empty
                            ? {
                                backgroundColor: `color-mix(in oklab, var(--accent) ${Math.round(
                                  18 + (bucket.staffed / peak) * 82,
                                )}%, transparent)`,
                              }
                            : {}),
                        }}
                        className={cn(
                          'rounded-[1px]',
                          empty && 'bg-surface-2',
                          bucket.unfilled > 0 && 'bg-danger',
                        )}
                      />
                    }
                  />
                  <TooltipContent>
                    <span className="num">
                      {formatACST(new Date(col.win.startMs), 'EEE')} {label}
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
        ))}
      </div>
    </div>
  );
}
