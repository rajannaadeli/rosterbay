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
  ShiftDetailDialog,
  type CreateShiftValues,
  type PendingAssignment,
} from '@/features/roster/components/shift-dialogs';
import { WorkerDragCard, WorkerPanel } from '@/features/roster/components/worker-panel';
import {
  useAllWorkerCerts,
  useAssignShift,
  useCancelShift,
  useCreateShift,
  useShiftsRange,
  useUnassignShift,
  useUpdateShift,
} from '@/features/roster/hooks';
import { useSites } from '@/features/sites/hooks';
import { useWorkers } from '@/features/workers/hooks';
import type { Tables, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { acstTimestamp, acstWeekStart, weekBounds, weekDays } from '@/lib/week';
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
  useShiftsRealtime(fromIso, toIso);
  useOffersRealtime();

  const assign = useAssignShift(fromIso);
  const unassign = useUnassignShift(fromIso);
  const create = useCreateShift(fromIso);
  const update = useUpdateShift(fromIso);
  const cancel = useCancelShift(fromIso);
  const company = useCompany();

  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [activeWorker, setActiveWorker] = useState<WorkerRow | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);
  const [createCell, setCreateCell] = useState<{ siteId: string; dateYmd: string } | null>(null);
  const [detailShiftId, setDetailShiftId] = useState<string | null>(null);
  const [broadcastShiftId, setBroadcastShiftId] = useState<string | null>(null);
  const [unfilledOnly, setUnfilledOnly] = useState(false);
  const [dragOver, setDragOver] = useState<{ shiftId: string; state: 'ok' | 'block' } | null>(null);

  const workerById = useMemo(
    () => new Map((workers.data ?? []).map((w) => [w.id, w])),
    [workers.data],
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

  const detailShift = visibleShifts.find((s) => s.id === detailShiftId) ?? null;
  const roles = useMemo(() => {
    const unique = new Set((workers.data ?? []).map((w) => w.job_title).filter((t) => t !== null));
    return [...unique].sort();
  }, [workers.data]);

  const isPending = shifts.isPending || sites.isPending || workers.isPending;

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Roster</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Drag workers onto shifts — compliance is checked before anything saves.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-pressed={unfilledOnly}
              onClick={() => setUnfilledOnly((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                unfilledOnly ? 'border-danger/40 bg-danger/5 text-danger' : 'hover:bg-muted/50',
              )}
            >
              <MegaphoneSimple size={13} weight="duotone" aria-hidden />
              Unfilled only
            </button>
            <div className="mx-1 h-5 w-px bg-border" />
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous week"
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              <CaretLeft aria-hidden />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next week"
              onClick={() => setWeekOffset((w) => w + 1)}
            >
              <CaretRight aria-hidden />
            </Button>
            <span className="ml-2 text-sm font-medium tabular-nums">
              {formatACST(days[0]!, 'd MMM')} – {formatACST(days[6]!, 'd MMM yyyy')}
            </span>
          </div>
        </div>

        <DndContext onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="flex items-start gap-4">
            <WorkerPanel
              workers={workers.data}
              isPending={workers.isPending}
              collapsed={panelCollapsed}
              onToggleCollapsed={() => setPanelCollapsed((c) => !c)}
            />

            <div className="max-h-[calc(100vh-11rem)] min-w-0 flex-1 overflow-auto rounded-lg border bg-card scrollbar-thin">
              {isPending ? (
                <div className="flex flex-col gap-2 p-4">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div
                  className="grid min-w-[1080px]"
                  style={{ gridTemplateColumns: '160px repeat(7, minmax(132px, 1fr))' }}
                >
                  {/* Corner + day headers (sticky top). */}
                  <div className="sticky top-0 left-0 z-30 border-r border-b bg-card" />
                  {days.map((day) => {
                    const ymd = formatACST(day, 'yyyy-MM-dd');
                    const isToday = ymd === todayYmd;
                    const dow = day.getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <div
                        key={ymd}
                        className={cn(
                          'sticky top-0 z-20 border-b border-l bg-white px-2 py-2 text-center',
                          isToday && 'bg-[#F4F8F7]',
                          !isToday && isWeekend && 'bg-[#FDFAF6]',
                        )}
                      >
                        <p className={cn('text-xs font-semibold', isToday && 'text-primary')}>
                          {formatACST(day, 'EEE')}
                        </p>
                        <p
                          className={cn(
                            'text-[11px] text-muted-foreground',
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
                            <p className="truncate text-[11px] text-muted-foreground">
                              {site.client_name}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                              {siteShifts.length} shifts
                            </span>
                            {unfilledCount > 0 && (
                              <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger tabular-nums">
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
          onSubmit={submitCreate}
        />
      )}

      <ShiftDetailDialog
        shift={detailShift}
        siteName={detailShift ? (siteNamesById[detailShift.site_id] ?? 'Site') : ''}
        workerName={
          detailShift?.worker_id ? (workerById.get(detailShift.worker_id)?.full_name ?? null) : null
        }
        pending={unassign.isPending || update.isPending || cancel.isPending}
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
