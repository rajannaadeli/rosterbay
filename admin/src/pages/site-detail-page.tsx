import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Trash } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCertTypes } from '@/features/certs/hooks';
import { useCompany } from '@/features/company/hooks';
import { GeofenceEditor } from '@/features/sites/components/geofence-editor';
import { TaskTemplateEditor } from '@/features/sites/components/task-template-editor';
import { useCreateSite, useDeleteSite, useSite, useUpdateSite } from '@/features/sites/hooks';
import { ADELAIDE_CENTER } from '@/lib/leaflet';

const siteFormSchema = z.object({
  name: z.string().min(1, 'Site name is required'),
  client_name: z.string(),
  address: z.string().min(1, 'Address is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  geofence_radius_m: z.number().int().min(50).max(500),
  required_cert_type_ids: z.array(z.string()),
});

type SiteFormValues = z.infer<typeof siteFormSchema>;

const NEW_SITE_DEFAULTS: SiteFormValues = {
  name: '',
  client_name: '',
  address: '',
  lat: ADELAIDE_CENTER.lat,
  lng: ADELAIDE_CENTER.lng,
  geofence_radius_m: 150,
  required_cert_type_ids: [],
};

export function SiteDetailPage() {
  const { siteId } = useParams<'siteId'>();
  const isNew = siteId === undefined;
  const navigate = useNavigate();

  const site = useSite(siteId ?? '');
  const certTypes = useCertTypes();
  const company = useCompany();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite(siteId ?? '');
  const deleteSite = useDeleteSite();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: NEW_SITE_DEFAULTS,
  });

  useEffect(() => {
    if (site.data && !isNew) {
      form.reset({
        name: site.data.name,
        client_name: site.data.client_name ?? '',
        address: site.data.address,
        lat: site.data.lat,
        lng: site.data.lng,
        geofence_radius_m: site.data.geofence_radius_m,
        required_cert_type_ids: site.data.required_cert_type_ids,
      });
    }
  }, [site.data, isNew, form]);

  const [lat, lng, radius, selectedCertIds] = useWatch({
    control: form.control,
    name: ['lat', 'lng', 'geofence_radius_m', 'required_cert_type_ids'],
  });
  const geofence = { lat, lng, radius };

  const saving = createSite.isPending || updateSite.isPending;
  const saveError = createSite.error ?? updateSite.error;

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      name: values.name,
      client_name: values.client_name.trim() === '' ? null : values.client_name.trim(),
      address: values.address,
      lat: values.lat,
      lng: values.lng,
      geofence_radius_m: values.geofence_radius_m,
      required_cert_type_ids: values.required_cert_type_ids,
    };
    if (isNew) {
      if (!company.data) return;
      createSite.mutate(
        { ...payload, company_id: company.data.id },
        { onSuccess: (created) => void navigate(`/app/sites/${created.id}`, { replace: true }) },
      );
    } else {
      updateSite.mutate(payload);
    }
  });

  if (!isNew && site.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!isNew && site.isError) {
    return <p className="text-sm text-danger">Site not found.</p>;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" render={<Link to="/app/sites" />}>
          <ArrowLeft aria-hidden />
          Job Sites
        </Button>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{isNew ? 'New job site' : site.data?.name}</h1>
        {!isNew && (
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash aria-hidden />
            Delete site
          </Button>
        )}
      </header>

      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-name">Site name</Label>
            <Input id="site-name" {...form.register('name')} placeholder="e.g. Kingsford Corporate Tower" />
            {form.formState.errors.name && (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-client">Client</Label>
            <Input id="site-client" {...form.register('client_name')} placeholder="e.g. Meridian Property Group" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="site-address">Address</Label>
            <Input id="site-address" {...form.register('address')} placeholder="Street, suburb, state, postcode" />
            {form.formState.errors.address && (
              <p className="text-xs text-danger">{form.formState.errors.address.message}</p>
            )}
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Location &amp; geofence</h2>
          <GeofenceEditor
            value={geofence}
            onChange={(next) => {
              form.setValue('lat', next.lat, { shouldDirty: true });
              form.setValue('lng', next.lng, { shouldDirty: true });
              form.setValue('geofence_radius_m', next.radius, { shouldDirty: true });
            }}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Required certificates</h2>
          <p className="text-xs text-muted-foreground">
            Workers without a valid copy of every required certificate are blocked from
            assignment at this site.
          </p>
          <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
            {certTypes.isPending ? (
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-6 rounded" />)
            ) : (
              certTypes.data?.map((certType) => {
                const checked = selectedCertIds.includes(certType.id);
                return (
                  <label
                    key={certType.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const ids = next === true
                          ? [...selectedCertIds, certType.id]
                          : selectedCertIds.filter((id) => id !== certType.id);
                        form.setValue('required_cert_type_ids', ids, { shouldDirty: true });
                      }}
                    />
                    <span>{certType.name}</span>
                    <span className="text-xs text-muted-foreground">{certType.code}</span>
                  </label>
                );
              })
            )}
          </div>
        </section>

        {saveError && (
          <p role="alert" className="text-sm text-danger">
            Couldn&apos;t save: {saveError.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create site' : 'Save changes'}
          </Button>
        </div>
      </form>

      <Separator />

      <section className="flex flex-col gap-2 pb-8">
        <h2 className="text-sm font-semibold">Task checklist</h2>
        {isNew ? (
          <p className="text-sm text-muted-foreground">
            Save the site first, then build its per-shift task checklist here.
          </p>
        ) : (
          site.data && <TaskTemplateEditor siteId={site.data.id} companyId={site.data.company_id} />
        )}
      </section>

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
                if (!siteId) return;
                deleteSite.mutate(siteId, { onSuccess: () => void navigate('/app/sites') });
              }}
            >
              {deleteSite.isPending ? 'Deleting…' : 'Delete site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
