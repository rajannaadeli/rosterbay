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

import { PageHeader } from '@/components/page-header';
import { RefreshButton } from '@/components/refresh-button';
import {
  DayTrackSpark,
  PresenceSpark,
  ReviewSplitSpark,
  RunwaySpark,
} from '@/components/stat-spark';
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
import {
  useOpenIssues,
  useProofRealtime,
  useProofSummaries,
  useRecentTaskActivity,
} from '@/features/proof/hooks';
import { useAllWorkerCerts, useShiftsRange } from '@/features/roster/hooks';
import { useCertTypes } from '@/features/certs/hooks';
import { useSites } from '@/features/sites/hooks';
import { useLiveTimesheets, useTimesheets } from '@/features/timesheets/hooks';
import { useWorkers } from '@/features/workers/hooks';
import { formatACST } from '@/lib/format';
import { dayWindow, minutesInto } from '@/features/roster/time-axis';
import { cn } from '@/lib/utils';

interface AttentionRow {
  id: string;
  severity: 'danger' | 'warning';
  title: string;
  subtitle: string;
  to?: string;
  broadcastShiftId?: string;
}

/**
 * The live indicator. Opacity-only pulse, so under prefers-reduced-motion it
 * degrades to a solid dot rather than disappearing — "live" is information,
 * not decoration.
 */
function LiveDot({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'shrink-0 animate-[live-pulse_2s_var(--ease-inout)_infinite] rounded-full bg-success',
        size === 'sm' ? 'size-1.5' : 'size-2',
      )}
    />
  );
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

  // Proof-of-work window: yesterday and today's shifts, plus tomorrow's.
  const [proofFrom] = useState(() => new Date(Date.now() - 48 * 3_600_000).toISOString());
  const [proofTo] = useState(() => new Date(Date.now() + 24 * 3_600_000).toISOString());
  const proofSummaries = useProofSummaries(proofFrom, proofTo);
  const openIssues = useOpenIssues();
  const proofShiftIds = useMemo(
    () => (proofSummaries.data ?? []).map((row) => row.shift_id),
    [proofSummaries.data],
  );
  const taskActivity = useRecentTaskActivity(proofShiftIds);
  useProofRealtime();

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

  /** Completed shifts in the last 48h that came back with tasks outstanding. */
  const incompleteShifts = useMemo(
    () =>
      (proofSummaries.data ?? [])
        .filter(
          (row) =>
            row.shift_status === 'completed' &&
            row.tasks_total > 0 &&
            row.tasks_done < row.tasks_total,
        )
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    [proofSummaries.data],
  );

  /** shift_id → time entry, so a tasks-incomplete row can open its timesheet. */
  const entryByShift = useMemo(
    () => new Map((timesheets.data ?? []).map((row) => [row.shift_id, row.id])),
    [timesheets.data],
  );

  // Spark inputs. Every one is derived from data the page already holds; the
  // strip issues no query of its own.
  const unfilledWindows = useMemo<[number, number][]>(() => {
    const win = dayWindow(todayYmd);
    return unfilledToday.map((shift) => [
      Math.max(0, minutesInto(win, shift.starts_at)),
      Math.min(win.lengthMin, minutesInto(win, shift.ends_at)),
    ]);
  }, [unfilledToday, todayYmd]);

  const expiringDays = useMemo(
    () => expiringCerts.map((cert) => cert.days_until_expiry),
    [expiringCerts],
  );

  const pendingCount = useMemo(
    () => awaitingReview.filter((row) => row.effective_status === 'pending').length,
    [awaitingReview],
  );
  const flaggedCount = awaitingReview.length - pendingCount;

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
    for (const issue of openIssues.data ?? []) {
      rows.push({
        id: `issue-${issue.id}`,
        severity: 'danger',
        title: `Issue reported — ${issue.site_id ? (siteNames[issue.site_id] ?? 'site') : 'site'}`,
        subtitle: `${workerNames[issue.worker_id] ?? 'worker'} · ${issue.note}`,
        to: `/app/roster?shift=${issue.shift_id}`,
      });
    }
    for (const summary of incompleteShifts) {
      const entryId = entryByShift.get(summary.shift_id);
      rows.push({
        id: `incomplete-${summary.shift_id}`,
        severity: 'warning',
        title: `Tasks incomplete — ${summary.worker_id ? (workerNames[summary.worker_id] ?? 'worker') : 'unassigned'} · ${siteNames[summary.site_id] ?? 'site'}`,
        subtitle: `${summary.tasks_total - summary.tasks_done} of ${summary.tasks_total} not completed · ${formatACST(summary.starts_at, 'EEE h:mma').toLowerCase()}`,
        to: entryId ? `/app/timesheets?entry=${entryId}` : '/app/timesheets',
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
  }, [
    unfilled,
    openIssues.data,
    incompleteShifts,
    entryByShift,
    flagged,
    expiredCerts,
    expiringCerts,
    siteNames,
    workerNames,
    certTypeNames,
  ]);

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

    // Proof of work: photos as they land, and a shift closing out at 100%.
    const summaryByShift = new Map(
      (proofSummaries.data ?? []).map((summary) => [summary.shift_id, summary]),
    );
    for (const task of taskActivity.data ?? []) {
      const summary = summaryByShift.get(task.shift_id);
      if (!summary || task.photo_url === null || task.done_at === null) continue;
      const worker = summary.worker_id ? (workerNames[summary.worker_id] ?? 'Worker') : 'Worker';
      items.push({
        id: `${task.id}-photo`,
        at: task.done_at,
        kind: 'task_photo',
        actor: worker,
        lead: worker,
        detail: `submitted photo proof — ${task.title}`,
      });
    }
    for (const summary of proofSummaries.data ?? []) {
      if (summary.tasks_total === 0 || summary.tasks_done < summary.tasks_total) continue;
      if (summary.shift_status !== 'completed') continue;
      // The final tick is the event's timestamp; skip shifts finished earlier
      // than the activity window, which have nothing recent to report.
      const lastTick = (taskActivity.data ?? [])
        .filter((task) => task.shift_id === summary.shift_id && task.done_at !== null)
        .map((task) => task.done_at as string)
        .sort()
        .at(-1);
      if (!lastTick) continue;
      const worker = summary.worker_id ? (workerNames[summary.worker_id] ?? 'Worker') : 'Worker';
      items.push({
        id: `${summary.shift_id}-tasks-complete`,
        at: lastTick,
        kind: 'tasks_complete',
        actor: worker,
        lead: worker,
        detail: `completed all ${summary.tasks_total} tasks at ${siteNames[summary.site_id] ?? 'site'}`,
      });
    }
    for (const issue of openIssues.data ?? []) {
      const worker = workerNames[issue.worker_id] ?? 'Worker';
      items.push({
        id: `${issue.id}-issue`,
        at: issue.created_at,
        kind: 'issue',
        actor: worker,
        lead: worker,
        detail: `reported an issue at ${issue.site_id ? (siteNames[issue.site_id] ?? 'site') : 'site'}`,
      });
    }

    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 14);
  }, [
    timesheets.data,
    openOffers.data,
    proofSummaries.data,
    taskActivity.data,
    openIssues.data,
    workerNames,
    siteNames,
  ]);
  void notifications;

  const loading = timesheets.isPending || workers.isPending || sites.isPending;

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Dashboard"
          description="The ops manager's 7am — live across all five sites."
        />

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
              spark: (
                <PresenceSpark total={workers.data?.length ?? 0} active={onSite.length} />
              ),
            },
            {
              label: 'Unfilled Today',
              value: unfilledToday.length,
              icon: MapPinArea,
              to: '/app/roster',
              tone: unfilledToday.length > 0 ? 'danger' : 'default',
              animate: true,
              spark: <DayTrackSpark windows={unfilledWindows} />,
            },
            {
              label: 'Certs Expiring ≤30d',
              value: expiringCerts.length,
              icon: Certificate,
              to: '/app/workers?compliance=expiring_soon',
              tone: expiringCerts.length > 0 ? 'warning' : 'default',
              animate: true,
              spark: <RunwaySpark daysUntil={expiringDays} />,
            },
            {
              label: 'Awaiting Review',
              value: awaitingReview.length,
              icon: ClockCountdown,
              to: '/app/timesheets?status=pending',
              tone: awaitingReview.length > 0 ? 'warning' : 'default',
              animate: true,
              spark: (
                <ReviewSplitSpark pending={pendingCount} flagged={flaggedCount} />
              ),
            },
          ]}
        />

        {/* Row 1: map (7) + needs attention (5), equal height. */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="e1 relative h-[380px] overflow-hidden rounded-lg xl:col-span-7">
            {sites.data ? (
              <LiveMap
                sites={sites.data}
                onSite={onSite}
                workerNames={workerNames}
                siteNames={siteNames}
                updatedAt={timesheets.dataUpdatedAt || null}
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
            <div
              style={{ zIndex: 40 }}
              className="pointer-events-none absolute top-3 right-3 flex items-center gap-1.5 rounded-sm border border-border-default bg-surface-1/90 px-2.5 py-1.5 shadow-[var(--elevation-2)] backdrop-blur-sm"
            >
              <LiveDot />
              <span className="label-micro text-text-secondary">
                <span className="num">{onSite.length}</span> on site now
              </span>
            </div>
          </div>

          <section className="e1 flex h-[380px] flex-col overflow-hidden rounded-lg xl:col-span-5">
            <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
              <h2 className="label-micro">Needs attention</h2>
              {attention.length > 0 && (
                <Badge variant="destructive" className="num">
                  {attention.length}
                </Badge>
              )}
              <RefreshButton
                label="Refresh what needs attention"
                busy={timesheets.isFetching || windowShifts.isFetching}
                onRefresh={() => {
                  void timesheets.refetch();
                  void windowShifts.refetch();
                }}
                className="ml-auto"
              />
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto">
              <ul className="scroll-fade-y flex flex-col pb-4">
                {loading ? (
                  <li className="p-3">
                    <Skeleton className="h-12 rounded-lg" />
                  </li>
                ) : attention.length === 0 ? (
                  <li className="px-4 py-10 text-center text-small text-text-secondary">
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
        <section className="e1 flex max-h-80 flex-col overflow-hidden rounded-lg">
          <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
            <h2 className="label-micro">Activity</h2>
            <span className="label-micro flex items-center gap-1.5 rounded-xs bg-success-muted px-1.5 py-0.5 text-success">
              <LiveDot size="sm" />
              Live
            </span>
            <RefreshButton
              label="Refresh the activity feed"
              busy={timesheets.isFetching || taskActivity.isFetching}
              onRefresh={() => {
                void timesheets.refetch();
                void taskActivity.refetch();
              }}
              className="ml-auto"
            />
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3">
                <Skeleton className="h-10 rounded-lg" />
              </div>
            ) : feed.length === 0 ? (
              <p className="px-4 py-10 text-center text-small text-text-secondary">
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
