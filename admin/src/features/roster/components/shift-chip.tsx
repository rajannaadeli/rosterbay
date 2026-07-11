import { useDroppable } from '@dnd-kit/core';
import { MegaphoneSimple } from '@phosphor-icons/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Tables, Views } from '@/lib/database.types';
import { formatACST, initials } from '@/lib/format';
import { cn } from '@/lib/utils';

type Shift = Tables<'shifts'>;

interface ShiftChipProps {
  shift: Shift;
  worker: Views<'worker_overview'> | undefined;
  /** An open offer exists — chip pulses radar-style until it resolves. */
  hasOpenOffer?: boolean;
  onClick: () => void;
  onBroadcast?: () => void;
}

function timeRange(shift: Shift): string {
  return `${formatACST(shift.starts_at, 'h:mma').toLowerCase()}–${formatACST(shift.ends_at, 'h:mma').toLowerCase()}`;
}

export function ShiftChip({ shift, worker, hasOpenOffer, onClick, onBroadcast }: ShiftChipProps) {
  const { setNodeRef, isOver } = useDroppable({ id: shift.id, data: { shift } });

  const unfilled = shift.worker_id === null;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight transition-shadow',
        unfilled
          ? 'border-dashed border-danger bg-danger/5 text-danger'
          : 'border-border bg-card hover:shadow-sm',
        shift.status === 'completed' && 'opacity-55',
        isOver && 'ring-2 ring-primary',
      )}
    >
      {hasOpenOffer && (
        <span className="absolute -top-1 -right-1 flex size-3" aria-label="Offer broadcast — waiting for a taker">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-primary" />
        </span>
      )}
      {unfilled ? (
        <span className="flex flex-1 items-center justify-between gap-1">
          <span className="flex flex-col">
            <span className="font-medium">Unfilled</span>
            <span>{timeRange(shift)}</span>
          </span>
          {onBroadcast && !hasOpenOffer && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Broadcast this shift"
              className="rounded p-1 text-danger transition-colors hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
            >
              <MegaphoneSimple size={13} weight="duotone" aria-hidden />
            </span>
          )}
        </span>
      ) : (
        <>
          <Avatar className="size-5 shrink-0">
            {worker?.avatar_url && <AvatarImage src={worker.avatar_url} alt="" />}
            <AvatarFallback className="text-[8px]">
              {worker ? initials(worker.full_name) : '?'}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1 truncate font-medium">
              {worker?.full_name.split(' ')[0] ?? '—'}
              {shift.status === 'in_progress' && (
                <span
                  className="size-1.5 shrink-0 animate-pulse rounded-full bg-success"
                  aria-label="On site now"
                />
              )}
            </span>
            <span className="truncate text-muted-foreground">{timeRange(shift)}</span>
          </span>
        </>
      )}
    </button>
  );
}
