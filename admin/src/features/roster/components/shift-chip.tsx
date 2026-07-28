import { useDroppable } from '@dnd-kit/core';
import { CheckCircle, CircleHalf, MegaphoneSimple } from '@phosphor-icons/react';

import { UserAvatar } from '@/components/user-avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Tables, Views } from '@/lib/database.types';
import { formatACST, formatShiftRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dayWindow, minutesInto } from '../time-axis';

type Shift = Tables<'shifts'>;

/**
 * A 2px rail under the chip label showing where this shift sits in the day.
 *
 * The week grid can't encode time in position — every cell is one day — so
 * the micro-track carries the metaphor across from the day view. It is the
 * difference between "there is a shift on Thursday" and "the Thursday shift
 * is the overnight one".
 */
function MicroTrack({ shift, tone }: { shift: Shift; tone: 'danger' | 'muted' | 'primary' }) {
  const ymd = formatACST(shift.starts_at, 'yyyy-MM-dd');
  const win = dayWindow(ymd);
  const startMin = Math.max(0, minutesInto(win, shift.starts_at));
  // Clipped at midnight: the remainder belongs to the next day's cell, and
  // drawing it here would imply the shift ends at 23:59.
  const endMin = Math.min(win.lengthMin, minutesInto(win, shift.ends_at));
  const left = (startMin / win.lengthMin) * 100;
  const width = Math.max(2, ((endMin - startMin) / win.lengthMin) * 100);

  return (
    <span
      aria-hidden
      className="absolute inset-x-1.5 bottom-[3px] h-[2px] overflow-hidden rounded-full bg-border-subtle"
    >
      <span
        className={cn(
          'absolute inset-y-0 rounded-full',
          tone === 'danger' && 'bg-danger',
          tone === 'muted' && 'bg-text-tertiary',
          tone === 'primary' && 'bg-primary',
        )}
        style={{ left: `${left}%`, width: `${width}%` }}
      />
    </span>
  );
}

interface ShiftChipProps {
  shift: Shift;
  worker: Views<'worker_overview'> | undefined;
  /** An open offer exists — chip pulses radar-style until it resolves. */
  hasOpenOffer?: boolean;
  /** Task counts for this shift — renders the completion glyph when finished. */
  proof?: Views<'shift_proof_summary'>;
  /** Live drag eligibility when this chip is the hovered drop target. */
  dropState?: 'ok' | 'block' | null;
  /** Dimmed by the "Unfilled only" view toggle. */
  dimmed?: boolean;
  onClick: () => void;
  onBroadcast?: () => void;
}

export function ShiftChip({
  shift,
  worker,
  hasOpenOffer,
  proof,
  dropState,
  dimmed,
  onClick,
  onBroadcast,
}: ShiftChipProps) {
  const { setNodeRef } = useDroppable({ id: shift.id, data: { shift } });
  const unfilled = shift.worker_id === null;
  const range = formatShiftRange(shift.starts_at, shift.ends_at);

  // Completion glyph: teal ✓ when the checklist came back whole, amber half
  // when it didn't. Icon only — the chip stays one 32px line.
  const finished = shift.status === 'completed' && proof && proof.tasks_total > 0;
  const allDone = finished && proof.tasks_done === proof.tasks_total;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-[34px] w-full items-center gap-1.5 rounded-sm border px-1.5 pb-1 text-left text-micro tracking-normal whitespace-nowrap transition-all',
        unfilled
          ? 'border-dashed border-danger bg-danger/5 text-danger'
          : 'border-border bg-card hover:shadow-sm',
        shift.status === 'completed' && 'opacity-60',
        dimmed && 'opacity-30',
        dropState === 'ok' && 'bg-primary/5 ring-2 ring-primary',
        dropState === 'block' && 'cursor-not-allowed ring-2 ring-danger',
      )}
    >
      {hasOpenOffer && (
        <span
          className="absolute -top-1 -right-1 flex size-3"
          aria-label="Offer broadcast — waiting for a taker"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-primary" />
        </span>
      )}

      {unfilled ? (
        <>
          <span className="truncate font-medium">Unfilled</span>
          <span className="shrink-0 text-danger/80">· {range}</span>
          {onBroadcast && !hasOpenOffer && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Broadcast to eligible workers"
                    className="ml-auto shrink-0 rounded p-0.5 text-danger transition-colors hover:bg-danger/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                <MegaphoneSimple size={13} weight="duotone" aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Broadcast to eligible workers</TooltipContent>
            </Tooltip>
          )}
        </>
      ) : (
        <>
          <UserAvatar name={worker?.full_name ?? '—'} size="xs" />
          {shift.status === 'in_progress' && (
            <span
              className="size-1.5 shrink-0 animate-pulse rounded-full bg-success"
              aria-label="On site now"
            />
          )}
          <span className="truncate font-medium">{worker?.full_name.split(' ')[0] ?? '—'}</span>
          <span className="shrink-0 text-muted-foreground">· {range}</span>
          {finished && (
            <span
              role="img"
              aria-label={
                allDone
                  ? 'All tasks completed'
                  : `${proof.tasks_total - proof.tasks_done} tasks not completed`
              }
              className={cn('ml-auto shrink-0', allDone ? 'text-primary' : 'text-warning')}
            >
              {allDone ? (
                <CheckCircle size={11} weight="fill" aria-hidden />
              ) : (
                <CircleHalf size={11} weight="fill" aria-hidden />
              )}
            </span>
          )}
        </>
      )}

      <MicroTrack
        shift={shift}
        tone={unfilled ? 'danger' : shift.status === 'in_progress' ? 'primary' : 'muted'}
      />
    </button>
  );
}
