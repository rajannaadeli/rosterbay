import { Megaphone } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Tables, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';

interface BroadcastDialogProps {
  shift: Tables<'shifts'>;
  siteName: string;
  eligible: Views<'worker_overview'>[];
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BroadcastDialog({
  shift,
  siteName,
  eligible,
  pending,
  onClose,
  onConfirm,
}: BroadcastDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone size={18} weight="duotone" className="text-primary" aria-hidden />
            Broadcast this shift?
          </DialogTitle>
          <DialogDescription>
            {siteName} — {formatACST(shift.starts_at, 'EEE d MMM, h:mma').toLowerCase()}–
            {formatACST(shift.ends_at, 'h:mma').toLowerCase()}
            {shift.role_required ? ` · ${shift.role_required}` : ''}
          </DialogDescription>
        </DialogHeader>

        {eligible.length === 0 ? (
          <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
            No compliant, available workers match this shift — adjust the shift or assign
            manually with an override.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <span className="font-semibold text-primary">
                {eligible.length} compliant worker{eligible.length === 1 ? '' : 's'}
              </span>{' '}
              will be notified. First to accept gets the shift.
            </p>
            <p className="text-xs text-muted-foreground">
              {eligible.map((w) => w.full_name.split(' ')[0]).join(' · ')}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending || eligible.length === 0} onClick={onConfirm}>
            {pending ? 'Broadcasting…' : `Broadcast to ${eligible.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
