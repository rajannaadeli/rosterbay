import {
  Certificate,
  ClockCountdown,
  MapPinArea,
  Megaphone,
  Pulse,
  Warning,
  XCircle,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { addDays } from 'date-fns';

import { StatStrip } from '@/components/stat-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityFeed, type ActivityItem } from '@/features/dashboard/components/activity-feed';
import { LiveMap } from '@/features/dashboard/components/live-map';
import { BroadcastDialog } from '@/features/offers/components/broadcast-dialog';
import { eligibleWorkers } from '@/features/offers/eligibility';
import { useBroadcastOffer, useOffersRealtime, useOpenOffers } from '@/features/offers/hooks';
import { useNotifications } from '@/features/notifications/hooks';
import { useAllWorkerCerts, useShiftsRange } from '@/features/roster/hooks';
import { useCertTypes } from '@/features/certs/hooks';
import { useSites } from '@/features/sites/hooks';
import { useLiveTimesheets, useTimesheets } from '@/features/timesheets/hooks';
import { useWorkers } from '@/features/workers/hooks';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AttentionRow {
  id: string;
  severity: 'danger' | 'warning';
  title: string;
  subtitle: string;
  to?: string;
  broadcastShiftId?: string;
}

export function DashboardPage() {
  const timesheets = useTimesheets();
  useLiveTimesheets();
  const workers = useWorkers();
  const sites = useSites();
  const certTypes = useCertTypes();
  const allCerts = useAllWorkerCerts();
  const openOffers = useOpenOffers();
  const notifications = useNotifications();
  const broadcast = useBroadcastOffer();
  useOffersRealtime();

  const todayYmd = formatACST(new Date(), 'yyyy-MM-dd');
  const tomorrowYmd = formatACST(addDays(new Date(), 1), 'yyyy-MM-dd');
  const windowFrom = useMemo(() => new Date(`${todayYmd}T00:00:00+09:30`).toISOString(), [todayYmd]);
  const windowTo = useMemo(
    () => new Date(`${tomorrowYmd}T23:59:59+09:30`).toISOString(),
    [tomorrowYmd],
  );
  const windowShifts = useShiftsRange(windowFrom, windowTo);

  const [broadcastShiftId, setBroadcastShiftId] = useState<string | null>(null);
  const [mountedAt] = useState(() => new Date().toISOString());

  const workerNames = useMemo(
    () => Object.fromEntries((workers.data ?? []).map((w) => [w.id, w.full_name])),
    [workers.data],
  );
  const siteNames = useMemo(
    () => Object.fromEntries((sites.data ?? []).map((s) => [s.id, s.name])),
    [sites.data],
  );
  const certTypeNames = useMemo(
    () => Object.fromEntries((certTypes.data ?? []).map((c) => [c.id, c.name])),
    [certTypes.data],
  );
  const certRows = allCerts.data;
  const certsByWorker = useMemo(() => {
    const map = new Map<string, NonNullable<typeof certRows>>();
    for (const cert of certRows ?? []) {
      const list = map.get(cert.worker_id) ?? [];
      list.push(cert);
      map.set(cert.worker_id, list);
    }
    return map;
  }, [certRows]);

  const onSite = useMemo(
    () =>
      (timesheets.data ?? []).filter(
        (row) => row.clock_out_at === null && row.shift_status === 'in_progress',
      ),
    [timesheets.data],
  );
  const unfilled = useMemo(
    () =>
      (windowShifts.data ?? [])
        .filter((s) => s.status === 'open')
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [windowShifts.data],
  );
  const unfilledToday = unfilled.filter((s) => formatACST(s.starts_at, 'yyyy-MM-dd') === todayYmd);
  const expiringCerts = (allCerts.data ?? []).filter((c) => c.status === 'expiring_soon');
  const expiredCerts = (allCerts.data ?? []).filter((c) => c.status === 'expired');
  const awaitingReview = (timesheets.data ?? []).filter(
    (r) => r.effective_status === 'pending' || r.effective_status === 'flagged',
  );
  const flagged = (timesheets.data ?? []).filter((r) => r.effective_status === 'flagged');

  const attention: AttentionRow[] = useMemo(() => {
    const rows: AttentionRow[] = [];
    for (const shift of unfilled) {
      rows.push({
        id: `unfilled-${shift.id}`,
        severity: 'danger',
        title: `Unfilled — ${siteNames[shift.site_id] ?? 'site'}`,
        subtitle: `${formatACST(shift.starts_at, 'EEE h:mma').toLowerCase()}–${formatACST(shift.ends_at, 'h:mma').toLowerCase()}${shift.role_required ? ` · ${shift.role_required}` : ''}`,
        broadcastShiftId: shift.id,
      });
    }
    for (const row of flagged.slice(0, 4)) {
      rows.push({
        id: `flagged-${row.id}`,
        severity: 'warning',
        title: `Flagged timesheet — ${workerNames[row.worker_id] ?? 'worker'}`,
        subtitle: `${row.effective_flags.join(', ').replace(/_/g, ' ')} · ${siteNames[row.site_id] ?? 'site'}`,
        to: '/app/timesheets?status=flagged',
      });
    }
    for (const cert of [...expiredCerts, ...expiringCerts]) {
      rows.push({
        id: `cert-${cert.id}`,
        severity: cert.status === 'expired' ? 'danger' : 'warning',
        title: `${certTypeNames[cert.cert_type_id] ?? 'Certificate'} ${cert.status === 'expired' ? 'expired' : 'expiring'} — ${workerNames[cert.worker_id] ?? 'worker'}`,
        subtitle:
          cert.status === 'expired'
            ? `expired ${Math.abs(cert.days_until_expiry)} days ago`
            : `${cert.days_until_expiry} days left`,
        to: `/app/workers?open=${cert.worker_id}`,
      });
    }
    return rows;
  }, [unfilled, flagged, expiredCerts, expiringCerts, siteNames, workerNames, certTypeNames]);

  const feed: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    for (const row of timesheets.data ?? []) {
      const worker = workerNames[row.worker_id] ?? 'Worker';
      const site = siteNames[row.site_id] ?? 'site';
      items.push({
        id: `${row.id}-in`,
        at: row.clock_in_at,
        kind: 'clock_in',
        actor: worker,
        lead: worker,
        detail: `clocked in at ${site}`,
      });
      if (row.clock_out_at) {
        items.push({
          id: `${row.id}-out`,
          at: row.clock_out_at,
          kind: 'clock_out',
          actor: worker,
          lead: worker,
          detail: `clocked out of ${site}`,
        });
      }
      if (row.reviewed_at) {
        items.push({
          id: `${row.id}-review`,
          at: row.reviewed_at,
          kind: 'approval',
          actor: worker,
          lead: `Timesheet ${row.status}`,
          detail: `for ${worker} at ${site}`,
        });
      }
    }
    for (const offer of openOffers.data ?? []) {
      items.push({
        id: `${offer.id}-broadcast`,
        at: offer.broadcast_at,
        kind: 'offer',
        actor: null,
        lead: 'Shift broadcast',
        detail: `${siteNames[offer.site_id] ?? 'site'} · ${formatACST(offer.shift_starts_at, 'EEE h:mma').toLowerCase()}`,
      });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 14);
  }, [timesheets.data, openOffers.data, workerNames, siteNames]);
  void notifications;

  const loading = timesheets.isPending || workers.isPending || sites.isPending;

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The ops manager's 7am — live across all five sites.
          </p>
        </div>

        <StatStrip
          loading={loading}
          segments={[
            {
              label: 'On Site Now',
              value: onSite.length,
              icon: Pulse,
              to: '/app/timesheets',
              tone: onSite.length > 0 ? 'success' : 'default',
              animate: true,
            },
            {
              label: 'Unfilled Today',
              value: unfilledToday.length,
              icon: MapPinArea,
              to: '/app/roster',
              tone: unfilledToday.length > 0 ? 'danger' : 'default',
              animate: true,
            },
            {
              label: 'Certs Expiring ≤30d',
              value: expiringCerts.length,
              icon: Certificate,
              to: '/app/workers?compliance=expiring_soon',
              tone: expiringCerts.length > 0 ? 'warning' : 'default',
              animate: true,
            },
            {
              label: 'Awaiting Review',
              value: awaitingReview.length,
              icon: ClockCountdown,
              to: '/app/timesheets?status=pending',
              tone: awaitingReview.length > 0 ? 'warning' : 'default',
              animate: true,
            },
          ]}
        />

        {/* Row 1: map (7) + needs attention (5), equal height. */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="relative h-[380px] overflow-hidden rounded-lg border bg-card xl:col-span-7">
            {sites.data ? (
              <LiveMap
                sites={sites.data}
                onSite={onSite}
                workerNames={workerNames}
                siteNames={siteNames}
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
            <div
              style={{ zIndex: 400 }}
              className="pointer-events-none absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border bg-card/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              {onSite.length} on site now
            </div>
          </div>

          <section className="flex h-[380px] flex-col overflow-hidden rounded-lg border bg-card xl:col-span-5">
            <div className="flex items-center gap-2 border-b px-4 py-2.5">
              <h2 className="text-sm font-semibold">Needs attention</h2>
              {attention.length > 0 && (
                <Badge variant="secondary" className="text-[11px] text-danger">
                  {attention.length}
                </Badge>
              )}
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto">
              <ul className="scroll-fade-y flex flex-col pb-4">
                {loading ? (
                  <li className="p-3">
                    <Skeleton className="h-12 rounded-lg" />
                  </li>
                ) : attention.length === 0 ? (
                  <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                    All clear — nothing needs attention right now.
                  </li>
                ) : (
                  attention.map((row) => (
                    <AttentionRowItem
                      key={row.id}
                      row={row}
                      onBroadcast={
                        row.broadcastShiftId
                          ? () => setBroadcastShiftId(row.broadcastShiftId!)
                          : undefined
                      }
                    />
                  ))
                )}
              </ul>
            </div>
          </section>
        </div>

        {/* Row 2: activity, full width. */}
        <section className="flex max-h-80 flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <h2 className="text-sm font-semibold">Activity</h2>
            <span className="flex items-center gap-1 rounded-lg bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Live
            </span>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3">
                <Skeleton className="h-10 rounded-lg" />
              </div>
            ) : feed.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Activity appears here as the field moves.
              </p>
            ) : (
              <div className="scroll-fade-y pb-4">
                <ActivityFeed items={feed} mountedAt={mountedAt} />
              </div>
            )}
          </div>
        </section>

        {broadcastShiftId &&
          (() => {
            const shift = unfilled.find((s) => s.id === broadcastShiftId);
            const site = (sites.data ?? []).find((s) => s.id === shift?.site_id);
            if (!shift || !site) return null;
            const eligible = eligibleWorkers({
              shift,
              site,
              workers: workers.data ?? [],
              certsByWorker,
              weekShifts: windowShifts.data ?? [],
              certTypeNames,
            });
            return (
              <BroadcastDialog
                shift={shift}
                siteName={site.name}
                eligible={eligible}
                pending={broadcast.isPending}
                onClose={() => setBroadcastShiftId(null)}
                onConfirm={() =>
                  broadcast.mutate(
                    { shift, siteName: site.name, eligibleWorkerIds: eligible.map((w) => w.id) },
                    { onSuccess: () => setBroadcastShiftId(null) },
                  )
                }
              />
            );
          })()}
      </div>
    </TooltipProvider>
  );
}

function AttentionRowItem({ row, onBroadcast }: { row: AttentionRow; onBroadcast?: () => void }) {
  const SeverityIcon = row.severity === 'danger' ? XCircle : Warning;
  const body = (
    <div className="group flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-lg',
          row.severity === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning',
        )}
      >
        <SeverityIcon size={14} weight="duotone" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <Tooltip>
          <TooltipTrigger render={<p className="truncate text-sm font-medium" />}>
            {row.title}
          </TooltipTrigger>
          <TooltipContent>{row.title}</TooltipContent>
        </Tooltip>
        <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
      </div>
      {onBroadcast && (
        <Button
          size="sm"
          variant="ghost"
          className="text-danger opacity-60 transition-opacity group-hover:opacity-100"
          onClick={(event) => {
            event.preventDefault();
            onBroadcast();
          }}
        >
          <Megaphone aria-hidden />
          Broadcast
        </Button>
      )}
    </div>
  );

  return <li>{row.to ? <Link to={row.to}>{body}</Link> : body}</li>;
}
