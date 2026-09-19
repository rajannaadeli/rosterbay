import { CaretDown, CaretRight, CaretUpDown, CheckCircle, Clock, DotsThree, DownloadSimple, ListChecks, MapPin, Question } from '@phosphor-icons/react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { AttendanceBar, DeviationBar } from '@/components/data-marks';
import { PageHeader } from '@/components/page-header';
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
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
const FLAG_META: Record<TimeEntryFlag, { icon: typeof Clock; label: string; tone: string }> = {
  late: { icon: Clock, label: 'Late clock-in', tone: 'text-danger' },
  out_of_zone: { icon: MapPin, label: 'Clocked in outside the geofence', tone: 'text-danger' },
  missing_clock_out: { icon: Question, label: 'Missing clock-out', tone: 'text-danger' },
  // A review signal, not a failure — amber, and it never blocks approval.
  incomplete_tasks: { icon: ListChecks, label: 'Tasks not completed', tone: 'text-warning' },
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
        // Hover-reveal is a mouse idiom. On a coarse pointer the row's only
        // approve affordance would otherwise be invisible and undiscoverable.
        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 coarse:opacity-100"
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
              className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 coarse:opacity-100"
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
  // ?entry=<id> lands on one row expanded (dashboard attention rows link here).
  const [expanded, setExpanded] = useState<ExpandedState>(() => {
    const entryId = searchParams.get('entry');
    return entryId ? { [entryId]: true } : {};
  });

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
          <span className="num text-micro tracking-normal text-text-tertiary">
            {formatACST(row.original.shift_starts_at, 'h:mma').toLowerCase()}–
            {formatACST(row.original.shift_ends_at, 'h:mma').toLowerCase()}
          </span>
        ),
      },
      {
        id: 'attendance',
        header: 'Attended',
        enableSorting: false,
        meta: { className: 'w-40' },
        cell: ({ row }) => (
          // Scheduled track with the actual span drawn under it: a bar
          // starting right of the track is a late clock-in, one ending short
          // is an early finish. The times stay below in mono — the shape is
          // added, not substituted.
          <span className="flex w-36 flex-col gap-0.5">
            <AttendanceBar
              scheduledStart={row.original.shift_starts_at}
              scheduledEnd={row.original.shift_ends_at}
              actualStart={row.original.clock_in_at}
              actualEnd={row.original.clock_out_at}
            />
            <span className="num text-nano text-text-secondary">
              {formatACST(row.original.clock_in_at, 'h:mma').toLowerCase()}–
              {row.original.clock_out_at
                ? formatACST(row.original.clock_out_at, 'h:mma').toLowerCase()
                : '…'}
            </span>
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
          if (v === null) {
            return <span className="text-micro tracking-normal text-text-tertiary">—</span>;
          }
          const beyondGrace = Math.abs(v) > 5;
          return (
            <span className="flex w-16 flex-col gap-1">
              <span
                className={cn(
                  'num text-micro font-medium tracking-normal',
                  beyondGrace ? 'text-warning' : 'text-text-tertiary',
                )}
              >
                {v >= 0 ? '+' : '−'}
                {Math.abs(v)}m
              </span>
              <DeviationBar value={v} />
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
              // Skip rather than crash if the server grows a flag this client
              // doesn't know about yet (deploy ordering, stale tab).
              const meta = FLAG_META[flag] as (typeof FLAG_META)[TimeEntryFlag] | undefined;
              if (!meta) return null;
              return (
                <Tooltip key={flag}>
                  <TooltipTrigger render={<span className="inline-flex" aria-label={meta.label} />}>
                    <meta.icon size={14} weight="duotone" className={meta.tone} aria-hidden />
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
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
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
        'flex shrink-0 items-baseline gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors coarse:min-h-11 coarse:items-center',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
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
        <PageHeader
          title="Timesheets"
          description="Review clock-ins — flags explain themselves, clean entries approve in bulk."
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={cleanPendingIds.length === 0 || bulk.isPending}
                onClick={() => setBulkOpen(true)}
              >
                Approve <span className="num">{cleanPendingIds.length}</span> clean
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={data.length === 0}
                onClick={() =>
                  exportTimesheetsCsv(data, workerNames, siteNames, range.from, range.to)
                }
              >
                <DownloadSimple aria-hidden />
                Export CSV
              </Button>
            </>
          }
        />

        {/* Count chips drive the status filter. They scroll as one row on a
            phone rather than wrapping — four short chips reading as a single
            switch is clearer than two ragged rows of two. */}
        <div className="scroll-x-contained scrollbar-thin -mx-4 flex items-center gap-2 px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {countChip('all', 'Entries', counts.all, 'default')}
          {countChip('pending', 'Pending', counts.pending, 'warning')}
          {countChip('flagged', 'Flagged', counts.flagged, 'danger')}
          {countChip('approved', 'Approved', counts.approved, 'success')}
        </div>

        {/* Filter bar. */}
        <div className="e1 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5">
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
                  'shrink-0 rounded-lg border px-2.5 py-1 text-xs transition-colors coarse:min-h-11 coarse:px-3',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  preset === p ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/50',
                )}
              >
                {p === 'this-week' ? 'This week' : p === 'last-week' ? 'Last week' : 'Custom'}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex w-full items-center gap-1.5 sm:w-auto">
              <Label htmlFor="ts-from" className="sr-only">
                From
              </Label>
              <Input
                id="ts-from"
                type="date"
                className="h-8 w-full bg-background sm:w-36"
                value={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                aria-label="To"
                type="date"
                className="h-8 w-full bg-background sm:w-36"
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
          <div className="e1 overflow-hidden rounded-lg">
            {/* Phone: a card per entry, grouped by day exactly as the table
                is. Eight columns cannot be made legible at 320px, and a
                horizontal scroller would bury the flags — which are the only
                reason anyone opens this screen. */}
            <div className="flex flex-col md:hidden">
              {rows.map((row, index) => {
                const day = formatACST(row.original.shift_starts_at, 'yyyy-MM-dd');
                const prevDay =
                  index > 0
                    ? formatACST(rows[index - 1]!.original.shift_starts_at, 'yyyy-MM-dd')
                    : null;
                return (
                  <Fragment key={`m-${row.id}`}>
                    {day !== prevDay && (
                      <p className="sticky top-0 z-10 border-b border-border-subtle bg-surface-2 px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                        {formatACST(row.original.shift_starts_at, 'EEEE d MMMM')}
                      </p>
                    )}
                    <div
                      className={cn(
                        'border-b border-border-subtle last:border-b-0',
                        liveIds.has(row.id) &&
                          'animate-in fade-in slide-in-from-top-2 duration-200',
                      )}
                    >
                      <TimesheetCard
                        row={row.original}
                        expanded={row.getIsExpanded()}
                        onToggle={() => row.toggleExpanded()}
                        workerName={workerNames[row.original.worker_id] ?? '—'}
                        siteName={siteNames[row.original.site_id] ?? '—'}
                      />
                      {row.getIsExpanded() && (
                        <ReviewPanel
                          row={row.original}
                          site={siteById.get(row.original.site_id)}
                          workerNames={workerNames}
                          busy={review.isPending}
                          onReview={(next) =>
                            review.mutate({ id: row.original.id, status: next })
                          }
                        />
                      )}
                    </div>
                  </Fragment>
                );
              })}
            </div>

            <div className="hidden max-h-[calc(100dvh-19rem)] overflow-auto scrollbar-thin md:block">
              <table className="relative w-full caption-bottom text-sm">
                <TableHeader className="sticky top-0 z-10 bg-surface-2 shadow-[0_1px_0_var(--border-default)]">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        return (
                          <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                            {header.isPlaceholder ? null : canSort ? (
                              <button
                                type="button"
                                className="label-micro inline-flex items-center gap-1 rounded-xs transition-colors duration-[var(--duration-micro)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                <CaretUpDown size={12} className="text-text-tertiary" aria-hidden />
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
                              {/* w-0 min-w-full: the panel fills the row but
                                  never contributes to the table's max-content
                                  width, so a long issue note wraps instead of
                                  stretching every column. */}
                              <div className="w-0 min-w-full">
                              <ReviewPanel
                                row={row.original}
                                site={siteById.get(row.original.site_id)}
                                workerNames={workerNames}
                                busy={review.isPending}
                                onReview={(next) => review.mutate({ id: row.original.id, status: next })}
                              />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </table>
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

/**
 * One time entry, as a phone card.
 *
 * Two departures from the table, both deliberate:
 *
 *  - Flags are spelled out. In the table they are bare icons whose meaning
 *    lives in a tooltip, and a tooltip is a mouse affordance — on touch the
 *    flag would be an unexplained glyph next to somebody's pay.
 *  - Approve and Review are always-visible full-height buttons rather than
 *    hover-revealed ghosts, because approving is the task this screen exists
 *    for and a phone has no hover to reveal them with.
 */
function TimesheetCard({
  row,
  expanded,
  onToggle,
  workerName,
  siteName,
}: {
  row: TimesheetRow;
  expanded: boolean;
  onToggle: () => void;
  workerName: string;
  siteName: string;
}) {
  const review = useReviewEntry();
  const reviewable = row.effective_status === 'pending' || row.effective_status === 'flagged';
  const delta = variance(row);

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex items-start gap-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <UserAvatar name={workerName} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{workerName}</span>
          <span className="block truncate text-xs text-muted-foreground">{siteName}</span>
        </span>
        <StatusPill
          tone={STATUS_TONE[row.effective_status]}
          label={STATUS_LABEL[row.effective_status]}
        />
        {expanded ? (
          <CaretDown size={14} className="mt-1 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <CaretRight size={14} className="mt-1 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="num text-text-secondary">
          {formatACST(row.clock_in_at, 'h:mma').toLowerCase()}
          {'–'}
          {row.clock_out_at ? formatACST(row.clock_out_at, 'h:mma').toLowerCase() : '…'}
        </span>
        <span className="num">
          sched {formatACST(row.shift_starts_at, 'h:mma').toLowerCase()}
          {'–'}
          {formatACST(row.shift_ends_at, 'h:mma').toLowerCase()}
        </span>
        {delta !== null && delta !== 0 && (
          <span className={cn('num', delta > 0 ? 'text-text-secondary' : 'text-danger')}>
            {delta > 0 ? '+' : ''}
            {delta}m
          </span>
        )}
      </div>

      {/* Named, not iconified — see the note above. */}
      {row.effective_flags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {row.effective_flags.map((flag) => {
            const meta = FLAG_META[flag];
            if (!meta) return null;
            return (
              <li
                key={flag}
                className={cn(
                  'flex items-center gap-1 rounded-xs bg-surface-2 px-1.5 py-1 text-nano leading-none font-medium tracking-normal',
                  meta.tone,
                )}
              >
                <meta.icon size={12} weight="duotone" aria-hidden />
                {meta.label}
              </li>
            );
          })}
        </ul>
      )}

      {reviewable && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={review.isPending}
            onClick={() => review.mutate({ id: row.id, status: 'approved' })}
          >
            <CheckCircle aria-hidden />
            Approve
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={onToggle}>
            {expanded ? 'Hide detail' : 'Review'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="icon-sm" variant="ghost" aria-label="More actions" />
              }
            >
              <DotsThree size={16} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => review.mutate({ id: row.id, status: 'rejected' })}
              >
                Reject entry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
