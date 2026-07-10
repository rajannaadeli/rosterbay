import { ArrowSquareOut, UsersThree } from '@phosphor-icons/react';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { StatChips } from '@/components/stat-chips';
import { CompliancePill } from '@/components/status-pill';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkerDrawer } from '@/features/workers/components/worker-drawer';
import { useWorkers } from '@/features/workers/hooks';
import type { CertStatus, Views } from '@/lib/database.types';
import { formatACST, initials } from '@/lib/format';

type WorkerRow = Views<'worker_overview'>;

const COMPLIANCE_RANK: Record<CertStatus, number> = { expired: 0, expiring_soon: 1, valid: 2 };

const columns: ColumnDef<WorkerRow>[] = [
  {
    accessorKey: 'full_name',
    header: 'Worker',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8">
          {row.original.avatar_url && <AvatarImage src={row.original.avatar_url} alt="" />}
          <AvatarFallback className="text-xs">{initials(row.original.full_name)}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{row.original.full_name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'job_title',
    header: 'Job title',
    filterFn: 'equals',
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.job_title}</span>,
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    enableSorting: false,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone}</span>,
  },
  {
    accessorKey: 'compliance_status',
    header: 'Compliance',
    filterFn: 'equals',
    sortingFn: (a, b) =>
      COMPLIANCE_RANK[a.original.compliance_status] - COMPLIANCE_RANK[b.original.compliance_status],
    cell: ({ row }) => <CompliancePill status={row.original.compliance_status} />,
  },
  {
    accessorKey: 'shifts_this_week',
    header: 'Shifts this week',
    meta: { className: 'text-right' },
    cell: ({ row }) => <span className="tabular-nums">{row.original.shifts_this_week}</span>,
  },
  {
    accessorKey: 'last_clock_in_at',
    header: 'Last clock-in',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.last_clock_in_at
          ? formatACST(row.original.last_clock_in_at, 'd MMM, h:mm a')
          : '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableGlobalFilter: false,
    meta: { className: 'w-24 text-right' },
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={(event: React.MouseEvent) => event.stopPropagation()}
        render={<Link to={`/app/workers/${row.original.id}`} />}
      >
        Profile
        <ArrowSquareOut aria-hidden />
      </Button>
    ),
  },
];

export function WorkersPage() {
  const workers = useWorkers();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [drawerWorkerId, setDrawerWorkerId] = useState<string | null>(null);

  const data = useMemo(() => workers.data ?? [], [workers.data]);

  const roles = useMemo(() => {
    const unique = new Set(data.map((w) => w.job_title).filter((t) => t !== null));
    return [...unique].sort();
  }, [data]);

  const stats = useMemo(
    () => ({
      total: data.length,
      valid: data.filter((w) => w.compliance_status === 'valid').length,
      expiring: data.filter((w) => w.compliance_status === 'expiring_soon').length,
      expired: data.filter((w) => w.compliance_status === 'expired').length,
      onSite: data.filter((w) => w.shifts_this_week > 0).length,
    }),
    [data],
  );

  const filterValue = (id: string) =>
    (columnFilters.find((f) => f.id === id)?.value as string | undefined) ?? 'all';

  const setFilter = (id: string, value: string | null) => {
    setColumnFilters((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (value !== null && value !== 'all') next.push({ id, value });
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Workers</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          The Torrens field team — compliance at a glance.
        </p>
      </div>

      <StatChips
        loading={workers.isPending}
        chips={[
          { label: 'Workers', value: stats.total },
          { label: 'Compliant', value: stats.valid, tone: 'success' },
          { label: 'Expiring', value: stats.expiring, tone: stats.expiring > 0 ? 'warning' : 'default' },
          { label: 'Expired', value: stats.expired, tone: stats.expired > 0 ? 'danger' : 'default' },
          { label: 'Rostered this week', value: stats.onSite },
        ]}
      />

      <DataTable
        columns={columns}
        data={data}
        loading={workers.isPending}
        searchable
        searchPlaceholder="Search name, title, phone…"
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        rowKey={(row) => row.id}
        onRowClick={(row) => setDrawerWorkerId(row.id)}
        emptyState={
          <EmptyState
            icon={UsersThree}
            title="No workers match"
            description="Try clearing the search or switching the role and compliance filters back to all."
            className="border-none"
          />
        }
        toolbar={
          <>
            <Select
              value={filterValue('job_title')}
              onValueChange={(value) => setFilter('job_title', value)}
            >
              <SelectTrigger size="sm" aria-label="Filter by role" className="w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map((jobTitle) => (
                  <SelectItem key={jobTitle} value={jobTitle}>
                    {jobTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterValue('compliance_status')}
              onValueChange={(value) => setFilter('compliance_status', value)}
            >
              <SelectTrigger size="sm" aria-label="Filter by compliance" className="w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All compliance</SelectItem>
                <SelectItem value="valid">Compliant</SelectItem>
                <SelectItem value="expiring_soon">Expiring</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <WorkerDrawer
        workerId={drawerWorkerId}
        onOpenChange={(open) => {
          if (!open) setDrawerWorkerId(null);
        }}
      />
    </div>
  );
}
