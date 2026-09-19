import { CalendarCheck, CaretRight, CheckCircle, UsersThree, Warning, XCircle } from '@phosphor-icons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNowStrict } from 'date-fns';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { CopyButton } from '@/components/copy-button';
import { LoadBar } from '@/components/data-marks';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { FilterChip } from '@/components/filter-chip';
import { StatStrip } from '@/components/stat-strip';
import { CompliancePill } from '@/components/status-pill';
import { ComplianceRunwaySpark } from '@/features/workers/components/compliance-runway';
import { UserAvatar } from '@/components/user-avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkerDrawer } from '@/features/workers/components/worker-drawer';
import { useWorkers } from '@/features/workers/hooks';
import { useAllWorkerCerts } from '@/features/roster/hooks';
import type { CertStatus, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';

type WorkerRow = Views<'worker_overview'>;
type ComplianceFilter = 'all' | CertStatus;

const COMPLIANCE_RANK: Record<CertStatus, number> = { expired: 0, expiring_soon: 1, valid: 2 };

type CertsByWorker = Map<string, Views<'worker_certs_with_status'>[]>;

const buildColumns = (
  certsByWorker: CertsByWorker,
  shiftsPeak: number,
): ColumnDef<WorkerRow>[] => [
  {
    id: 'worker',
    header: 'Worker',
    accessorFn: (row) => `${row.full_name} ${row.job_title ?? ''}`,
    sortingFn: (a, b) => a.original.full_name.localeCompare(b.original.full_name),
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <UserAvatar name={row.original.full_name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.original.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.job_title}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    enableSorting: false,
    cell: ({ row }) => (
      // group/copy: the button only fades in on row hover or keyboard focus,
      // so 14 rows aren't peppered with icons at rest.
      <span className="group/copy flex items-center gap-1.5">
        <span className="num text-text-secondary">{row.original.phone}</span>
        {row.original.phone && (
          <CopyButton
            value={row.original.phone}
            label={`Copy ${row.original.full_name}'s phone number`}
          />
        )}
      </span>
    ),
  },
  {
    accessorKey: 'compliance_status',
    header: 'Compliance',
    sortingFn: (a, b) =>
      COMPLIANCE_RANK[a.original.compliance_status] - COMPLIANCE_RANK[b.original.compliance_status],
    cell: ({ row }) => (
      // Pill states *what*; the spark states *how much runway is left* — the
      // same geometry as the drawer's full runway, at one-lane resolution.
      <div className="flex w-28 flex-col gap-1.5">
        <CompliancePill status={row.original.compliance_status} />
        <ComplianceRunwaySpark certs={certsByWorker.get(row.original.id) ?? []} />
      </div>
    ),
  },
  {
    accessorKey: 'shifts_this_week',
    header: 'Shifts / wk',
    meta: { className: 'text-center' },
    cell: ({ row }) => (
      // Scaled to the busiest person on the team, not to an invented weekly
      // cap — the schema has no contracted-hours model, so relative load is a
      // fact where capacity would be a guess.
      <span className="mx-auto flex w-14 flex-col items-center gap-1">
        <span className="num">{row.original.shifts_this_week}</span>
        <LoadBar value={row.original.shifts_this_week} peak={shiftsPeak} />
      </span>
    ),
  },
  {
    accessorKey: 'last_clock_in_at',
    header: 'Last clock-in',
    cell: ({ row }) => {
      const at = row.original.last_clock_in_at;
      if (!at) return <span className="text-muted-foreground">—</span>;
      return (
        <Tooltip>
          <TooltipTrigger render={<span className="text-muted-foreground" />}>
            {formatDistanceToNowStrict(new Date(at), { addSuffix: true })
              .replace(/ seconds?/, 's')
              .replace(/ minutes?/, 'm')
              .replace(/ hours?/, 'h')
              .replace(/ days?/, 'd')
              .replace(/ months?/, 'mo')}
          </TooltipTrigger>
          <TooltipContent>{formatACST(at, 'd MMM yyyy, h:mm a')}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableGlobalFilter: false,
    meta: { className: 'w-10 text-right' },
    cell: () => <CaretRight size={14} className="text-muted-foreground/50" aria-hidden />,
  },
];

export function WorkersPage() {
  const workers = useWorkers();
  const allCerts = useAllWorkerCerts();
  const certsByWorker = useMemo(() => {
    const map: CertsByWorker = new Map();
    for (const cert of allCerts.data ?? []) {
      const list = map.get(cert.worker_id) ?? [];
      list.push(cert);
      map.set(cert.worker_id, list);
    }
    return map;
  }, [allCerts.data]);
  const shiftsPeak = useMemo(
    () => Math.max(1, ...(workers.data ?? []).map((w) => w.shifts_this_week)),
    [workers.data],
  );
  const columns = useMemo(
    () => buildColumns(certsByWorker, shiftsPeak),
    [certsByWorker, shiftsPeak],
  );
  const [searchParams, setSearchParams] = useSearchParams();

  const [role, setRole] = useState('all');
  const [compliance, setCompliance] = useState<ComplianceFilter>(() => {
    const c = searchParams.get('compliance');
    return c === 'valid' || c === 'expiring_soon' || c === 'expired' ? c : 'all';
  });

  // Drawer state lives in the URL (?open=<id>) so palette/dashboard deep-link.
  const drawerWorkerId = searchParams.get('open');
  const openWorker = (workerId: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('open', workerId);
      return next;
    });
  const closeWorker = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('open');
      return next;
    });

  const all = useMemo(() => workers.data ?? [], [workers.data]);

  const roles = useMemo(() => {
    const unique = new Set(all.map((w) => w.job_title).filter((t) => t !== null));
    return [...unique].sort();
  }, [all]);

  const data = useMemo(
    () =>
      all.filter(
        (w) =>
          (role === 'all' || w.job_title === role) &&
          (compliance === 'all' || w.compliance_status === compliance),
      ),
    [all, role, compliance],
  );

  const stats = useMemo(
    () => ({
      total: all.length,
      valid: all.filter((w) => w.compliance_status === 'valid').length,
      expiring: all.filter((w) => w.compliance_status === 'expiring_soon').length,
      expired: all.filter((w) => w.compliance_status === 'expired').length,
      onSite: all.filter((w) => w.shifts_this_week > 0).length,
    }),
    [all],
  );

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Workers"
          description="The Torrens field team — compliance at a glance."
        />

        <StatStrip
          loading={workers.isPending}
          segments={[
            {
              label: 'Workers',
              value: stats.total,
              icon: UsersThree,
              onClick: () => setCompliance('all'),
              active: compliance === 'all',
            },
            {
              label: 'Compliant',
              value: stats.valid,
              icon: CheckCircle,
              tone: 'success',
              onClick: () => setCompliance('valid'),
              active: compliance === 'valid',
            },
            {
              label: 'Expiring',
              value: stats.expiring,
              icon: Warning,
              tone: stats.expiring > 0 ? 'warning' : 'default',
              onClick: () => setCompliance('expiring_soon'),
              active: compliance === 'expiring_soon',
            },
            {
              label: 'Expired',
              value: stats.expired,
              icon: XCircle,
              tone: stats.expired > 0 ? 'danger' : 'default',
              onClick: () => setCompliance('expired'),
              active: compliance === 'expired',
            },
            { label: 'Rostered this week', value: stats.onSite, icon: CalendarCheck },
          ]}
        />

        <DataTable
          columns={columns}
          data={data}
          loading={workers.isPending}
          searchable
          searchPlaceholder="Search name, designation, phone…"
          pageSize={25}
          rowKey={(row) => row.id}
          onRowClick={(row) => openWorker(row.id)}
          renderMobileCard={(row) => (
            <WorkerCard
              worker={row}
              certs={certsByWorker.get(row.id) ?? []}
              shiftsPeak={shiftsPeak}
            />
          )}
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
              <FilterChip
                label="Role"
                value={role}
                onChange={setRole}
                options={[
                  { value: 'all', label: 'All' },
                  ...roles.map((r) => ({ value: r, label: r })),
                ]}
              />
              <FilterChip
                label="Compliance"
                value={compliance}
                onChange={(v) => setCompliance(v as ComplianceFilter)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'valid', label: 'Compliant' },
                  { value: 'expiring_soon', label: 'Expiring' },
                  { value: 'expired', label: 'Expired' },
                ]}
              />
            </>
          }
        />

        <WorkerDrawer
          workerId={drawerWorkerId}
          onOpenChange={(open) => {
            if (!open) closeWorker();
          }}
        />
      </div>
    </TooltipProvider>
  );
}

/**
 * One worker, as a phone card.
 *
 * The table's six columns become two rows: who they are and how compliant
 * they are on top, then the numbers. Compliance keeps its pill *and* its
 * runway spark — it is the column the page exists for, so it is the one that
 * must not be dropped when the width is. The phone number becomes a `tel:`
 * link rather than a copy button: on the device where this layout renders,
 * calling is the action, and copying is not.
 */
function WorkerCard({
  worker,
  certs,
  shiftsPeak,
}: {
  worker: WorkerRow;
  certs: Views<'worker_certs_with_status'>[];
  shiftsPeak: number;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <UserAvatar name={worker.full_name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{worker.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{worker.job_title}</p>
        </div>
        <CompliancePill status={worker.compliance_status} />
      </div>

      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="label-micro">Runway</span>
          <ComplianceRunwaySpark certs={certs} />
        </span>
        <span className="flex shrink-0 flex-col gap-1">
          <span className="label-micro">Shifts / wk</span>
          <span className="flex items-center gap-1.5">
            <span className="num text-small">{worker.shifts_this_week}</span>
            <LoadBar value={worker.shifts_this_week} peak={shiftsPeak} />
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {worker.phone ? (
          <a
            href={`tel:${worker.phone.replace(/\s/g, '')}`}
            className="num -m-2 flex min-h-11 items-center p-2 text-text-secondary underline-offset-2 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {worker.phone}
          </a>
        ) : (
          <span>—</span>
        )}
        <span className="truncate">
          {worker.last_clock_in_at
            ? `Last in ${formatDistanceToNowStrict(new Date(worker.last_clock_in_at), {
                addSuffix: true,
              })}`
            : 'Never clocked in'}
        </span>
      </div>
    </div>
  );
}
