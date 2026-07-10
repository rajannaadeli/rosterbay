import { CalendarBlank } from '@phosphor-icons/react';

import { EmptyState } from '@/components/empty-state';
import { StatusPill } from '@/components/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/lib/database.types';
import { formatACST } from '@/lib/format';

interface ShiftHistoryProps {
  shifts: Tables<'shifts'>[] | undefined;
  sites: Tables<'job_sites'>[] | undefined;
  isPending: boolean;
}

export function ShiftHistory({ shifts, sites, isPending }: ShiftHistoryProps) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if ((shifts?.length ?? 0) === 0) {
    return (
      <EmptyState
        icon={CalendarBlank}
        title="No shifts yet"
        description="This worker hasn't been rostered on. Their shift history builds here automatically."
      />
    );
  }

  const siteById = new Map((sites ?? []).map((site) => [site.id, site]));

  return (
    <ul className="flex flex-col divide-y rounded-lg border bg-card">
      {shifts?.map((shift) => (
        <li key={shift.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {siteById.get(shift.site_id)?.name ?? 'Job site'}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatACST(shift.starts_at, 'EEE d MMM, h:mm a')} –{' '}
              {formatACST(shift.ends_at, 'h:mm a')}
            </p>
          </div>
          {shift.status === 'in_progress' ? (
            <StatusPill tone="success" label="On site" />
          ) : (
            <span className="text-xs text-muted-foreground capitalize">{shift.status}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
