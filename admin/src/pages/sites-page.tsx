import { Buildings, ListChecks, MapPinArea, Plus, UsersThree } from '@phosphor-icons/react';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/empty-state';
import { StatStrip } from '@/components/stat-strip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCertTypes } from '@/features/certs/hooks';
import { SiteCard } from '@/features/sites/components/site-card';
import { SiteDrawer } from '@/features/sites/components/site-drawer';
import { useSites, useTaskCounts } from '@/features/sites/hooks';

export function SitesPage() {
  const sites = useSites();
  const certTypes = useCertTypes();
  const taskCounts = useTaskCounts();
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job Sites</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Client sites, geofences and task checklists.
          </p>
        </div>
        <Button onClick={() => openDrawer('new')}>
          <Plus aria-hidden />
          New site
        </Button>
      </div>

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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sites.data?.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              certTypes={certTypes.data ?? []}
              taskCount={taskCounts.data?.get(site.id) ?? 0}
              onOpen={() => openDrawer(site.id)}
            />
          ))}
        </div>
      )}

      <SiteDrawer siteId={openSiteId} onClose={closeDrawer} />
    </div>
  );
}
