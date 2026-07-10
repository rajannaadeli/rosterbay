import { useDroppable } from '@dnd-kit/core';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Tables, Views } from '@/lib/database.types';
import { formatACST, initials } from '@/lib/format';
import { cn } from '@/lib/utils';

type Shift = Tables<'shifts'>;

interface ShiftChipProps {
  shift: Shift;
  worker: Views<'worker_overview'> | undefined;
  onClick: () => void;
}

function timeRange(shift: Shift): string {
  return `${formatACST(shift.starts_at, 'h:mma').toLowerCase()}–${formatACST(shift.ends_at, 'h:mma').toLowerCase()}`;
}

export function ShiftChip({ shift, worker, onClick }: ShiftChipProps) {
  const { setNodeRef, isOver } = useDroppable({ id: shift.id, data: { shift } });

  const unfilled = shift.worker_id === null;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight transition-shadow',
        unfilled
          ? 'border-dashed border-danger bg-danger/5 text-danger'
          : 'border-border bg-card hover:shadow-sm',
        shift.status === 'completed' && 'opacity-55',
        isOver && 'ring-2 ring-primary',
      )}
    >
      {unfilled ? (
        <span className="flex flex-col">
          <span className="font-medium">Unfilled</span>
          <span>{timeRange(shift)}</span>
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
