import { CaretDown, CaretRight, CaretUpDown, CheckCircle, Clock, DotsThree, DownloadSimple, MapPin, Question } from '@phosphor-icons/react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/empty-state';
import { FilterChip } from '@/components/filter-chip';
import { StatusPill, type StatusTone } from '@/components/status-pill';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSites } from '@/features/sites/hooks';
import { ReviewPanel } from '@/features/timesheets/components/review-panel';
import { exportTimesheetsCsv } from '@/features/timesheets/csv';
import {
  useBulkApprove,
  useLiveTimesheets,
  useReviewEntry,
  useTimesheets,
  type TimesheetRow,
} from '@/features/timesheets/hooks';
import { useWorkers } from '@/features/workers/hooks';
import type { TimeEntryFlag, TimeEntryStatus } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { acstWeekStart, weekDays } from '@/lib/week';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'flagged' | 'approved' | 'rejected';
type DatePreset = 'this-week' | 'last-week' | 'custom';

const STATUS_TONE: Record<TimeEntryStatus, StatusTone> = {
  pending: 'warning',
  approved: 'success',
  flagged: 'danger',
  rejected: 'danger',
};
const STATUS_LABEL: Record<TimeEntryStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  flagged: 'Flagged',
  rejected: 'Rejected',
};
const FLAG_META: Record<TimeEntryFlag, { icon: typeof Clock; label: string }> = {
  late: { icon: Clock, label: 'Late clock-in' },
  out_of_zone: { icon: MapPin, label: 'Clocked in outside the geofence' },
  missing_clock_out: { icon: Question, label: 'Missing clock-out' },
};

function variance(row: TimesheetRow): number | null {
  if (!row.clock_out_at) return null;
  const actual = new Date(row.clock_out_at).getTime() - new Date(row.clock_in_at).getTime();
  const scheduled = new Date(row.shift_ends_at).getTime() - new Date(row.shift_starts_at).getTime();
  return Math.round((actual - scheduled) / 60_000);
}

function weekRange(offset: number) {
  const days = weekDays(acstWeekStart(offset));
  return { from: formatACST(days[0]!, 'yyyy-MM-dd'), to: formatACST(days[6]!, 'yyyy-MM-dd') };
}

/**
 * Per-row action buttons — owns its own useReviewEntry so that clicking
 * Approve on one row doesn't force a columns-memo invalidation (which
 * would re-mount every cell and flash all hidden approve buttons).
 */
function RowActions({ row }: { row: Row<TimesheetRow> }) {
  const r = row.original;
  const reviewable = r.effective_status === 'pending' || r.effective_status === 'flagged';
  const review = useReviewEntry();

  if (!reviewable) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      {r.effective_status === 'flagged' && !row.getIsExpanded() && (
        <Button
          size="sm"
          variant="ghost"
          className="text-warning hover:text-warning"
          onClick={(e) => {
            e.stopPropagation();
            row.toggleExpanded(true);
          }}
        >
          Review
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        disabled={review.isPending}
        onClick={(e) => {
          e.stopPropagation();
          review.mutate({ id: r.id, status: 'approved' });
        }}
      >
        <CheckCircle aria-hidden />
        Approve
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="More actions"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <DotsThree size={16} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => review.mutate({ id: r.id, status: 'rejected' })}
          >
            Reject entry
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function TimesheetsPage() {
  const timesheets = useTimesheets();
  const workers = useWorkers();
  const sites = useSites();
  const review = useReviewEntry();
  const bulk = useBulkApprove();
  const liveIds = useLiveTimesheets();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<StatusFilter>(() => {
    const p = searchParams.get('status');
    return p === 'pending' || p === 'flagged' || p === 'approved' || p === 'rejected' ? p : 'all';
  });
  const [workerId, setWorkerId] = useState('all');
  const [siteId, setSiteId] = useState('all');
  const [preset, setPreset] = useState<DatePreset>('this-week');
  const [custom, setCustom] = useState(() => weekRange(0));
  const [sorting, setSorting] = useState<SortingState>([]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const range = preset === 'this-week' ? weekRange(0) : preset === 'last-week' ? weekRange(-1) : custom;

  const workerNames = useMemo(
    () => Object.fromEntries((workers.data ?? []).map((w) => [w.id, w.full_name])),
    [workers.data],
  );
  const siteById = useMemo(() => new Map((sites.data ?? []).map((s) => [s.id, s])), [sites.data]);
  const siteNames = useMemo(
    () => Object.fromEntries((sites.data ?? []).map((s) => [s.id, s.name])),
    [sites.data],
  );

  const dateFiltered = useMemo(
    () =>
      (timesheets.data ?? []).filter((row) => {
        const ymd = formatACST(row.shift_starts_at, 'yyyy-MM-dd');
        if (range.from && ymd < range.from) return false;
        if (range.to && ymd > range.to) return false;
        if (workerId !== 'all' && row.worker_id !== workerId) return false;
        if (siteId !== 'all' && row.site_id !== siteId) return false;
        return true;
      }),
    [timesheets.data, range.from, range.to, workerId, siteId],
  );

  const counts = useMemo(
    () => ({
      all: dateFiltered.length,
      pending: dateFiltered.filter((r) => r.effective_status === 'pending').length,
      flagged: dateFiltered.filter((r) => r.effective_status === 'flagged').length,
      approved: dateFiltered.filter((r) => r.effective_status === 'approved').length,
    }),
    [dateFiltered],
  );

  const data = useMemo(
    () =>
      [...dateFiltered]
        .filter((r) => status === 'all' || r.effective_status === status)
        .sort((a, b) => b.clock_in_at.localeCompare(a.clock_in_at)),
    [dateFiltered, status],
  );

  const cleanPendingIds = useMemo(
    () =>
      dateFiltered
        .filter((r) => r.effective_status === 'pending' && r.effective_flags.length === 0)
        .map((r) => r.id),
    [dateFiltered],
  );

  const columns = useMemo<ColumnDef<TimesheetRow>[]>(
    () => [
      {
        id: 'expander',
        header: '',
        enableSorting: false,
        meta: { className: 'w-8' },
        cell: ({ row }) => (
          <button
            type="button"
            aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
          >
            {row.getIsExpanded() ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
          </button>
        ),
      },
      {
        accessorKey: 'worker_id',
        header: 'Worker',
        sortingFn: (a, b) =>
          (workerNames[a.original.worker_id] ?? '').localeCompare(
            workerNames[b.original.worker_id] ?? '',
          ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <UserAvatar name={workerNames[row.original.worker_id] ?? '—'} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{workerNames[row.original.worker_id] ?? '—'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {siteNames[row.original.site_id] ?? '—'}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'scheduled',
        header: 'Scheduled',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatACST(row.original.shift_starts_at, 'h:mma').toLowerCase()}–
            {formatACST(row.original.shift_ends_at, 'h:mma').toLowerCase()}
          </span>
        ),
      },
      {
        id: 'actual',
        header: 'Actual',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-foreground tabular-nums">
            {formatACST(row.original.clock_in_at, 'h:mma').toLowerCase()}–
            {row.original.clock_out_at
              ? formatACST(row.original.clock_out_at, 'h:mma').toLowerCase()
              : '…'}
          </span>
        ),
      },
      {
        id: 'variance',
        header: 'Variance',
        accessorFn: (row) => variance(row) ?? 0,
        meta: { className: 'w-20' },
        cell: ({ row }) => {
          const v = variance(row.original);
          if (v === null) return <span className="text-xs text-muted-foreground">—</span>;
          const beyondGrace = Math.abs(v) > 5;
          return (
            <span
              className={cn(
                'rounded-lg px-1.5 py-0.5 text-xs font-medium tabular-nums',
                beyondGrace ? 'bg-warning/10 text-warning' : 'text-muted-foreground',
              )}
            >
              {v >= 0 ? '+' : '−'}
              {Math.abs(v)}m
            </span>
          );
        },
      },
      {
        id: 'flags',
        header: 'Flags',
        enableSorting: false,
        meta: { className: 'w-16' },
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            {row.original.effective_flags.map((flag) => {
              const meta = FLAG_META[flag];
              return (
                <Tooltip key={flag}>
                  <TooltipTrigger render={<span className="inline-flex" aria-label={meta.label} />}>
                    <meta.icon size={14} weight="duotone" className="text-danger" aria-hidden />
                  </TooltipTrigger>
                  <TooltipContent>{meta.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </span>
        ),
      },
      {
        accessorKey: 'effective_status',
        header: 'Status',
        meta: { className: 'w-28' },
        cell: ({ row }) => (
          <StatusPill
            tone={STATUS_TONE[row.original.effective_status]}
            label={STATUS_LABEL[row.original.effective_status]}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        meta: { className: 'w-28 text-right' },
        cell: ({ row }) => <RowActions row={row} />,
      },
    ],
    [workerNames, siteNames],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const isPending = timesheets.isPending || workers.isPending || sites.isPending;
  const rows = table.getRowModel().rows;

  const countChip = (key: StatusFilter, label: string, value: number, tone: StatusTone | 'default') => (
    <button
      type="button"
      onClick={() => setStatus((s) => (s === key ? 'all' : key))}
      className={cn(
        'flex items-baseline gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors',
        status === key ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-semibold tabular-nums',
          tone === 'warning' && value > 0 && 'text-warning',
          tone === 'danger' && value > 0 && 'text-danger',
          tone === 'success' && 'text-success',
        )}
      >
        {value}
      </span>
    </button>
  );

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Review clock-ins — flags explain themselves, clean entries approve in bulk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={cleanPendingIds.length === 0 || bulk.isPending}
              onClick={() => setBulkOpen(true)}
            >
              Approve {cleanPendingIds.length} clean
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.length === 0}
              onClick={() => exportTimesheetsCsv(data, workerNames, siteNames, range.from, range.to)}
            >
              <DownloadSimple aria-hidden />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Count chips drive the status filter. */}
        <div className="flex flex-wrap items-center gap-2">
          {countChip('all', 'Entries', counts.all, 'default')}
          {countChip('pending', 'Pending', counts.pending, 'warning')}
          {countChip('flagged', 'Flagged', counts.flagged, 'danger')}
          {countChip('approved', 'Approved', counts.approved, 'success')}
        </div>

        {/* Filter bar. */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2.5">
          <FilterChip
            label="Worker"
            value={workerId}
            onChange={setWorkerId}
            options={[
              { value: 'all', label: 'All' },
              ...(workers.data ?? []).map((w) => ({ value: w.id, label: w.full_name })),
            ]}
          />
          <FilterChip
            label="Site"
            value={siteId}
            onChange={setSiteId}
            options={[
              { value: 'all', label: 'All' },
              ...(sites.data ?? []).map((s) => ({ value: s.id, label: s.name })),
            ]}
          />

          <div className="mx-1 h-5 w-px bg-border" />

          <div className="flex items-center gap-1">
            {(['this-week', 'last-week', 'custom'] as DatePreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                  preset === p ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/50',
                )}
              >
                {p === 'this-week' ? 'This week' : p === 'last-week' ? 'Last week' : 'Custom'}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-1.5">
              <Label htmlFor="ts-from" className="sr-only">
                From
              </Label>
              <Input
                id="ts-from"
                type="date"
                className="h-8 w-36 bg-background"
                value={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                aria-label="To"
                type="date"
                className="h-8 w-36 bg-background"
                value={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              />
            </div>
          )}
        </div>

        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No timesheet entries"
            description="Nothing matches these filters — widen the date range or clear the status filter."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="max-h-[calc(100vh-19rem)] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        return (
                          <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                            {header.isPlaceholder ? null : canSort ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                <CaretUpDown size={12} className="text-muted-foreground/60" aria-hidden />
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => {
                    const day = formatACST(row.original.shift_starts_at, 'yyyy-MM-dd');
                    const prevDay =
                      index > 0 ? formatACST(rows[index - 1]!.original.shift_starts_at, 'yyyy-MM-dd') : null;
                    const showDay = day !== prevDay;
                    return (
                      <Fragment key={row.id}>
                        {showDay && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell
                              colSpan={columns.length}
                              className="bg-muted/30 py-1.5 text-xs font-semibold text-muted-foreground"
                            >
                              {formatACST(row.original.shift_starts_at, 'EEEE d MMMM')}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow
                          className={cn(
                            'group cursor-pointer',
                            liveIds.has(row.id) && 'animate-in fade-in slide-in-from-top-2 duration-200',
                          )}
                          onClick={() => row.toggleExpanded()}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                        {row.getIsExpanded() && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={columns.length} className="p-0">
                              <ReviewPanel
                                row={row.original}
                                site={siteById.get(row.original.site_id)}
                                busy={review.isPending}
                                onReview={(next) => review.mutate({ id: row.original.id, status: next })}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
                onClick={() => bulk.mutate(cleanPendingIds, { onSuccess: () => setBulkOpen(false) })}
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
