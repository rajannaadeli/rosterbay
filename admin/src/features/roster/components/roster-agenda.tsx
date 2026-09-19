import { CheckCircle, CircleHalf, MegaphoneSimple, Warning } from '@phosphor-icons/react';

import { StatusPill, type StatusTone } from '@/components/status-pill';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import type { ShiftStatus, Tables, Views } from '@/lib/database.types';
import { formatACST, formatShiftRange } from '@/lib/format';
import { cn } from '@/lib/utils';

type Shift = Tables<'shifts'>;
type WorkerRow = Views<'worker_overview'>;

// A filled shift's own state, in the semantic vocabulary: green once someone
// is on site or the work is done, amber while it is merely scheduled. Keyed by
// ShiftStatus so a new status can't silently fall through to "Assigned".
// `open` and `cancelled` never reach here — open shifts render the unfilled
// branch, and cancelled ones are filtered out upstream — but the maps stay
// total so the type checker keeps them honest.
const FILLED_TONE: Record<ShiftStatus, StatusTone> = {
  open: 'danger',
  assigned: 'warning',
  in_progress: 'success',
  completed: 'success',
  cancelled: 'warning',
};
const FILLED_LABEL: Record<ShiftStatus, string> = {
  open: 'Unfilled',
  assigned: 'Assigned',
  in_progress: 'On site',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface RosterAgendaProps {
  /** The ACST day being shown, yyyy-MM-dd. */
  ymd: string;
  sites: Tables<'job_sites'>[];
  /** Every shift loaded for the week; the agenda buckets them by ACST day. */
  shifts: Shift[];
  workerById: Map<string, WorkerRow>;
  offerShiftIds: Set<string>;
  proofByShift: Map<string, Views<'shift_proof_summary'>>;
  /** The "Unfilled only" toggle — here it filters rather than dims. */
  unfilledOnly: boolean;
  onShiftClick: (shiftId: string) => void;
  onBroadcast: (shiftId: string) => void;
}

/**
 * The roster on a phone.
 *
 * The day grid encodes time as horizontal position, which needs roughly 930px
 * before a shift bar is wide enough to label; the week grid needs 1080px. Both
 * are real instruments at their intended size and neither survives being
 * squeezed to 320px, so below `md` the same day becomes a vertical agenda:
 * sites in order, shifts under each one, sorted by start time.
 *
 * What the agenda gives up is position-as-time and drag-to-assign. What it
 * keeps is the question an ops manager actually opens their phone to answer —
 * what is running now, what is unfilled, and can I broadcast it from here —
 * and every row still opens the same shift sheet the grid does.
 */
export function RosterAgenda({
  ymd,
  sites,
  shifts,
  workerById,
  offerShiftIds,
  proofByShift,
  unfilledOnly,
  onShiftClick,
  onBroadcast,
}: RosterAgendaProps) {
  const dayShifts = shifts
    .filter((shift) => formatACST(shift.starts_at, 'yyyy-MM-dd') === ymd)
    .filter((shift) => !unfilledOnly || shift.worker_id === null)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const bySite = new Map<string, Shift[]>();
  for (const shift of dayShifts) {
    bySite.set(shift.site_id, [...(bySite.get(shift.site_id) ?? []), shift]);
  }

  if (dayShifts.length === 0) {
    return (
      <div className="e1 flex flex-col items-center gap-1 rounded-lg px-4 py-12 text-center">
        <p className="text-small font-medium">
          {unfilledOnly ? 'Nothing unfilled today' : 'Nothing rostered'}
        </p>
        <p className="text-micro tracking-normal text-text-tertiary">
          {unfilledOnly
            ? 'Every shift on this day has someone on it.'
            : 'No shifts start on this day at any site.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sites
        .filter((site) => bySite.has(site.id))
        .map((site) => {
          const siteShifts = bySite.get(site.id)!;
          const unfilledCount = siteShifts.filter((s) => s.worker_id === null).length;

          return (
            <section key={site.id} className="e1 overflow-hidden rounded-lg">
              <header className="flex items-center gap-2 border-b border-border-subtle bg-surface-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-small font-medium">{site.name}</p>
                  <p className="label-micro truncate">{site.client_name}</p>
                </div>
                <span className="num shrink-0 rounded-xs bg-surface-1 px-1.5 py-0.5 text-nano leading-none text-text-tertiary">
                  {siteShifts.length}
                </span>
                {unfilledCount > 0 && (
                  <span className="num shrink-0 rounded-xs bg-danger-muted px-1.5 py-0.5 text-nano leading-none font-medium text-danger">
                    {unfilledCount} unfilled
                  </span>
                )}
              </header>

              <ul className="flex flex-col">
                {siteShifts.map((shift) => (
                  <AgendaRow
                    key={shift.id}
                    shift={shift}
                    worker={shift.worker_id ? workerById.get(shift.worker_id) : undefined}
                    hasOpenOffer={offerShiftIds.has(shift.id)}
                    proof={proofByShift.get(shift.id)}
                    onOpen={() => onShiftClick(shift.id)}
                    onBroadcast={() => onBroadcast(shift.id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}

function AgendaRow({
  shift,
  worker,
  hasOpenOffer,
  proof,
  onOpen,
  onBroadcast,
}: {
  shift: Shift;
  worker: WorkerRow | undefined;
  hasOpenOffer: boolean;
  proof: Views<'shift_proof_summary'> | undefined;
  onOpen: () => void;
  onBroadcast: () => void;
}) {
  const unfilled = shift.worker_id === null;
  const tasksDone = proof && proof.tasks_total > 0 && proof.tasks_done >= proof.tasks_total;
  const tasksPartial = proof && proof.tasks_total > 0 && !tasksDone;

  return (
    <li className="border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {unfilled ? (
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-danger-muted text-danger"
              aria-hidden
            >
              <Warning size={16} weight="duotone" />
            </span>
          ) : (
            <UserAvatar name={worker?.full_name ?? 'Worker'} size="sm" />
          )}

          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-medium">
              {unfilled ? (shift.role_required ?? 'Unfilled shift') : (worker?.full_name ?? '—')}
            </span>
            <span className="num block truncate text-micro tracking-normal text-text-tertiary">
              {formatShiftRange(shift.starts_at, shift.ends_at)}
            </span>
          </span>

          {/* Proof-of-work state, matching the chip's glyph vocabulary. */}
          {tasksDone && (
            <CheckCircle
              size={15}
              weight="fill"
              className="shrink-0 text-success"
              aria-label="All tasks completed"
            />
          )}
          {tasksPartial && (
            <CircleHalf
              size={15}
              weight="duotone"
              className="shrink-0 text-text-tertiary"
              aria-label={`${proof.tasks_done} of ${proof.tasks_total} tasks completed`}
            />
          )}

          {unfilled ? (
            <StatusPill
              tone="danger"
              label={hasOpenOffer ? 'Offered' : 'Unfilled'}
              showIcon={false}
              className="shrink-0"
            />
          ) : (
            <StatusPill
              tone={FILLED_TONE[shift.status]}
              label={FILLED_LABEL[shift.status]}
              showIcon={false}
              className="shrink-0"
            />
          )}
        </button>

        {/* Broadcast is the phone-shaped way to fill a gap — drag-assign needs
            a grid, this needs one tap. */}
        {unfilled && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Broadcast this shift"
            className={cn('shrink-0 text-danger', hasOpenOffer && 'text-text-tertiary')}
            onClick={onBroadcast}
          >
            <MegaphoneSimple size={16} weight="duotone" aria-hidden />
          </Button>
        )}
      </div>
    </li>
  );
}
