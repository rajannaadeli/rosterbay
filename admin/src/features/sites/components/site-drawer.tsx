import { DotsThree, Trash } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DrawerSaveFooter, EntityDrawer } from '@/components/entity-drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { useCertTypes } from '@/features/certs/hooks';
import { useCompany } from '@/features/company/hooks';
import { GeofenceEditor } from '@/features/sites/components/geofence-editor';
import { TaskTemplateEditor } from '@/features/sites/components/task-template-editor';
import { useCreateSite, useDeleteSite, useSite, useUpdateSite } from '@/features/sites/hooks';
import { ADELAIDE_CENTER } from '@/lib/leaflet';
import { cn } from '@/lib/utils';

interface SiteDraft {
  name: string;
  client_name: string;
  address: string;
  lat: number;
  lng: number;
  geofence_radius_m: number;
  required_cert_type_ids: string[];
}

const EMPTY_DRAFT: SiteDraft = {
  name: '',
  client_name: '',
  address: '',
  lat: ADELAIDE_CENTER.lat,
  lng: ADELAIDE_CENTER.lng,
  geofence_radius_m: 150,
  required_cert_type_ids: [],
};

interface SiteDrawerProps {
  /** site id, 'new', or null (closed). */
  siteId: string | 'new' | null;
  onClose: () => void;
}

export function SiteDrawer({ siteId, onClose }: SiteDrawerProps) {
  const isNew = siteId === 'new';
  const open = siteId !== null;
  const site = useSite(isNew || !siteId ? '' : siteId);
  const certTypes = useCertTypes();
  const company = useCompany();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite(isNew || !siteId ? '' : siteId);
  const deleteSite = useDeleteSite();

  const [tab, setTab] = useState('details');
  const [draft, setDraft] = useState<SiteDraft>(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState<SiteDraft>(EMPTY_DRAFT);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Seed the draft when the target changes — render-time state adjustment
  // (React's documented pattern), not an effect, so no cascading renders.
  const seedKey = isNew ? 'new' : site.data?.id;
  const [seededFor, setSeededFor] = useState<string | undefined>(undefined);
  if (seedKey && seedKey !== seededFor) {
    setSeededFor(seedKey);
    const seeded: SiteDraft =
      isNew || !site.data
        ? EMPTY_DRAFT
        : {
            name: site.data.name,
            client_name: site.data.client_name ?? '',
            address: site.data.address,
            lat: site.data.lat,
            lng: site.data.lng,
            geofence_radius_m: site.data.geofence_radius_m,
            required_cert_type_ids: site.data.required_cert_type_ids,
          };
    setDraft(seeded);
    setBaseline(seeded);
    setTab('details');
  }

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);
  const saving = createSite.isPending || updateSite.isPending;

  const patch = (part: Partial<SiteDraft>) => setDraft((d) => ({ ...d, ...part }));

  const save = () => {
    if (draft.name.trim() === '' || draft.address.trim() === '') {
      toast.error('Name and address are required');
      setTab('details');
      return;
    }
    const payload = {
      name: draft.name.trim(),
      client_name: draft.client_name.trim() === '' ? null : draft.client_name.trim(),
      address: draft.address.trim(),
      lat: draft.lat,
      lng: draft.lng,
      geofence_radius_m: draft.geofence_radius_m,
      required_cert_type_ids: draft.required_cert_type_ids,
    };
    if (isNew) {
      if (!company.data) return;
      createSite.mutate(
        { ...payload, company_id: company.data.id },
        {
          onSuccess: () => {
            toast.success('Site created');
            onClose();
          },
        },
      );
    } else {
      updateSite.mutate(payload, {
        onSuccess: () => {
          setBaseline(draft);
          toast.success('Site saved');
        },
      });
    }
  };

  const showFooter = tab === 'details' || tab === 'compliance';

  return (
    <>
      <EntityDrawer
        open={open}
        onOpenChange={(next) => !next && onClose()}
        dirty={dirty}
        srTitle={isNew ? 'New job site' : (site.data?.name ?? 'Job site')}
        header={
          <div className="flex flex-col gap-1">
            <Input
              aria-label="Site name"
              placeholder="Site name"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="h-8 border-transparent bg-transparent px-0 text-base font-semibold shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:px-2"
            />
            {draft.client_name.trim() !== '' && (
              <Badge variant="secondary" className="w-fit text-[11px]">
                {draft.client_name}
              </Badge>
            )}
          </div>
        }
        headerActions={
          !isNew && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" aria-label="Site actions" />}
              >
                <DotsThree size={18} aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash aria-hidden /> Delete site
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'compliance', label: 'Compliance' },
          { id: 'tasks', label: 'Tasks' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        footer={
          showFooter ? (
            <DrawerSaveFooter
              dirty={dirty}
              saving={saving}
              onCancel={() => setDraft(baseline)}
              onSave={save}
            />
          ) : undefined
        }
      >
        <TabsContent value="details" className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="site-client">Client</Label>
              <Input
                id="site-client"
                value={draft.client_name}
                onChange={(e) => patch({ client_name: e.target.value })}
                placeholder="e.g. Meridian Property Group"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="site-address">Address</Label>
              <Input
                id="site-address"
                value={draft.address}
                onChange={(e) => patch({ address: e.target.value })}
                placeholder="Street, suburb, state, postcode"
              />
            </div>
          </div>
          <GeofenceEditor
            siteName={draft.name}
            value={{ lat: draft.lat, lng: draft.lng, radius: draft.geofence_radius_m }}
            onChange={(g) => patch({ lat: g.lat, lng: g.lng, geofence_radius_m: g.radius })}
          />
        </TabsContent>

        <TabsContent value="compliance" className="flex flex-col gap-3 p-5">
          <p className="text-xs text-muted-foreground">
            Workers without a valid copy of every required certificate are blocked from assignment
            at this site.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(certTypes.data ?? []).map((ct) => {
              const checked = draft.required_cert_type_ids.includes(ct.id);
              return (
                <label
                  key={ct.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors',
                    checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    className="mt-0.5"
                    onCheckedChange={(next) =>
                      patch({
                        required_cert_type_ids:
                          next === true
                            ? [...draft.required_cert_type_ids, ct.id]
                            : draft.required_cert_type_ids.filter((id) => id !== ct.id),
                      })
                    }
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{ct.name}</p>
                    <span className="rounded bg-muted px-1 py-px font-mono text-[10px] text-muted-foreground">
                      {ct.code}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="p-5">
          {isNew ? (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Save the site first, then build its per-shift task checklist here.
            </p>
          ) : (
            site.data && <TaskTemplateEditor siteId={site.data.id} companyId={site.data.company_id} />
          )}
        </TabsContent>
      </EntityDrawer>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {site.data?.name}?</DialogTitle>
            <DialogDescription>
              This removes the site, its task checklist, and its shifts. There&apos;s no undo —
              though the demo reseeds itself nightly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteSite.isPending}
              onClick={() => {
                if (!siteId || isNew) return;
                deleteSite.mutate(siteId, {
                  onSuccess: () => {
                    toast.success('Site deleted');
                    setDeleteOpen(false);
                    onClose();
                  },
                });
              }}
            >
              {deleteSite.isPending ? 'Deleting…' : 'Delete site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
