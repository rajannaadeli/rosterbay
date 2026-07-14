import { Plus } from '@phosphor-icons/react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Tables, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ShiftChip } from './shift-chip';

type Shift = Tables<'shifts'>;
type WorkerRow = Views<'worker_overview'>;

const MAX_VISIBLE = 3;

interface RosterCellProps {
  site: Tables<'job_sites'>;
  day: Date;
  shifts: Shift[];
  isToday: boolean;
  isWeekend: boolean;
  workerById: Map<string, WorkerRow>;
  offerShiftIds: Set<string>;
  dimFilled: boolean;
  hoveredShiftId: string | null;
  hoverState: 'ok' | 'block' | null;
  onChipClick: (shiftId: string) => void;
  onBroadcast: (shiftId: string) => void;
  onAdd: () => void;
}

export function RosterCell({
  site,
  day,
  shifts,
  isToday,
  isWeekend,
  workerById,
  offerShiftIds,
  dimFilled,
  hoveredShiftId,
  hoverState,
  onChipClick,
  onBroadcast,
  onAdd,
}: RosterCellProps) {
  const visible = shifts.slice(0, MAX_VISIBLE);
  const overflow = shifts.slice(MAX_VISIBLE);

  const renderChip = (shift: Shift) => (
    <ShiftChip
      key={shift.id}
      shift={shift}
      worker={shift.worker_id ? workerById.get(shift.worker_id) : undefined}
      hasOpenOffer={offerShiftIds.has(shift.id)}
      dropState={hoveredShiftId === shift.id ? hoverState : null}
      dimmed={dimFilled && shift.worker_id !== null}
      onClick={() => onChipClick(shift.id)}
      onBroadcast={() => onBroadcast(shift.id)}
    />
  );

  return (
    <div
      className={cn(
        'group flex min-h-[116px] flex-col gap-1 border-b border-l p-1',
        isToday && 'bg-primary/3',
        !isToday && isWeekend && 'bg-warning/3',
      )}
    >
      {visible.map(renderChip)}

      {overflow.length > 0 && (
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex h-6 w-full items-center justify-center rounded-lg border border-dashed text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              />
            }
          >
            +{overflow.length} more
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
              {site.name} · {formatACST(day, 'EEE d MMM')}
            </p>
            <div className="flex flex-col gap-1">{overflow.map(renderChip)}</div>
          </PopoverContent>
        </Popover>
      )}

      <button
        type="button"
        aria-label={`Add shift at ${site.name} on ${formatACST(day, 'EEE d MMM')}`}
        onClick={onAdd}
        className="mt-auto flex items-center justify-center rounded-lg border border-dashed border-transparent py-0.5 text-muted-foreground/0 transition-colors group-hover:border-border group-hover:text-muted-foreground hover:bg-muted focus-visible:border-border focus-visible:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Plus size={13} aria-hidden />
      </button>
    </div>
  );
}
