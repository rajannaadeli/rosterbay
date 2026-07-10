import { ArrowLeft, Phone, UploadSimple } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import { CompliancePill } from '@/components/status-pill';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCertTypes } from '@/features/certs/hooks';
import { useSites } from '@/features/sites/hooks';
import { AvailabilityNotes } from '@/features/workers/components/availability-notes';
import { CertUploadDialog } from '@/features/workers/components/cert-upload-dialog';
import { DocumentWallet } from '@/features/workers/components/document-wallet';
import { ShiftHistory } from '@/features/workers/components/shift-history';
import { useWorker, useWorkerCerts, useWorkerShifts } from '@/features/workers/hooks';
import type { CertStatus } from '@/lib/database.types';
import { initials } from '@/lib/format';

export function WorkerDetailPage() {
  const { workerId = '' } = useParams<'workerId'>();
  const worker = useWorker(workerId);
  const certs = useWorkerCerts(workerId);
  const shifts = useWorkerShifts(workerId);
  const sites = useSites();
  const certTypes = useCertTypes();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  const compliance: CertStatus = useMemo(() => {
    const statuses = (certs.data ?? []).map((cert) => cert.status);
    if (statuses.includes('expired')) return 'expired';
    if (statuses.includes('expiring_soon')) return 'expiring_soon';
    return 'valid';
  }, [certs.data]);

  return (
    <div
      className="flex flex-col gap-6"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) {
          setDroppedFile(file);
          setUploadOpen(true);
        }
      }}
    >
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" render={<Link to="/app/workers" />}>
          <ArrowLeft aria-hidden />
          Workers
        </Button>
      </div>

      {worker.isPending ? (
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      ) : worker.data ? (
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {worker.data.avatar_url && <AvatarImage src={worker.data.avatar_url} alt="" />}
              <AvatarFallback>{initials(worker.data.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold">{worker.data.full_name}</h1>
                {!certs.isPending && <CompliancePill status={compliance} />}
              </div>
              <p className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{worker.data.job_title}</span>
                {worker.data.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={14} aria-hidden />
                    {worker.data.phone}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <UploadSimple aria-hidden />
            Add document
          </Button>
        </header>
      ) : (
        <p className="text-sm text-danger">Worker not found.</p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Document Wallet</h2>
        <DocumentWallet
          certs={certs.data}
          certTypes={certTypes.data}
          sites={sites.data}
          isPending={certs.isPending || certTypes.isPending || sites.isPending}
        />
        <p className="text-xs text-muted-foreground">
          Tip: drop a file anywhere on this page to add it to the wallet.
        </p>
      </section>

      <Separator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Shift history</h2>
          <ShiftHistory
            shifts={shifts.data}
            sites={sites.data}
            isPending={shifts.isPending || sites.isPending}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Availability</h2>
          {worker.data && (
            <AvailabilityNotes
              key={worker.data.availability_notes ?? ''}
              workerId={workerId}
              notes={worker.data.availability_notes}
            />
          )}
        </section>
      </div>

      {worker.data && certTypes.data && (
        <CertUploadDialog
          workerId={workerId}
          companyId={worker.data.company_id}
          certTypes={certTypes.data}
          open={uploadOpen}
          onOpenChange={(open) => {
            setUploadOpen(open);
            if (!open) setDroppedFile(null);
          }}
          initialFile={droppedFile}
        />
      )}
    </div>
  );
}
