import {
  Certificate,
  ClockCountdown,
  MapPinArea,
  Megaphone,
  Pulse,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { addDays } from 'date-fns';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BroadcastDialog } from '@/features/offers/components/broadcast-dialog';
import { eligibleWorkers } from '@/features/offers/eligibility';
import { useBroadcastOffer, useOffersRealtime, useOpenOffers } from '@/features/offers/hooks';
import { KpiCard } from '@/features/dashboard/components/kpi-card';
import { LiveMap } from '@/features/dashboard/components/live-map';
import { useNotifications } from '@/features/notifications/hooks';
import { useAllWorkerCerts, useShiftsRange } from '@/features/roster/hooks';
import { useCertTypes } from '@/features/certs/hooks';
import { useSites } from '@/features/sites/hooks';
import { useLiveTimesheets, useTimesheets } from '@/features/timesheets/hooks';
import { useWorkers } from '@/features/workers/hooks';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

interface FeedItem {
  id: string;
  at: string;
  text: string;
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

  // Today + tomorrow window (ACST) for unfilled shifts.
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

  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    for (const row of timesheets.data ?? []) {
      const worker = workerNames[row.worker_id] ?? 'Worker';
      const site = siteNames[row.site_id] ?? 'site';
      items.push({
        id: `${row.id}-in`,
        at: row.clock_in_at,
        text: `${worker} clocked in at ${site} — ${formatACST(row.clock_in_at, 'h:mm a')}`,
      });
      if (row.clock_out_at) {
        items.push({
          id: `${row.id}-out`,
          at: row.clock_out_at,
          text: `${worker} clocked out of ${site} — ${formatACST(row.clock_out_at, 'h:mm a')}`,
        });
      }
      if (row.reviewed_at) {
        items.push({
          id: `${row.id}-review`,
          at: row.reviewed_at,
          text: `Timesheet ${row.status} for ${worker} at ${site}`,
        });
      }
    }
    for (const offer of openOffers.data ?? []) {
      items.push({
        id: `${offer.id}-broadcast`,
        at: offer.broadcast_at,
        text: `Shift offer broadcast — ${siteNames[offer.site_id] ?? 'site'}, ${formatACST(offer.shift_starts_at, 'EEE h:mma').toLowerCase()}`,
      });
    }
    for (const notification of notifications.data ?? []) {
      if (notification.kind === 'offer_filled' && notification.body) {
        items.push({ id: notification.id, at: notification.created_at, text: notification.body });
      }
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  }, [timesheets.data, openOffers.data, notifications.data, workerNames, siteNames]);

  const loading = timesheets.isPending || workers.isPending || sites.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          The ops manager's 7am — live across all five sites.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          title="On Site Now"
          value={onSite.length}
          icon={Pulse}
          to="/app/timesheets"
          loading={loading}
          tone={onSite.length > 0 ? 'success' : 'default'}
        />
        <KpiCard
          title="Unfilled Shifts Today"
          value={unfilledToday.length}
          icon={MapPinArea}
          to="/app/roster"
          loading={windowShifts.isPending}
          tone={unfilledToday.length > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          title="Certs Expiring ≤30d"
          value={expiringCerts.length}
          icon={Certificate}
          to="/app/workers?compliance=expiring_soon"
          loading={allCerts.isPending}
          tone={expiringCerts.length > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          title="Timesheets Awaiting Review"
          value={awaitingReview.length}
          icon={ClockCountdown}
          to="/app/timesheets?status=pending"
          loading={loading}
          tone={awaitingReview.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-lg border bg-card xl:col-span-2">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="text-sm font-semibold">Live map</h2>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-success" />
              {onSite.length} on site now
            </span>
          </div>
          <div className="h-[420px]">
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
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-lg border bg-card">
            <div className="border-b px-4 py-2.5">
              <h2 className="text-sm font-semibold">Needs attention</h2>
            </div>
            <ul className="max-h-64 divide-y overflow-y-auto">
              {loading ? (
                <li className="p-3">
                  <Skeleton className="h-12 rounded-lg" />
                </li>
              ) : (
                <>
                  {unfilled.map((shift) => (
                    <li key={shift.id} className="flex items-center gap-2 px-4 py-2.5">
                      <span className="size-2 shrink-0 rounded-full bg-danger" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-danger">
                          Unfilled — {siteNames[shift.site_id] ?? 'site'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatACST(shift.starts_at, 'EEE h:mma').toLowerCase()}–
                          {formatACST(shift.ends_at, 'h:mma').toLowerCase()}
                          {shift.role_required ? ` · ${shift.role_required}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-danger"
                        onClick={() => setBroadcastShiftId(shift.id)}
                      >
                        <Megaphone aria-hidden />
                        Broadcast
                      </Button>
                    </li>
                  ))}
                  {flagged.slice(0, 4).map((row) => (
                    <li key={row.id}>
                      <Link
                        to="/app/timesheets?status=flagged"
                        className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-muted/50"
                      >
                        <span className="size-2 shrink-0 rounded-full bg-warning" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            Flagged timesheet — {workerNames[row.worker_id] ?? 'worker'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.effective_flags.join(', ').replace(/_/g, ' ')} ·{' '}
                            {siteNames[row.site_id] ?? 'site'}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                  {[...expiredCerts, ...expiringCerts].map((cert) => (
                    <li key={cert.id}>
                      <Link
                        to={`/app/workers/${cert.worker_id}`}
                        className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-muted/50"
                      >
                        <span
                          className={cn(
                            'size-2 shrink-0 rounded-full',
                            cert.status === 'expired' ? 'bg-danger' : 'bg-warning',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {certTypeNames[cert.cert_type_id] ?? 'Certificate'}{' '}
                            {cert.status === 'expired' ? 'expired' : 'expiring'} —{' '}
                            {workerNames[cert.worker_id] ?? 'worker'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cert.status === 'expired'
                              ? `expired ${Math.abs(cert.days_until_expiry)} days ago`
                              : `${cert.days_until_expiry} days left`}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                  {unfilled.length + flagged.length + expiredCerts.length + expiringCerts.length ===
                    0 && (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                      All clear — nothing needs attention right now.
                    </li>
                  )}
                </>
              )}
            </ul>
          </section>

          <section className="overflow-hidden rounded-lg border bg-card">
            <div className="border-b px-4 py-2.5">
              <h2 className="text-sm font-semibold">Activity</h2>
            </div>
            <ul className="max-h-56 divide-y overflow-y-auto">
              {loading ? (
                <li className="p-3">
                  <Skeleton className="h-10 rounded-lg" />
                </li>
              ) : feed.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Activity appears here as the field moves.
                </li>
              ) : (
                feed.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      'px-4 py-2 text-sm',
                      item.at > mountedAt &&
                        'animate-in duration-200 fade-in slide-in-from-top-2',
                    )}
                  >
                    {item.text}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>

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
  );
}
