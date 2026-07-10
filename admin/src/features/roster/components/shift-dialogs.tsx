import { zodResolver } from '@hookform/resolvers/zod';
import { Prohibit, Warning } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Tables } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AssignmentCheck } from '../conflict-engine';

type Shift = Tables<'shifts'>;

// ── Create shift ──────────────────────────────────────────────────────────────

/** AU shift slang presets — keep these exact labels (spec §4.4). */
const PRESETS = [
  { id: 'morning', label: 'Morning (6–2)', start: '06:00', end: '14:00' },
  { id: 'arvo', label: 'Arvo (2–10)', start: '14:00', end: '22:00' },
  { id: 'night', label: 'Night (10–6)', start: '22:00', end: '06:00' },
] as const;

const createShiftSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
  role_required: z.string(),
  notes: z.string(),
});

export type CreateShiftValues = z.infer<typeof createShiftSchema>;

interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteName: string;
  dateYmd: string;
  roles: string[];
  pending: boolean;
  onSubmit: (values: CreateShiftValues) => void;
}

export function CreateShiftDialog({
  open,
  onOpenChange,
  siteName,
  dateYmd,
  roles,
  pending,
  onSubmit,
}: CreateShiftDialogProps) {
  const form = useForm<CreateShiftValues>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: { start: '06:00', end: '14:00', role_required: 'Cleaner', notes: '' },
  });
  const [preset, setPreset] = useState<string>('morning');

  const applyPreset = (id: string) => {
    setPreset(id);
    const found = PRESETS.find((p) => p.id === id);
    if (found) {
      form.setValue('start', found.start);
      form.setValue('end', found.end);
    }
  };

  const close = () => {
    onOpenChange(false);
    form.reset();
    setPreset('morning');
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New shift — {siteName}</DialogTitle>
          <DialogDescription>
            {formatACST(`${dateYmd}T00:00:00+09:30`, 'EEEE d MMMM yyyy')}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex gap-2" role="group" aria-label="Time presets">
            {PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={preset === p.id ? 'default' : 'outline'}
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shift-start">Start</Label>
              <Input
                id="shift-start"
                type="time"
                {...form.register('start', { onChange: () => setPreset('') })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shift-end">End</Label>
              <Input
                id="shift-end"
                type="time"
                {...form.register('end', { onChange: () => setPreset('') })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            An end time at or before the start rolls into the next day (night shifts).
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-role">Role required</Label>
            <Select
              value={form.watch('role_required')}
              onValueChange={(value) => form.setValue('role_required', value ?? 'Cleaner')}
            >
              <SelectTrigger id="shift-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-notes">Notes</Label>
            <Textarea id="shift-notes" rows={2} {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Shift detail (edit / unassign / cancel) ───────────────────────────────────

interface ShiftDetailDialogProps {
  shift: Shift | null;
  siteName: string;
  workerName: string | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onUnassign: () => void;
  onCancelShift: () => void;
  onSaveTimes: (startHm: string, endHm: string) => void;
}

export function ShiftDetailDialog({
  shift,
  siteName,
  workerName,
  pending,
  onOpenChange,
  onUnassign,
  onCancelShift,
  onSaveTimes,
}: ShiftDetailDialogProps) {
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  if (!shift) return null;

  const startHm = start ?? formatACST(shift.starts_at, 'HH:mm');
  const endHm = end ?? formatACST(shift.ends_at, 'HH:mm');
  const dirty = start !== null || end !== null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {siteName} — {formatACST(shift.starts_at, 'EEE d MMM')}
          </DialogTitle>
          <DialogDescription>
            {workerName ? `Assigned to ${workerName}` : 'Unfilled'} ·{' '}
            <span className="capitalize">{shift.status.replace('_', ' ')}</span>
            {shift.role_required && <> · {shift.role_required}</>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-start">Start</Label>
            <Input
              id="detail-start"
              type="time"
              value={startHm}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-end">End</Label>
            <Input
              id="detail-end"
              type="time"
              value={endHm}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
        </div>

        {shift.notes && (
          <p
            className={cn(
              'rounded-lg border bg-muted/40 px-3 py-2 text-xs',
              shift.notes.startsWith('OVERRIDE:') && 'border-warning/40 bg-warning/5 text-warning',
            )}
          >
            {shift.notes}
          </p>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {shift.worker_id && shift.status === 'assigned' && (
            <Button variant="outline" disabled={pending} onClick={onUnassign}>
              Unassign
            </Button>
          )}
          {shift.status !== 'completed' && shift.status !== 'cancelled' && (
            <Button variant="destructive" disabled={pending} onClick={onCancelShift}>
              Cancel shift
            </Button>
          )}
          {dirty && (
            <Button disabled={pending} onClick={() => onSaveTimes(startHm, endHm)}>
              {pending ? 'Saving…' : 'Save times'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Conflict resolution ───────────────────────────────────────────────────────

export interface PendingAssignment {
  shiftId: string;
  workerId: string;
  workerName: string;
  check: AssignmentCheck;
}

interface ConflictDialogProps {
  pendingAssignment: PendingAssignment | null;
  busy: boolean;
  onClose: () => void;
  onProceed: (overrideReason?: string) => void;
}

export function ConflictDialog({ pendingAssignment, busy, onClose, onProceed }: ConflictDialogProps) {
  const [reason, setReason] = useState('');

  if (!pendingAssignment) return null;
  const { check, workerName } = pendingAssignment;

  const isBlock = check.verdict === 'block';
  const overridable = isBlock && check.blocks.every((block) => block.overridable);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={cn('flex items-center gap-2', isBlock ? 'text-danger' : 'text-warning')}>
            {isBlock ? (
              <Prohibit size={18} weight="duotone" aria-hidden />
            ) : (
              <Warning size={18} weight="duotone" aria-hidden />
            )}
            {isBlock ? "Can't assign" : 'Check before assigning'}
          </DialogTitle>
          <DialogDescription>{workerName}</DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {check.blocks.map((block, index) => (
            <li
              key={index}
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
            >
              {block.message}
              {!block.overridable && (
                <span className="mt-1 block text-xs font-medium">
                  Double-bookings can never be overridden.
                </span>
              )}
            </li>
          ))}
          {check.warnings.map((warning, index) => (
            <li
              key={index}
              className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning"
            >
              {warning.message}
            </li>
          ))}
        </ul>

        {overridable && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-reason">Override reason (required, logged on the shift)</Label>
            <Textarea
              id="override-reason"
              rows={2}
              placeholder="e.g. Verbal confirmation renewal completed — certificate arriving Monday."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {overridable && (
            <Button
              variant="destructive"
              disabled={busy || reason.trim().length === 0}
              onClick={() => onProceed(reason.trim())}
            >
              {busy ? 'Assigning…' : 'Override & assign'}
            </Button>
          )}
          {check.verdict === 'warn' && (
            <Button disabled={busy} onClick={() => onProceed()}>
              {busy ? 'Assigning…' : 'Assign anyway'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
