import { useDroppable } from '@dnd-kit/core';
import { CaretLeft, CaretRight, MegaphoneSimple } from '@phosphor-icons/react';

import { UserAvatar } from '@/components/user-avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Tables, Views } from '@/lib/database.types';
import { formatShiftRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DaySegment } from '../time-axis';

type Shift = Tables<'shifts'>;

/**
 * How much of the bar's content survives at a given rendered width.
 *
 * Derived from the segment's share of the track rather than measured, so it is
 * deterministic and doesn't need a layout pass: a 30-minute shift is narrow at
 * every zoom level, an 8-hour one is roomy at every zoom level.
 */
type Detail = 'full' | 'compact' | 'minimal';

function detailFor(widthPx: number): Detail {
  if (widthPx >= 132) return 'full';
  if (widthPx >= 64) return 'compact';
  return 'minimal';
}

interface ShiftBarProps {
  segment: DaySegment;
  /** The full row — the axis only carries the subset it needs. */
  shift: Shift;
  worker: Views<'worker_overview'> | undefined;
  hasOpenOffer: boolean;
  dropState: 'ok' | 'block' | null;
  dimmed: boolean;
  /** Estimated rendered width in px, for content degradation. */
  widthPx: number;
  /** True when the pointer is over either half of a midnight-wrapped shift. */
  paired: boolean;
  /** Entrance delay, staggered by the segment's start time. */
  enterDelayMs: number;
  laneTop: number;
  laneHeight: number;
  leftPct: number;
  widthPct: number;
  onHover: (shiftId: string | null) => void;
  onClick: () => void;
  onBroadcast: () => void;
}

/**
 * One shift drawn on the time axis: position encodes when, width encodes how
 * long. Replaces the fixed-size chip, where a 30-minute shift and a 12-hour
 * shift were the same rectangle.
 *
 * Registers the *same* droppable id and payload the chip did, so drag-to-assign,
 * the live eligibility ring and the conflict dialog all work unchanged.
 */
export function ShiftBar({
  segment,
  shift,
  worker,
  hasOpenOffer,
  dropState,
  dimmed,
  widthPx,
  paired,
  enterDelayMs,
  laneTop,
  laneHeight,
  leftPct,
  widthPct,
  onHover,
  onClick,
  onBroadcast,
}: ShiftBarProps) {
  const { setNodeRef } = useDroppable({ id: shift.id, data: { shift } });
  const unfilled = shift.worker_id === null;
  const inProgress = shift.status === 'in_progress';
  const detail = detailFor(widthPx);
  const range = formatShiftRange(shift.starts_at, shift.ends_at);
  const firstName = worker?.full_name.split(' ')[0] ?? '—';

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover(shift.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(shift.id)}
      onBlur={() => onHover(null)}
      aria-label={`${unfilled ? 'Unfilled shift' : firstName}, ${range}`}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        top: laneTop,
        height: laneHeight,
        animationDelay: `${enterDelayMs}ms`,
      }}
      className={cn(
        'bar-enter group/bar absolute flex items-center gap-1.5 overflow-hidden rounded-sm border pr-1.5 pl-2 text-left',
        'transition-[opacity,box-shadow,border-color] duration-[var(--duration-micro)]',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        // The 3px status cap is a box-shadow inset rather than a border so it
        // can't eat into the (sometimes tiny) content width.
        unfilled
          ? 'border-dashed border-danger/70 bg-danger-muted text-danger'
          : 'border-border-default bg-surface-2 hover:border-border-strong',
        inProgress && 'border-primary/40 bg-accent-muted',
        shift.status === 'completed' && 'opacity-55',
        dimmed && 'opacity-25',
        paired && 'ring-2 ring-primary/40',
        dropState === 'ok' && 'ring-2 ring-primary',
        dropState === 'block' && 'cursor-not-allowed ring-2 ring-danger',
        // Midnight wrap: square off the edge that continues, so the bar reads
        // as cut rather than as ending there.
        segment.continuesLeft && 'rounded-l-none border-l-0',
        segment.continuesRight && 'rounded-r-none border-r-0',
      )}
    >
      {/* Status cap */}
      {!segment.continuesLeft && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 w-[3px]',
            unfilled
              ? 'bg-danger'
              : inProgress
                ? 'bg-primary'
                : shift.status === 'completed'
                  ? 'bg-success'
                  : 'bg-border-strong',
          )}
        />
      )}

      {/* Hatch texture — the redundant, non-colour channel for "unfilled". */}
      {unfilled && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full">
          <rect width="100%" height="100%" fill="url(#rb-hatch-danger)" />
        </svg>
      )}

      {/* In-progress sheen — a slow accent sweep. Paused under reduced motion
          by the global rule in index.css. */}
      {inProgress && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full">
          <rect className="rb-sheen" width="45%" height="100%" fill="url(#rb-sheen)" />
        </svg>
      )}

      {segment.continuesLeft && (
        <CaretLeft
          size={11}
          weight="bold"
          aria-hidden
          className="relative shrink-0 text-text-tertiary"
        />
      )}

      {unfilled ? (
        <>
          <span className="relative truncate text-micro font-semibold tracking-normal">
            {detail === 'minimal' ? '—' : 'Unfilled'}
          </span>
          {detail === 'full' && <span className="num relative shrink-0 text-micro opacity-80">{range}</span>}
          {!hasOpenOffer && detail !== 'minimal' && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Broadcast to eligible workers"
                    className="relative ml-auto shrink-0 rounded-xs p-0.5 text-danger transition-colors hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={(event) => {
                      event.stopPropagation();
                      onBroadcast();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.stopPropagation();
                        onBroadcast();
                      }
                    }}
                  />
                }
              >
                <MegaphoneSimple size={12} weight="duotone" aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Broadcast to eligible workers</TooltipContent>
            </Tooltip>
          )}
        </>
      ) : (
        <>
          <span className="relative shrink-0">
            <UserAvatar name={worker?.full_name ?? '—'} size="xs" />
          </span>
          {inProgress && (
            <span
              aria-label="On site now"
              className="relative size-1.5 shrink-0 animate-[live-pulse_2s_var(--ease-inout)_infinite] rounded-full bg-success"
            />
          )}
          {detail !== 'minimal' && (
            <span className="relative truncate text-micro font-medium tracking-normal">
              {firstName}
            </span>
          )}
          {detail === 'full' && (
            <span className="num relative ml-auto shrink-0 text-micro text-text-tertiary">
              {range}
            </span>
          )}
        </>
      )}

      {hasOpenOffer && (
        <span
          aria-label="Offer broadcast — waiting for a taker"
          className="absolute top-1 right-1 flex size-2"
        >
          <span className="absolute inline-flex size-full animate-[ping-ring_2s_var(--ease-out)_infinite] rounded-full bg-primary" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      )}

      {segment.continuesRight && (
        <CaretRight
          size={11}
          weight="bold"
          aria-hidden
          className="relative ml-auto shrink-0 text-text-tertiary"
        />
      )}
    </button>
  );
}
