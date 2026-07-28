import { useEffect, useMemo, useState } from 'react';

import type { Tables, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  dayWindow,
  daySegments,
  laneCount,
  minutesIntoToday,
  minutesToHm,
  snapMinutes,
  type AxisShift,
  type DaySegment,
} from '../time-axis';
import { CoverageRibbon } from './coverage-ribbon';
import { ShiftBar } from './shift-bar';

type Shift = Tables<'shifts'>;
type WorkerRow = Views<'worker_overview'>;

export type ZoomHours = 6 | 12 | 24;

/**
 * Track width per zoom level, in px for the full 24 hours.
 *
 * Pixels rather than percentages because the whole grid — axis ticks, bars,
 * coverage cells, now-line — has to agree on one horizontal scale, and a
 * percentage track would resolve against differently-sized parents. The track
 * is `min-width`, so at 24h it still stretches to fill a wide screen.
 */
const TRACK_MIN_PX: Record<ZoomHours, number> = { 24: 760, 12: 1520, 6: 3040 };

const SITE_COL_PX = 168;
const LANE_HEIGHT = 32;
const LANE_GAP = 4;
const ROW_PAD_Y = 8;

/** Default length of the ghost bar — the standard shift on this roster. */
const GHOST_MINUTES = 8 * 60;
const SNAP_MINUTES = 30;

interface TimeGridProps {
  ymd: string;
  sites: Tables<'job_sites'>[];
  /** All shifts loaded for the week; the grid clips them to `ymd` itself. */
  shifts: Shift[];
  workerById: Map<string, WorkerRow>;
  offerShiftIds: Set<string>;
  zoom: ZoomHours;
  dimFilled: boolean;
  dragOverShiftId: string | null;
  dragOverState: 'ok' | 'block' | null;
  onShiftClick: (shiftId: string) => void;
  onBroadcast: (shiftId: string) => void;
  onCreateAt: (siteId: string, startHm: string, endHm: string) => void;
}

export function TimeGrid({
  ymd,
  sites,
  shifts,
  workerById,
  offerShiftIds,
  zoom,
  dimFilled,
  dragOverShiftId,
  dragOverState,
  onShiftClick,
  onBroadcast,
  onCreateAt,
}: TimeGridProps) {
  const win = useMemo(() => dayWindow(ymd), [ymd]);
  const shiftById = useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts]);

  const axisShifts: AxisShift[] = useMemo(
    () => shifts.filter((s) => s.status !== 'cancelled'),
    [shifts],
  );
  const segments = useMemo(() => daySegments(axisShifts, ymd), [axisShifts, ymd]);
  const segmentsBySite = useMemo(() => {
    const map = new Map<string, DaySegment[]>();
    for (const seg of segments) {
      const list = map.get(seg.shift.site_id) ?? [];
      list.push(seg);
      map.set(seg.shift.site_id, list);
    }
    return map;
  }, [segments]);

  // Hovering either half of a midnight-wrapped shift lights both, because both
  // segments carry the same shift id.
  const [hoveredShiftId, setHoveredShiftId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ siteId: string; startMin: number } | null>(null);

  const trackMinPx = TRACK_MIN_PX[zoom];
  const isToday = ymd === formatACST(new Date(), 'yyyy-MM-dd');

  return (
    <div className="seq-1 e1 overflow-hidden rounded-lg">
      <div className="scrollbar-thin overflow-x-auto">
        <div style={{ minWidth: SITE_COL_PX + trackMinPx }}>
          <AxisHeader win={win} zoom={zoom} isToday={isToday} />

          <CoverageRibbon
            shifts={axisShifts}
            ymd={ymd}
            leftInsetPx={SITE_COL_PX}
            onWindowPick={(startMin) => {
              // Picking a coverage cell scrolls the grid to that hour rather
              // than filtering — filtering a single day's five rows removes
              // the context that makes the ribbon readable in the first place.
              const el = document.getElementById(`rb-tick-${Math.floor(startMin / 120) * 120}`);
              el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }}
          />

          {sites.map((site) => {
            const siteSegments = segmentsBySite.get(site.id) ?? [];
            const lanes = Math.max(1, laneCount(segments, site.id));
            const rowHeight = lanes * LANE_HEIGHT + (lanes - 1) * LANE_GAP + ROW_PAD_Y * 2;
            const unfilledCount = siteSegments.filter(
              (s) => s.shift.worker_id === null && !s.continuesLeft,
            ).length;
            const shiftCount = siteSegments.filter((s) => !s.continuesLeft).length;

            return (
              <div key={site.id} className="flex border-b border-border-subtle last:border-b-0">
                {/* Sticky site column */}
                <div
                  style={{ width: SITE_COL_PX, minHeight: rowHeight }}
                  className="sticky left-0 z-20 flex shrink-0 flex-col justify-center gap-1 border-r border-border-subtle bg-surface-1 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-small font-medium">{site.name}</p>
                    <p className="label-micro truncate">{site.client_name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="num rounded-xs bg-surface-2 px-1.5 py-0.5 text-[10px] leading-none text-text-tertiary">
                      {shiftCount} shifts
                    </span>
                    {unfilledCount > 0 && (
                      <span className="num rounded-xs bg-danger-muted px-1.5 py-0.5 text-[10px] leading-none font-medium text-danger">
                        {unfilledCount} unfilled
                      </span>
                    )}
                  </div>
                </div>

                {/* Track */}
                <div
                  className="relative min-w-0 flex-1"
                  style={{ height: rowHeight }}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const min = ((event.clientX - rect.left) / rect.width) * win.lengthMin;
                    setGhost({ siteId: site.id, startMin: snapMinutes(min, SNAP_MINUTES, win.lengthMin) });
                  }}
                  onMouseLeave={() => setGhost(null)}
                >
                  <TrackBackdrop win={win} zoom={zoom} />

                  {ghost?.siteId === site.id && (
                    <GhostBar
                      win={win}
                      startMin={ghost.startMin}
                      top={ROW_PAD_Y}
                      height={LANE_HEIGHT}
                      onPick={() => {
                        const endMin = Math.min(win.lengthMin, ghost.startMin + GHOST_MINUTES);
                        onCreateAt(
                          site.id,
                          minutesToHm(win, ghost.startMin),
                          // A ghost snapped against the end of the day would
                          // otherwise submit end === start and fail validation.
                          minutesToHm(win, endMin === win.lengthMin ? win.lengthMin - 60 : endMin),
                        );
                      }}
                    />
                  )}

                  {siteSegments.map((seg) => {
                    const shift = shiftById.get(seg.shift.id);
                    if (!shift) return null;
                    const widthPct = ((seg.endMin - seg.startMin) / win.lengthMin) * 100;
                    return (
                      <ShiftBar
                        key={`${seg.shift.id}-${seg.continuesLeft ? 'tail' : 'head'}`}
                        segment={seg}
                        shift={shift}
                        worker={shift.worker_id ? workerById.get(shift.worker_id) : undefined}
                        hasOpenOffer={offerShiftIds.has(shift.id)}
                        dropState={dragOverShiftId === shift.id ? dragOverState : null}
                        dimmed={dimFilled && shift.worker_id !== null}
                        widthPx={(widthPct / 100) * trackMinPx}
                        paired={hoveredShiftId === shift.id}
                        laneTop={ROW_PAD_Y + seg.lane * (LANE_HEIGHT + LANE_GAP)}
                        laneHeight={LANE_HEIGHT}
                        leftPct={(seg.startMin / win.lengthMin) * 100}
                        widthPct={widthPct}
                        enterDelayMs={
                          // Staggered by start time, capped — the day fills in
                          // left to right the way it is read.
                          Math.min(240, Math.round((seg.startMin / win.lengthMin) * 260))
                        }
                        onHover={setHoveredShiftId}
                        onClick={() => onShiftClick(shift.id)}
                        onBroadcast={() => onBroadcast(shift.id)}
                      />
                    );
                  })}

                  {isToday && <NowLine win={win} showCapsule={false} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Hour ticks every two hours, plus the day/night banding legend. */
function AxisHeader({ win, zoom, isToday }: { win: DayWindow; zoom: ZoomHours; isToday: boolean }) {
  const step = zoom === 6 ? 60 : 120;
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let m = 0; m < win.lengthMin; m += step) out.push(m);
    return out;
  }, [win.lengthMin, step]);

  return (
    <div className="flex border-b border-border-subtle bg-surface-2">
      <div
        style={{ width: SITE_COL_PX }}
        className="sticky left-0 z-20 flex shrink-0 items-end border-r border-border-subtle bg-surface-2 px-3 pb-1.5"
      >
        <span className="label-micro">Site · Time</span>
      </div>
      <div className="relative min-w-0 flex-1 pt-1.5 pb-1.5">
        {ticks.map((m) => (
          <span
            key={m}
            id={`rb-tick-${m}`}
            style={{ left: `${(m / win.lengthMin) * 100}%` }}
            className="num absolute top-1.5 -translate-x-1/2 text-[10px] leading-none text-text-tertiary first:translate-x-0"
          >
            {formatACST(new Date(win.startMs + m * 60_000), 'HH:mm')}
          </span>
        ))}
        <div className="h-4" />
        {isToday && <NowLine win={win} showCapsule />}
      </div>
    </div>
  );
}

/**
 * Night banding and the vertical gridlines, drawn behind every bar.
 *
 * The 18:00–06:00 wash is the reason a night shift is legible as a night shift
 * without reading its label — the single highest-value pixel in the view.
 */
function TrackBackdrop({ win, zoom }: { win: DayWindow; zoom: ZoomHours }) {
  const step = zoom === 6 ? 60 : 120;
  const pct = (min: number) => `${(min / win.lengthMin) * 100}%`;

  const lines: number[] = [];
  for (let m = step; m < win.lengthMin; m += step) lines.push(m);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Night: midnight → 06:00 and 18:00 → end of day. */}
      <div className="absolute inset-y-0 bg-foreground/[0.035]" style={{ left: 0, width: pct(360) }} />
      <div
        className="absolute inset-y-0 bg-foreground/[0.035]"
        style={{ left: pct(1080), right: 0 }}
      />
      {lines.map((m) => (
        <div key={m} className="absolute inset-y-0 w-px bg-border-subtle" style={{ left: pct(m) }} />
      ))}
    </div>
  );
}

/** The accent "now" line, re-placed every minute. */
function NowLine({ win, showCapsule }: { win: DayWindow; showCapsule: boolean }) {
  const [min, setMin] = useState(() => minutesIntoToday());

  useEffect(() => {
    // Align the first tick to the top of the next minute so the capsule's
    // label flips exactly when the clock does, not up to 59s late.
    let interval: number;
    const timeout = window.setTimeout(
      () => {
        setMin(minutesIntoToday());
        interval = window.setInterval(() => setMin(minutesIntoToday()), 60_000);
      },
      (60 - new Date().getSeconds()) * 1000,
    );
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  if (min < 0 || min > win.lengthMin) return null;
  const left = `${(min / win.lengthMin) * 100}%`;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 z-10" style={{ left }}>
      <div className="absolute inset-y-0 w-px bg-primary dark:shadow-[var(--accent-glow)]" />
      {showCapsule && (
        <span className="num absolute -top-0.5 left-1/2 -translate-x-1/2 rounded-xs bg-primary px-1.5 py-0.5 text-[10px] leading-none font-semibold text-primary-foreground">
          {formatACST(new Date(), 'HH:mm')}
        </span>
      )}
    </div>
  );
}

/** Snapped create affordance shown while the pointer is over empty track. */
function GhostBar({
  win,
  startMin,
  top,
  height,
  onPick,
}: {
  win: DayWindow;
  startMin: number;
  top: number;
  height: number;
  onPick: () => void;
}) {
  const widthPct = (Math.min(GHOST_MINUTES, win.lengthMin - startMin) / win.lengthMin) * 100;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Add a shift starting ${minutesToHm(win, startMin)}`}
      style={{ left: `${(startMin / win.lengthMin) * 100}%`, width: `${widthPct}%`, top, height }}
      className={cn(
        'absolute flex items-center gap-1.5 rounded-sm border border-dashed border-primary/50 bg-accent-muted px-2',
        'text-primary transition-colors duration-[var(--duration-micro)] hover:bg-primary/15',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
      )}
    >
      <span className="text-micro font-semibold tracking-normal">+</span>
      <span className="num truncate text-micro">{minutesToHm(win, startMin)}</span>
    </button>
  );
}

// Re-exported for the header/backdrop helpers above.
type DayWindow = ReturnType<typeof dayWindow>;
