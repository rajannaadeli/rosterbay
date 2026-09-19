import { useState } from 'react';

import { EntityDrawer } from '@/components/entity-drawer';
import { CompliancePill, StatusPill, type StatusTone } from '@/components/status-pill';
import { UserAvatar } from '@/components/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { IssueList } from '@/features/proof/components/issue-list';
import { PhotoStrip, type ProofPhoto } from '@/features/proof/components/photo-proof';
import { ProgressRing } from '@/features/proof/components/progress-ring';
import { ShiftTaskEditor } from '@/features/proof/components/shift-task-editor';
import { useShiftIssues, useShiftTasks } from '@/features/proof/hooks';
import { tasksEditable } from '@/features/proof/task-instantiation';
import type { ShiftStatus, Tables, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { proofPhotoUrl } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Shift = Tables<'shifts'>;

const SHIFT_STATUS: Record<ShiftStatus, { tone: StatusTone; label: string }> = {
  open: { tone: 'danger', label: 'Unfilled' },
  assigned: { tone: 'success', label: 'Assigned' },
  in_progress: { tone: 'success', label: 'On site' },
  completed: { tone: 'success', label: 'Completed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
};

interface ShiftSheetProps {
  shift: Shift | null;
  siteName: string;
  worker: Views<'worker_overview'> | undefined;
  workerNames: Record<string, string>;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onUnassign: () => void;
  onCancelShift: () => void;
  onSaveTimes: (startHm: string, endHm: string) => void;
}

/**
 * The shift as a record of work: who, when, what was asked, what came back.
 * Promoted from the old centred dialog to the shared EntityDrawer — the task
 * editor, photo strip and issue list run well past what a popover can hold.
 */
export function ShiftSheet({
  shift,
  siteName,
  worker,
  workerNames,
  busy,
  onOpenChange,
  onUnassign,
  onCancelShift,
  onSaveTimes,
}: ShiftSheetProps) {
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  // Hold the last shift through the close animation so the drawer slides out
  // with its content intact (render-time state adjustment, as in SiteDrawer).
  const [closing, setClosing] = useState<Shift | null>(null);
  if (shift && shift.id !== closing?.id) setClosing(shift);
  const active = shift ?? closing;

  const tasks = useShiftTasks(active?.id ?? null);
  const issues = useShiftIssues(active?.id ?? null);

  if (!active) return null;
  const open = shift !== null;

  const startHm = start ?? formatACST(active.starts_at, 'HH:mm');
  const endHm = end ?? formatACST(active.ends_at, 'HH:mm');
  const dirty = start !== null || end !== null;
  const editable = tasksEditable(active.status);
  const status = SHIFT_STATUS[active.status];

  const taskList = tasks.data ?? [];
  const doneCount = taskList.filter((task) => task.done).length;
  const outstanding = taskList.length - doneCount;
  const finishedIncomplete = active.status === 'completed' && outstanding > 0;

  const photos: ProofPhoto[] = taskList.flatMap((task) => {
    const url = proofPhotoUrl(task.photo_url);
    if (!url) return [];
    return [
      {
        id: task.id,
        url,
        title: task.title,
        workerName: active.worker_id ? (workerNames[active.worker_id] ?? 'Worker') : 'Worker',
        at: task.done_at,
      },
    ];
  });

  const close = () => {
    setStart(null);
    setEnd(null);
    onOpenChange(false);
  };

  return (
    <EntityDrawer
      open={open}
      onOpenChange={(next) => !next && close()}
      dirty={dirty}
      srTitle={`${siteName} — ${formatACST(active.starts_at, 'EEE d MMM')}`}
      header={
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{siteName}</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatACST(active.starts_at, 'EEEE d MMMM')} ·{' '}
                {formatACST(active.starts_at, 'h:mm a')} – {formatACST(active.ends_at, 'h:mm a')}
              </p>
            </div>
            <StatusPill tone={status.tone} label={status.label} showIcon={false} />
          </div>

          {active.worker_id ? (
            <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
              <UserAvatar name={worker?.full_name ?? '—'} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{worker?.full_name ?? '—'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {worker?.job_title ?? active.role_required ?? 'Worker'}
                </p>
              </div>
              {worker && <CompliancePill status={worker.compliance_status} />}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
              Nobody assigned yet
              {active.role_required && <> · {active.role_required} needed</>}
            </div>
          )}
        </div>
      }
      footer={
        <>
          {active.worker_id && active.status === 'assigned' && (
            <Button variant="outline" size="sm" disabled={busy} onClick={onUnassign}>
              Unassign
            </Button>
          )}
          {dirty && (
            <Button size="sm" disabled={busy} onClick={() => onSaveTimes(startHm, endHm)}>
              {busy ? 'Saving…' : 'Save times'}
            </Button>
          )}
          {active.status !== 'completed' && active.status !== 'cancelled' && (
            <>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden />
              <Button variant="destructive" size="sm" disabled={busy} onClick={onCancelShift}>
                Cancel shift
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        {/* Progress + the shift's checklist. */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <ProgressRing
              done={doneCount}
              total={taskList.length}
              tone={finishedIncomplete ? 'warning' : 'primary'}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold tabular-nums">
                {doneCount}/{taskList.length} tasks
              </p>
              <p
                className={cn(
                  'text-xs',
                  finishedIncomplete ? 'text-warning' : 'text-muted-foreground',
                )}
              >
                {taskList.length === 0
                  ? 'No checklist on this shift'
                  : outstanding === 0
                    ? 'All tasks completed'
                    : finishedIncomplete
                      ? `${outstanding} not completed`
                      : `${outstanding} still outstanding`}
              </p>
            </div>
          </div>

          {tasks.isPending ? (
            <Skeleton className="h-24 rounded-lg" />
          ) : (
            <ShiftTaskEditor
              shiftId={active.id}
              companyId={active.company_id}
              shiftStatus={active.status}
              tasks={taskList}
              isPending={tasks.isPending}
            />
          )}
        </section>

        {/* Photo proof. */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Photo proof
          </h3>
          <PhotoStrip photos={photos} size={72} />
        </section>

        {/* Reported issues. */}
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Issues
            {(issues.data ?? []).some((issue) => issue.status === 'open') && (
              <Badge variant="secondary" className="text-micro tracking-normal text-danger">
                {(issues.data ?? []).filter((issue) => issue.status === 'open').length} open
              </Badge>
            )}
          </h3>
          {issues.isPending ? (
            <Skeleton className="h-14 rounded-lg" />
          ) : (
            <IssueList issues={issues.data ?? []} workerNames={workerNames} />
          )}
        </section>

        {/* Schedule — editable until the shift is a record. */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Schedule
          </h3>
          {editable ? (
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sheet-start">Start</Label>
                <Input
                  id="sheet-start"
                  type="time"
                  value={startHm}
                  onChange={(event) => setStart(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sheet-end">End</Label>
                <Input
                  id="sheet-end"
                  type="time"
                  value={endHm}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatACST(active.starts_at, 'h:mm a')} – {formatACST(active.ends_at, 'h:mm a')} ·
              times are locked once the shift completes.
            </p>
          )}
        </section>

        {active.notes && (
          <p
            className={cn(
              'rounded-lg border bg-muted/40 px-3 py-2 text-xs',
              active.notes.startsWith('OVERRIDE:') && 'border-warning/40 bg-warning/5 text-warning',
            )}
          >
            {active.notes}
          </p>
        )}
      </div>
    </EntityDrawer>
  );
}
