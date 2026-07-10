import { MapPinArea, Plus } from '@phosphor-icons/react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/empty-state';
import { StatChips } from '@/components/stat-chips';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCertTypes } from '@/features/certs/hooks';
import { SiteCard } from '@/features/sites/components/site-card';
import { useSites, useTaskCounts } from '@/features/sites/hooks';

export function SitesPage() {
  const sites = useSites();
  const certTypes = useCertTypes();
  const taskCounts = useTaskCounts();

  const isPending = sites.isPending || certTypes.isPending || taskCounts.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Job Sites</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Client sites, geofences and task checklists.
          </p>
        </div>
        <Button render={<Link to="/app/sites/new" />}>
          <Plus aria-hidden />
          New site
        </Button>
      </div>

      <StatChips
        loading={isPending}
        chips={[
          { label: 'Sites', value: sites.data?.length ?? 0 },
          {
            label: 'Clients',
            value: new Set((sites.data ?? []).map((s) => s.client_name).filter(Boolean)).size,
          },
          {
            label: 'Task templates',
            value: [...(taskCounts.data?.values() ?? [])].reduce((sum, n) => sum + n, 0),
          },
        ]}
      />

      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : (sites.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={MapPinArea}
          title="No job sites yet"
          description="Add your first client site to set its geofence, required certificates and task checklist."
          action={
            <Button className="mt-2" render={<Link to="/app/sites/new" />}>
              <Plus aria-hidden />
              New site
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sites.data?.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              certTypes={certTypes.data ?? []}
              taskCount={taskCounts.data?.get(site.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
