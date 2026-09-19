import { Buildings, ListChecks, MapPinArea, Plus, UsersThree } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import type { DayLoad } from '@/components/data-marks';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatStrip } from '@/components/stat-strip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCertTypes } from '@/features/certs/hooks';
import { SiteCard } from '@/features/sites/components/site-card';
import { SiteDrawer } from '@/features/sites/components/site-drawer';
import { useShiftsRange } from '@/features/roster/hooks';
import { useSites, useTaskCounts } from '@/features/sites/hooks';
import { formatACST } from '@/lib/format';
import { acstWeekStart, weekBounds, weekDays } from '@/lib/week';

export function SitesPage() {
  const sites = useSites();
  const certTypes = useCertTypes();
  const taskCounts = useTaskCounts();

  // Same week query the roster already runs, so this is normally a cache hit.
  // It is the one added dependency on this page and it earns its place: a site
  // directory that can't tell you which sites are short this week is a list of
  // addresses, not an ops screen.
  const weekStart = useMemo(() => acstWeekStart(0), []);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const { fromIso, toIso } = useMemo(() => weekBounds(weekStart), [weekStart]);
  const weekShifts = useShiftsRange(fromIso, toIso);

  const coverBySite = useMemo(() => {
    const dayIndex = new Map(days.map((day, index) => [formatACST(day, 'yyyy-MM-dd'), index]));
    const map = new Map<string, DayLoad[]>();
    for (const shift of weekShifts.data ?? []) {
      if (shift.status === 'cancelled') continue;
      const index = dayIndex.get(formatACST(shift.starts_at, 'yyyy-MM-dd'));
      if (index === undefined) continue;
      const cover = map.get(shift.site_id) ?? (Array(7).fill('none') as DayLoad[]);
      // An unfilled shift outranks a filled one on the same day: the gap is
      // the thing worth surfacing, not the fact that something else is covered.
      if (shift.worker_id === null) cover[index] = 'unfilled';
      else if (cover[index] === 'none') cover[index] = 'shift';
      map.set(shift.site_id, cover);
    }
    return map;
  }, [weekShifts.data, days]);
  const [searchParams, setSearchParams] = useSearchParams();

  const openSiteId = searchParams.get('site');

  const openDrawer = (id: string | 'new') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('site', id);
      return next;
    });
  };
  const closeDrawer = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('site');
      return next;
    });
  };

  const isPending = sites.isPending || certTypes.isPending || taskCounts.isPending;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Job Sites"
        description="Client sites, geofences and task checklists."
        actions={
          <Button onClick={() => openDrawer('new')}>
            <Plus aria-hidden />
            New site
          </Button>
        }
      />

      <StatStrip
        loading={isPending}
        segments={[
          { label: 'Sites', value: sites.data?.length ?? 0, icon: MapPinArea },
          {
            label: 'Clients',
            value: new Set((sites.data ?? []).map((s) => s.client_name).filter(Boolean)).size,
            icon: Buildings,
          },
          {
            label: 'Task templates',
            value: [...(taskCounts.data?.values() ?? [])].reduce((sum, n) => sum + n, 0),
            icon: ListChecks,
          },
          {
            label: 'Required certs',
            value: new Set((sites.data ?? []).flatMap((s) => s.required_cert_type_ids)).size,
            icon: UsersThree,
          },
        ]}
      />

      {isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : (sites.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={MapPinArea}
          title="No job sites yet"
          description="Add your first client site to set its geofence, required certificates and task checklist."
          action={
            <Button className="mt-2" onClick={() => openDrawer('new')}>
              <Plus aria-hidden />
              New site
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sites.data?.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              certTypes={certTypes.data ?? []}
              taskCount={taskCounts.data?.get(site.id) ?? 0}
              {...(coverBySite.get(site.id) ? { weekCover: coverBySite.get(site.id)! } : {})}
              onOpen={() => openDrawer(site.id)}
            />
          ))}
        </div>
      )}

      <SiteDrawer siteId={openSiteId} onClose={closeDrawer} />
    </div>
  );
}
