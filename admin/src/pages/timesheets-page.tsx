import { ClockCountdown, DownloadSimple } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/empty-state';
import { StatChips } from '@/components/stat-chips';
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
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSites } from '@/features/sites/hooks';
import { TimesheetRowItem } from '@/features/timesheets/components/timesheet-row';
import { exportTimesheetsCsv } from '@/features/timesheets/csv';
import {
  useBulkApprove,
  useLiveTimesheets,
  useReviewEntry,
  useTimesheets,
  type TimesheetRow,
} from '@/features/timesheets/hooks';
import { useWorkers } from '@/features/workers/hooks';
import { formatACST } from '@/lib/format';
import { acstWeekStart, weekDays } from '@/lib/week';

type StatusFilter = 'all' | 'pending' | 'flagged' | 'approved' | 'rejected';

export function TimesheetsPage() {
  const timesheets = useTimesheets();
  const workers = useWorkers();
  const sites = useSites();
  const review = useReviewEntry();
  const bulk = useBulkApprove();
  const liveIds = useLiveTimesheets();

  const defaultWeek = useMemo(() => {
    const days = weekDays(acstWeekStart(0));
    return {
      from: formatACST(days[0]!, 'yyyy-MM-dd'),
      to: formatACST(days[6]!, 'yyyy-MM-dd'),
    };
  }, []);

  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>(() => {
    const param = searchParams.get('status');
    return param === 'pending' || param === 'flagged' || param === 'approved' || param === 'rejected'
      ? param
      : 'all';
  });
  const [workerId, setWorkerId] = useState('all');
  const [siteId, setSiteId] = useState('all');
  const [from, setFrom] = useState(defaultWeek.from);
  const [to, setTo] = useState(defaultWeek.to);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const workerNames = useMemo(
    () => Object.fromEntries((workers.data ?? []).map((w) => [w.id, w.full_name])),
    [workers.data],
  );
  const siteById = useMemo(
    () => new Map((sites.data ?? []).map((s) => [s.id, s])),
    [sites.data],
  );
  const siteNames = useMemo(
    () => Object.fromEntries((sites.data ?? []).map((s) => [s.id, s.name])),
    [sites.data],
  );

  const filtered = useMemo(() => {
    return (timesheets.data ?? []).filter((row) => {
      const ymd = formatACST(row.shift_starts_at, 'yyyy-MM-dd');
      if (from && ymd < from) return false;
      if (to && ymd > to) return false;
      if (status !== 'all' && row.effective_status !== status) return false;
      if (workerId !== 'all' && row.worker_id !== workerId) return false;
      if (siteId !== 'all' && row.site_id !== siteId) return false;
      return true;
    });
  }, [timesheets.data, status, workerId, siteId, from, to]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimesheetRow[]>();
    for (const row of filtered) {
      const ymd = formatACST(row.shift_starts_at, 'yyyy-MM-dd');
      const list = map.get(ymd) ?? [];
      list.push(row);
      map.set(ymd, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      pending: filtered.filter((r) => r.effective_status === 'pending').length,
      flagged: filtered.filter((r) => r.effective_status === 'flagged').length,
      approved: filtered.filter((r) => r.effective_status === 'approved').length,
    }),
    [filtered],
  );

  /** Bulk-approve targets: clean pending only — flagged rows are never touched. */
  const cleanPendingIds = useMemo(
    () =>
      filtered
        .filter((r) => r.effective_status === 'pending' && r.effective_flags.length === 0)
        .map((r) => r.id),
    [filtered],
  );

  const isPending = timesheets.isPending || workers.isPending || sites.isPending;

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Timesheets</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Review clock-ins — flags explain themselves, clean entries approve in bulk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={cleanPendingIds.length === 0 || bulk.isPending}
              onClick={() => setBulkOpen(true)}
            >
              Approve {cleanPendingIds.length} clean
            </Button>
            <Button
              variant="outline"
              disabled={filtered.length === 0}
              onClick={() => exportTimesheetsCsv(filtered, workerNames, siteNames, from, to)}
            >
              <DownloadSimple aria-hidden />
              Export CSV
            </Button>
          </div>
        </div>

        <StatChips
          loading={isPending}
          chips={[
            { label: 'Entries', value: stats.total },
            { label: 'Pending', value: stats.pending, tone: stats.pending > 0 ? 'warning' : 'default' },
            { label: 'Flagged', value: stats.flagged, tone: stats.flagged > 0 ? 'danger' : 'default' },
            { label: 'Approved', value: stats.approved, tone: 'success' },
          ]}
        />

        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card px-4 py-3">
          <Select value={status} onValueChange={(v) => setStatus((v as StatusFilter | null) ?? 'all')}>
            <SelectTrigger size="sm" aria-label="Filter by status" className="w-36 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={workerId} onValueChange={(v) => setWorkerId(v ?? 'all')}>
            <SelectTrigger size="sm" aria-label="Filter by worker" className="w-44 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workers</SelectItem>
              {(workers.data ?? []).map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={siteId} onValueChange={(v) => setSiteId(v ?? 'all')}>
            <SelectTrigger size="sm" aria-label="Filter by site" className="w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {(sites.data ?? []).map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="ts-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="ts-from"
              type="date"
              className="h-8 w-36 bg-background"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Label htmlFor="ts-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="ts-to"
              type="date"
              className="h-8 w-36 bg-background"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={ClockCountdown}
            title="No timesheet entries"
            description="Nothing matches these filters — widen the date range or clear the status filter."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(([ymd, rows]) => (
              <section key={ymd} className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold">
                  {formatACST(`${ymd}T00:00:00+09:30`, 'EEEE d MMMM')}
                </h2>
                <ul className="overflow-hidden rounded-lg border bg-card">
                  {rows.map((row) => (
                    <TimesheetRowItem
                      key={row.id}
                      row={row}
                      workerName={workerNames[row.worker_id] ?? '—'}
                      site={siteById.get(row.site_id)}
                      expanded={expandedId === row.id}
                      isLive={liveIds.has(row.id)}
                      busy={review.isPending}
                      onToggle={() => setExpandedId((id) => (id === row.id ? null : row.id))}
                      onReview={(next) => review.mutate({ id: row.id, status: next })}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve {cleanPendingIds.length} clean entries?</DialogTitle>
              <DialogDescription>
                Only pending entries with no flags are touched — flagged entries stay put for
                individual review.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={bulk.isPending}
                onClick={() =>
                  bulk.mutate(cleanPendingIds, { onSuccess: () => setBulkOpen(false) })
                }
              >
                {bulk.isPending ? 'Approving…' : `Approve ${cleanPendingIds.length}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
