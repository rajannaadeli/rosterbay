import { Phone, UploadSimple } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { EntityDrawer } from '@/components/entity-drawer';
import { CompliancePill } from '@/components/status-pill';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';
import { useCertTypes } from '@/features/certs/hooks';
import { useSites } from '@/features/sites/hooks';
import { AvailabilityNotes } from '@/features/workers/components/availability-notes';
import { CertUploadDialog } from '@/features/workers/components/cert-upload-dialog';
import { DocumentWallet } from '@/features/workers/components/document-wallet';
import { ShiftHistory } from '@/features/workers/components/shift-history';
import { useWorker, useWorkerCerts, useWorkerShifts } from '@/features/workers/hooks';
import type { CertStatus } from '@/lib/database.types';
import { formatACST } from '@/lib/format';

interface WorkerDrawerProps {
  workerId: string | null;
  onOpenChange: (open: boolean) => void;
}

/** Worker detail on the shared EntityDrawer (Profile · Documents · History). */
export function WorkerDrawer({ workerId, onOpenChange }: WorkerDrawerProps) {
  const id = workerId ?? '';
  const worker = useWorker(id);
  const certs = useWorkerCerts(id);
  const shifts = useWorkerShifts(id);
  const sites = useSites();
  const certTypes = useCertTypes();
  const [tab, setTab] = useState('profile');
  const [uploadOpen, setUploadOpen] = useState(false);

  const compliance: CertStatus = useMemo(() => {
    const statuses = (certs.data ?? []).map((cert) => cert.status);
    if (statuses.includes('expired')) return 'expired';
    if (statuses.includes('expiring_soon')) return 'expiring_soon';
    return 'valid';
  }, [certs.data]);

  const lastClockIn = useMemo(() => {
    const done = (shifts.data ?? []).find((shift) => shift.status !== 'open');
    return done?.starts_at ?? null;
  }, [shifts.data]);

  const w = worker.data;

  return (
    <>
      <EntityDrawer
        open={workerId !== null}
        onOpenChange={onOpenChange}
        srTitle={w?.full_name ?? 'Worker'}
        header={
          w ? (
            <div className="flex items-center gap-3">
              <UserAvatar name={w.full_name} size="md" />
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-semibold">{w.full_name}</p>
                  {!certs.isPending && <CompliancePill status={compliance} />}
                </div>
                <p className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{w.job_title}</span>
                  {w.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={12} aria-hidden />
                      {w.phone}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
          )
        }
        tabs={[
          { id: 'profile', label: 'Profile' },
          { id: 'documents', label: 'Documents' },
          { id: 'history', label: 'History' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      >
        <TabsContent value="profile" className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Documents', value: certs.isPending ? '…' : String(certs.data?.length ?? 0) },
              { label: 'Recent shifts', value: shifts.isPending ? '…' : String(shifts.data?.length ?? 0) },
              { label: 'Last shift', value: lastClockIn ? formatACST(lastClockIn, 'd MMM') : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border bg-card px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          {w && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Availability</h3>
              <AvailabilityNotes
                key={w.availability_notes ?? ''}
                workerId={w.id}
                notes={w.availability_notes}
              />
            </section>
          )}
        </TabsContent>

        <TabsContent value="documents" className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Document Wallet</h3>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <UploadSimple aria-hidden />
              Add document
            </Button>
          </div>
          <DocumentWallet
            certs={certs.data}
            certTypes={certTypes.data}
            sites={sites.data}
            isPending={certs.isPending || certTypes.isPending || sites.isPending}
          />
        </TabsContent>

        <TabsContent value="history" className="flex flex-col gap-3 p-5">
          <h3 className="text-sm font-semibold">Shift history</h3>
          <ShiftHistory
            shifts={shifts.data}
            sites={sites.data}
            isPending={shifts.isPending || sites.isPending}
          />
        </TabsContent>
      </EntityDrawer>

      {w && certTypes.data && (
        <CertUploadDialog
          workerId={w.id}
          companyId={w.company_id}
          certTypes={certTypes.data}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          initialFile={null}
        />
      )}
    </>
  );
}
