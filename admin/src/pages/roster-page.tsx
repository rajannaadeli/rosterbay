import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CaretLeft, CaretRight, MegaphoneSimple } from '@phosphor-icons/react';
import { addDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { PageHeader } from '@/components/page-header';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCertTypes } from '@/features/certs/hooks';
import { BroadcastDialog } from '@/features/offers/components/broadcast-dialog';
import { eligibleWorkers } from '@/features/offers/eligibility';
import { useBroadcastOffer, useOffersRealtime, useOpenOffers } from '@/features/offers/hooks';
import { useCompany } from '@/features/company/hooks';
import { useShiftsRealtime } from '@/features/realtime/hooks';
import { checkAssignment } from '@/features/roster/conflict-engine';
import { RosterCell } from '@/features/roster/components/roster-cell';
import {
  ConflictDialog,
  CreateShiftDialog,
  type CreateShiftValues,
  type PendingAssignment,
} from '@/features/roster/components/shift-dialogs';
import { RosterDefs } from '@/features/roster/components/roster-defs';
import { ShiftSheet } from '@/features/roster/components/shift-sheet';
import { TimeGrid, type ZoomHours } from '@/features/roster/components/time-grid';
import { WeekCoverageRibbon } from '@/features/roster/components/week-coverage-ribbon';
import { useProofRealtime, useProofSummaries } from '@/features/proof/hooks';
import { WorkerDragCard, WorkerPanel } from '@/features/roster/components/worker-panel';
import {
  useAllWorkerCerts,
  useAssignShift,
  useCancelShift,
  useCreateShift,
  useShift,
  useShiftsRange,
  useUnassignShift,
  useUpdateShift,
} from '@/features/roster/hooks';
import { useSites } from '@/features/sites/hooks';
import { useWorkers } from '@/features/workers/hooks';
import type { Tables, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { acstTimestamp, acstWeekStart, weekBounds, weekDays } from '@/lib/week';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { cn } from '@/lib/utils';

type Shift = Tables<'shifts'>;
type WorkerRow = Views<'worker_overview'>;

export function RosterPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => acstWeekStart(weekOffset), [weekOffset]);
  const { fromIso, toIso } = useMemo(() => weekBounds(weekStart), [weekStart]);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const todayYmd = formatACST(new Date(), 'yyyy-MM-dd');

  const shifts = useShiftsRange(fromIso, toIso);
  const sites = useSites();
  const workers = useWorkers();
  const certTypes = useCertTypes();
  const allCerts = useAllWorkerCerts();
  const openOffers = useOpenOffers();
  const broadcast = useBroadcastOffer();
  const proof = useProofSummaries(fromIso, toIso);
  useShiftsRealtime(fromIso, toIso);
  useOffersRealtime();
  useProofRealtime();

  const assign = useAssignShift(fromIso);
  const unassign = useUnassignShift(fromIso);
  const create = useCreateShift(fromIso);
  const update = useUpdateShift(fromIso);
  const cancel = useCancelShift(fromIso);
  const company = useCompany();

  // View preference outlives the session — an ops manager who works in day
  // view should not land in week view every morning.
  const [view, setView] = usePersistentState<'day' | 'week'>('rb-roster-view', 'day');
  const [zoom, setZoom] = usePersistentState<ZoomHours>('rb-roster-zoom', 24);
  // Day view opens on today, not on Monday — the ops manager's first question
  // is about the shift running right now.
  const [dayOffset, setDayOffset] = useState(() => {
    const dow = new Date(`${formatACST(new Date(), 'yyyy-MM-dd')}T12:00:00+09:30`).getUTCDay();
    return (dow + 6) % 7; // Sunday=0 → 6, Monday=1 → 0
  });
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [activeWorker, setActiveWorker] = useState<WorkerRow | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);
  const [createCell, setCreateCell] = useState<{
    siteId: string;
    dateYmd: string;
    start?: string;
    end?: string;
  } | null>(null);
  // Sheet state lives in the URL (?shift=<id>) so the dashboard can deep-link.
  const [searchParams, setSearchParams] = useSearchParams();
  const detailShiftId = searchParams.get('shift');
  const setDetailShiftId = (shiftId: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (shiftId === null) next.delete('shift');
      else next.set('shift', shiftId);
      return next;
    });
  const [broadcastShiftId, setBroadcastShiftId] = useState<string | null>(null);
  const [unfilledOnly, setUnfilledOnly] = useState(false);
  const [dragOver, setDragOver] = useState<{ shiftId: string; state: 'ok' | 'block' } | null>(null);

  const workerById = useMemo(
    () => new Map((workers.data ?? []).map((w) => [w.id, w])),
    [workers.data],
  );
  const workerNames = useMemo(
    () => Object.fromEntries((workers.data ?? []).map((w) => [w.id, w.full_name])),
    [workers.data],
  );
  const proofByShift = useMemo(
    () => new Map((proof.data ?? []).map((row) => [row.shift_id, row])),
    [proof.data],
  );
  const siteNamesById = useMemo(
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

  const offerShiftIds = useMemo(
    () => new Set((openOffers.data ?? []).map((offer) => offer.shift_id)),
    [openOffers.data],
  );

  const visibleShifts = useMemo(
    () => (shifts.data ?? []).filter((s) => s.status !== 'cancelled'),
    [shifts.data],
  );

  /** site_id → yyyy-MM-dd → shifts, ACST-bucketed. */
  const grid = useMemo(() => {
    const map = new Map<string, Map<string, Shift[]>>();
    for (const shift of visibleShifts) {
      const ymd = formatACST(shift.starts_at, 'yyyy-MM-dd');
      const bySite = map.get(shift.site_id) ?? new Map<string, Shift[]>();
      const cell = bySite.get(ymd) ?? [];
      cell.push(shift);
      bySite.set(ymd, cell);
      map.set(shift.site_id, bySite);
    }
    return map;
  }, [visibleShifts]);

  const evaluate = (worker: WorkerRow, shift: Shift) => {
    const site = (sites.data ?? []).find((s) => s.id === shift.site_id);
    if (!site) return null;
    return checkAssignment({
      worker: { id: worker.id, full_name: worker.full_name },
      targetShift: shift,
      site: { name: site.name, required_cert_type_ids: site.required_cert_type_ids },
      certTypeNames,
      workerCerts: certsByWorker.get(worker.id) ?? [],
      workerWeekShifts: visibleShifts.filter((s) => s.worker_id === worker.id && s.id !== shift.id),
      siteNamesById,
    });
  };

  const runAssignment = (worker: WorkerRow, shift: Shift) => {
    const check = evaluate(worker, shift);
    if (!check) return;

    if (check.verdict === 'ok') {
      assign.mutate({ shiftId: shift.id, workerId: worker.id });
    } else {
      setPendingAssignment({
        shiftId: shift.id,
        workerId: worker.id,
        workerName: worker.full_name,
        check,
      });
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    const worker = event.active.data.current?.worker as WorkerRow | undefined;
    setActiveWorker(worker ?? null);
  };

  // Hovered-cell-only eligibility, painted before drop (§1.4).
  const onDragOver = (event: DragOverEvent) => {
    const worker = event.active.data.current?.worker as WorkerRow | undefined;
    const shift = event.over?.data.current?.shift as Shift | undefined;
    if (!worker || !shift || (shift.status !== 'open' && shift.status !== 'assigned')) {
      setDragOver(null);
      return;
    }
    const check = evaluate(worker, shift);
    setDragOver({ shiftId: shift.id, state: check?.verdict === 'block' ? 'block' : 'ok' });
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveWorker(null);
    setDragOver(null);
    const worker = event.active.data.current?.worker as WorkerRow | undefined;
    const shift = event.over?.data.current?.shift as Shift | undefined;
    if (!worker || !shift) return;
    if (shift.status !== 'open' && shift.status !== 'assigned') return;
    if (shift.worker_id === worker.id) return;
    runAssignment(worker, shift);
  };

  const submitCreate = (values: CreateShiftValues) => {
    if (!createCell || !company.data) return;
    const startsAt = acstTimestamp(createCell.dateYmd, values.start);
    let endsAt = acstTimestamp(createCell.dateYmd, values.end);
    if (endsAt <= startsAt) {
      const nextDay = formatACST(addDays(new Date(`${createCell.dateYmd}T12:00:00+09:30`), 1), 'yyyy-MM-dd');
      endsAt = acstTimestamp(nextDay, values.end);
    }
    create.mutate(
      {
        company_id: company.data.id,
        site_id: createCell.siteId,
        starts_at: startsAt,
        ends_at: endsAt,
        role_required: values.role_required,
        notes: values.notes.trim() === '' ? null : values.notes.trim(),
        status: 'open',
      },
      { onSuccess: () => setCreateCell(null) },
    );
  };

  // A dashboard deep-link can point at a shift outside the loaded week.
  const shiftInWeek = visibleShifts.find((s) => s.id === detailShiftId) ?? null;
  const linkedShift = useShift(detailShiftId !== null && !shiftInWeek ? detailShiftId : null);
  const detailShift = shiftInWeek ?? linkedShift.data ?? null;
  const roles = useMemo(() => {
    const unique = new Set((workers.data ?? []).map((w) => w.job_title).filter((t) => t !== null));
    return [...unique].sort();
  }, [workers.data]);

  // Day view walks days; week view walks weeks. Both anchor on the same
  // Monday so switching views never jumps you to a different part of the week.
  const dayYmd = useMemo(
    () => formatACST(addDays(weekStart, ((dayOffset % 7) + 7) % 7), 'yyyy-MM-dd'),
    [weekStart, dayOffset],
  );

  const axisShifts = useMemo(
    () =>
      visibleShifts.map((s) => ({
        id: s.id,
        site_id: s.site_id,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        worker_id: s.worker_id,
        status: s.status,
      })),
    [visibleShifts],
  );

  // Index of today within the currently-displayed week, or Monday when the
  // week on screen isn't the current one.
  const todayIndexInWeek = useMemo(() => {
    const index = days.findIndex((d) => formatACST(d, 'yyyy-MM-dd') === todayYmd);
    return index === -1 ? 0 : index;
  }, [days, todayYmd]);

  // Stepping off either end of the week carries the week with it, so day view
  // scrolls continuously instead of wrapping back to Monday.
  const stepDay = (delta: number) => {
    const next = dayOffset + delta;
    if (next < 0) {
      setWeekOffset((w) => w - 1);
      setDayOffset(6);
    } else if (next > 6) {
      setWeekOffset((w) => w + 1);
      setDayOffset(0);
    } else {
      setDayOffset(next);
    }
  };

  const isPending = shifts.isPending || sites.isPending || workers.isPending;

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-4">
        <RosterDefs />
        <PageHeader
          title="Roster"
          description="Drag workers onto shifts — compliance is checked before anything saves."
          actions={
            <>
            <button
              type="button"
              aria-pressed={unfilledOnly}
              onClick={() => setUnfilledOnly((v) => !v)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-small font-medium transition-colors duration-[var(--duration-micro)]',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                unfilledOnly
                  ? 'border-danger/40 bg-danger-muted text-danger'
                  : 'border-border-default text-text-secondary hover:bg-surface-2 hover:text-foreground',
              )}
            >
              <MegaphoneSimple size={13} weight="duotone" aria-hidden />
              Unfilled only
            </button>

            <Segmented
              label="Roster view"
              value={view}
              onChange={setView}
              options={[
                { value: 'day' as const, label: 'Day' },
                { value: 'week' as const, label: 'Week' },
              ]}
            />

            {view === 'day' && (
              <Segmented
                label="Time zoom"
                value={zoom}
                onChange={setZoom}
                options={[
                  { value: 6 as ZoomHours, label: '6h' },
                  { value: 12 as ZoomHours, label: '12h' },
                  { value: 24 as ZoomHours, label: '24h' },
                ]}
              />
            )}

            <div className="mx-1 h-5 w-px bg-border-subtle" />
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={view === 'day' ? 'Previous day' : 'Previous week'}
              onClick={() => (view === 'day' ? stepDay(-1) : setWeekOffset((w) => w - 1))}
            >
              <CaretLeft aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWeekOffset(0);
                setDayOffset(todayIndexInWeek);
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={view === 'day' ? 'Next day' : 'Next week'}
              onClick={() => (view === 'day' ? stepDay(1) : setWeekOffset((w) => w + 1))}
            >
              <CaretRight aria-hidden />
            </Button>
            <span className="num ml-2 text-small font-medium">
              {view === 'day'
                ? formatACST(`${dayYmd}T12:00:00+09:30`, 'EEE d MMM yyyy')
                : `${formatACST(days[0]!, 'd MMM')} – ${formatACST(days[6]!, 'd MMM yyyy')}`}
            </span>
            </>
          }
        />

        <DndContext onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="flex items-start gap-4">
            <WorkerPanel
              workers={workers.data}
              isPending={workers.isPending}
              collapsed={panelCollapsed}
              onToggleCollapsed={() => setPanelCollapsed((c) => !c)}
            />

            <div className="flex min-w-0 flex-1 flex-col gap-3">
            {isPending ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : view === 'day' ? (
              <TimeGrid
                ymd={dayYmd}
                sites={sites.data ?? []}
                shifts={visibleShifts}
                workerById={workerById}
                offerShiftIds={offerShiftIds}
                zoom={zoom}
                dimFilled={unfilledOnly}
                dragOverShiftId={dragOver?.shiftId ?? null}
                dragOverState={dragOver?.state ?? null}
                onShiftClick={setDetailShiftId}
                onBroadcast={setBroadcastShiftId}
                onCreateAt={(siteId, start, end) =>
                  setCreateCell({ siteId, dateYmd: dayYmd, start, end })
                }
              />
            ) : (
              <>
              <WeekCoverageRibbon shifts={axisShifts} days={days} leftInsetPx={160} />
              <div className="max-h-[calc(100vh-15rem)] overflow-auto rounded-lg border bg-card scrollbar-thin">
                <div
                  className="grid min-w-[1080px]"
                  style={{ gridTemplateColumns: '160px repeat(7, minmax(132px, 1fr))' }}
                >
                  {/* Corner + day headers (sticky top). */}
                  <div className="sticky top-0 left-0 z-30 border-r border-b border-border-subtle bg-surface-1" />
                  {days.map((day) => {
                    const ymd = formatACST(day, 'yyyy-MM-dd');
                    const isToday = ymd === todayYmd;
                    const dow = day.getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <div
                        key={ymd}
                        className={cn(
                          'sticky top-0 z-20 border-b border-l border-border-subtle bg-surface-1 px-2 py-2 text-center',
                          // Today is an accent wash; weekends a half-step down
                          // the surface ladder. Both were hardcoded near-whites
                          // that turned the header into a light bar in dark mode.
                          isToday && 'bg-accent-muted',
                          !isToday && isWeekend && 'bg-surface-2',
                        )}
                      >
                        <p className={cn('label-micro', isToday && 'text-primary')}>
                          {formatACST(day, 'EEE')}
                        </p>
                        <p
                          className={cn(
                            'num text-micro tracking-normal text-text-tertiary',
                            isToday && 'text-primary/80',
                          )}
                        >
                          {formatACST(day, 'd MMM')}
                        </p>
                      </div>
                    );
                  })}

                  {(sites.data ?? []).map((site) => {
                    const siteShifts = [...(grid.get(site.id)?.values() ?? [])].flat();
                    const unfilledCount = siteShifts.filter((s) => s.worker_id === null).length;
                    return (
                      <div key={site.id} className="contents">
                        <div className="sticky left-0 z-10 flex flex-col gap-1 border-b bg-card px-3 py-2">
                          <div>
                            <p className="text-xs font-semibold leading-tight">{site.name}</p>
                            <p className="truncate text-micro tracking-normal text-muted-foreground">
                              {site.client_name}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-micro tracking-normal font-medium text-muted-foreground tabular-nums">
                              {siteShifts.length} shifts
                            </span>
                            {unfilledCount > 0 && (
                              <span className="rounded bg-danger/10 px-1.5 py-0.5 text-micro tracking-normal font-medium text-danger tabular-nums">
                                {unfilledCount} unfilled
                              </span>
                            )}
                          </div>
                        </div>
                        {days.map((day) => {
                          const ymd = formatACST(day, 'yyyy-MM-dd');
                          const cellShifts = (grid.get(site.id)?.get(ymd) ?? [])
                            .slice()
                            .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                          const dow = day.getDay();
                          return (
                            <RosterCell
                              key={ymd}
                              site={site}
                              day={day}
                              shifts={cellShifts}
                              isToday={ymd === todayYmd}
                              isWeekend={dow === 0 || dow === 6}
                              workerById={workerById}
                              offerShiftIds={offerShiftIds}
                              proofByShift={proofByShift}
                              dimFilled={unfilledOnly}
                              hoveredShiftId={dragOver?.shiftId ?? null}
                              hoverState={dragOver?.state ?? null}
                              onChipClick={setDetailShiftId}
                              onBroadcast={setBroadcastShiftId}
                              onAdd={() => setCreateCell({ siteId: site.id, dateYmd: ymd })}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              </>
            )}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeWorker && (
              <div className="w-56 rotate-2 scale-[1.02] opacity-95 shadow-lg">
                <WorkerDragCard worker={activeWorker} />
              </div>
            )}
          </DragOverlay>
        </DndContext>

      {createCell && (
        <CreateShiftDialog
          open
          onOpenChange={(open) => !open && setCreateCell(null)}
          siteName={siteNamesById[createCell.siteId] ?? 'Site'}
          dateYmd={createCell.dateYmd}
          roles={roles}
          pending={create.isPending}
          {...(createCell.start ? { defaultStart: createCell.start } : {})}
          {...(createCell.end ? { defaultEnd: createCell.end } : {})}
          onSubmit={submitCreate}
        />
      )}

      <ShiftSheet
        shift={detailShift}
        siteName={detailShift ? (siteNamesById[detailShift.site_id] ?? 'Site') : ''}
        worker={detailShift?.worker_id ? workerById.get(detailShift.worker_id) : undefined}
        workerNames={workerNames}
        busy={unassign.isPending || update.isPending || cancel.isPending}
        onOpenChange={(open) => !open && setDetailShiftId(null)}
        onUnassign={() => {
          if (detailShift) unassign.mutate(detailShift.id, { onSuccess: () => setDetailShiftId(null) });
        }}
        onCancelShift={() => {
          if (detailShift) cancel.mutate(detailShift.id, { onSuccess: () => setDetailShiftId(null) });
        }}
        onSaveTimes={(startHm, endHm) => {
          if (!detailShift) return;
          const ymd = formatACST(detailShift.starts_at, 'yyyy-MM-dd');
          const startsAt = acstTimestamp(ymd, startHm);
          let endsAt = acstTimestamp(ymd, endHm);
          if (endsAt <= startsAt) {
            const nextDay = formatACST(addDays(new Date(`${ymd}T12:00:00+09:30`), 1), 'yyyy-MM-dd');
            endsAt = acstTimestamp(nextDay, endHm);
          }
          update.mutate(
            { shiftId: detailShift.id, patch: { starts_at: startsAt, ends_at: endsAt } },
            { onSuccess: () => setDetailShiftId(null) },
          );
        }}
      />

      {broadcastShiftId &&
        (() => {
          const shift = visibleShifts.find((s) => s.id === broadcastShiftId);
          const site = (sites.data ?? []).find((s) => s.id === shift?.site_id);
          if (!shift || !site) return null;
          const eligible = eligibleWorkers({
            shift,
            site,
            workers: workers.data ?? [],
            certsByWorker,
            weekShifts: visibleShifts,
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
                  {
                    shift,
                    siteName: site.name,
                    eligibleWorkerIds: eligible.map((w) => w.id),
                  },
                  { onSuccess: () => setBroadcastShiftId(null) },
                )
              }
            />
          );
        })()}

      <ConflictDialog
        pendingAssignment={pendingAssignment}
        busy={assign.isPending}
        onClose={() => setPendingAssignment(null)}
        onProceed={(overrideReason) => {
          if (!pendingAssignment) return;
          assign.mutate(
            {
              shiftId: pendingAssignment.shiftId,
              workerId: pendingAssignment.workerId,
              ...(overrideReason ? { overrideReason } : {}),
            },
            { onSettled: () => setPendingAssignment(null) },
          );
        }}
      />
      </div>
    </TooltipProvider>
  );
}
