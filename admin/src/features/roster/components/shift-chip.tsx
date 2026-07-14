import { useDroppable } from '@dnd-kit/core';
import { MegaphoneSimple } from '@phosphor-icons/react';

import { UserAvatar } from '@/components/user-avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Tables, Views } from '@/lib/database.types';
import { formatShiftRange } from '@/lib/format';
import { cn } from '@/lib/utils';

type Shift = Tables<'shifts'>;

interface ShiftChipProps {
  shift: Shift;
  worker: Views<'worker_overview'> | undefined;
  /** An open offer exists — chip pulses radar-style until it resolves. */
  hasOpenOffer?: boolean;
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
  dropState,
  dimmed,
  onClick,
  onBroadcast,
}: ShiftChipProps) {
  const { setNodeRef } = useDroppable({ id: shift.id, data: { shift } });
  const unfilled = shift.worker_id === null;
  const range = formatShiftRange(shift.starts_at, shift.ends_at);

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-8 w-full items-center gap-1.5 rounded-lg border px-1.5 text-left text-[11px] whitespace-nowrap transition-all',
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
        </>
      )}
    </button>
  );
}
