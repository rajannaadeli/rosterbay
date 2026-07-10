import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateAvailabilityNotes } from '@/features/workers/hooks';

interface AvailabilityNotesProps {
  workerId: string;
  notes: string | null;
}

export function AvailabilityNotes({ workerId, notes }: AvailabilityNotesProps) {
  const [value, setValue] = useState(notes ?? '');
  const update = useUpdateAvailabilityNotes(workerId);
  const dirty = value !== (notes ?? '');

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="availability-notes">Availability notes</Label>
      <Textarea
        id="availability-notes"
        placeholder="e.g. Mornings only — school pickup at 3pm."
        value={value}
        rows={3}
        onChange={(event) => setValue(event.target.value)}
      />
      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setValue(notes ?? '')}>
            Discard
          </Button>
          <Button
            size="sm"
            disabled={update.isPending}
            onClick={() => update.mutate(value.trim() === '' ? null : value.trim())}
          >
            {update.isPending ? 'Saving…' : 'Save notes'}
          </Button>
        </div>
      )}
    </div>
  );
}
