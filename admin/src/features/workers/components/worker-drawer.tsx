import { ArrowUpRight, Phone, UploadSimple } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { CompliancePill } from '@/components/status-pill';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useCertTypes } from '@/features/certs/hooks';
import { useSites } from '@/features/sites/hooks';
import { AvailabilityNotes } from '@/features/workers/components/availability-notes';
import { CertUploadDialog } from '@/features/workers/components/cert-upload-dialog';
import { DocumentWallet } from '@/features/workers/components/document-wallet';
import { ShiftHistory } from '@/features/workers/components/shift-history';
import { useWorker, useWorkerCerts, useWorkerShifts } from '@/features/workers/hooks';
import type { CertStatus } from '@/lib/database.types';
import { formatACST, initials } from '@/lib/format';

interface WorkerDrawerProps {
  workerId: string | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Supabase-style half-width drawer (WhiteFleet team-member-drawer pattern):
 * row click → quick view/edit in place, no page navigation, table state kept.
 */
export function WorkerDrawer({ workerId, onOpenChange }: WorkerDrawerProps) {
  const id = workerId ?? '';
  const worker = useWorker(id);
  const certs = useWorkerCerts(id);
  const shifts = useWorkerShifts(id);
  const sites = useSites();
  const certTypes = useCertTypes();
  const [uploadOpen, setUploadOpen] = useState(false);

  const compliance: CertStatus = useMemo(() => {
    const statuses = (certs.data ?? []).map((cert) => cert.status);
    if (statuses.includes('expired')) return 'expired';
    if (statuses.includes('expiring_soon')) return 'expiring_soon';
    return 'valid';
  }, [certs.data]);

  const lastClockIn = useMemo(() => {
    const completed = (shifts.data ?? []).find((shift) => shift.status !== 'open');
    return completed?.starts_at ?? null;
  }, [shifts.data]);

  return (
    <Sheet open={workerId !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[50vw]!">
        {worker.isPending || !worker.data ? (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-60" />
              </div>
            </div>
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : (
          <>
            <SheetHeader className="gap-3 border-b bg-muted/20 p-5">
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    {worker.data.avatar_url && <AvatarImage src={worker.data.avatar_url} alt="" />}
                    <AvatarFallback>{initials(worker.data.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <SheetTitle className="flex items-center gap-2 text-base">
                      {worker.data.full_name}
                      {!certs.isPending && <CompliancePill status={compliance} />}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-3">
                      <span>{worker.data.job_title}</span>
                      {worker.data.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={13} aria-hidden />
                          {worker.data.phone}
                        </span>
                      )}
                    </SheetDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to={`/app/workers/${worker.data.id}`} />}
                >
                  Full profile
                  <ArrowUpRight aria-hidden />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: 'Documents',
                    value: certs.isPending ? '…' : String(certs.data?.length ?? 0),
                  },
                  {
                    label: 'Recent shifts',
                    value: shifts.isPending ? '…' : String(shifts.data?.length ?? 0),
                  },
                  {
                    label: 'Last shift',
                    value: lastClockIn ? formatACST(lastClockIn, 'd MMM') : '—',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-5 p-5">
              <section className="flex flex-col gap-3">
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
              </section>

              <Separator />

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Availability</h3>
                <AvailabilityNotes
                  key={worker.data.availability_notes ?? ''}
                  workerId={worker.data.id}
                  notes={worker.data.availability_notes}
                />
              </section>

              <Separator />

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Shift history</h3>
                <ShiftHistory
                  shifts={shifts.data}
                  sites={sites.data}
                  isPending={shifts.isPending || sites.isPending}
                />
              </section>
            </div>

            {certTypes.data && (
              <CertUploadDialog
                workerId={worker.data.id}
                companyId={worker.data.company_id}
                certTypes={certTypes.data}
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                initialFile={null}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
