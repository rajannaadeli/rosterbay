import { Certificate, FileText, Prohibit } from '@phosphor-icons/react';

import { EmptyState } from '@/components/empty-state';
import { CertPill } from '@/components/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DocumentWalletProps {
  certs: Views<'worker_certs_with_status'>[] | undefined;
  certTypes: Tables<'cert_types'>[] | undefined;
  sites: Tables<'job_sites'>[] | undefined;
  isPending: boolean;
}

function expiryLine(cert: Views<'worker_certs_with_status'>): string {
  if (cert.status === 'expired') {
    const days = Math.abs(cert.days_until_expiry);
    return `Expired ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}`;
  }
  if (cert.status === 'expiring_soon') {
    return `Expires in ${cert.days_until_expiry} day${cert.days_until_expiry === 1 ? '' : 's'}`;
  }
  return `Expires ${formatACST(cert.expires_on, 'd MMM yyyy')}`;
}

export function DocumentWallet({ certs, certTypes, sites, isPending }: DocumentWalletProps) {
  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </div>
    );
  }

  if ((certs?.length ?? 0) === 0) {
    return (
      <EmptyState
        icon={Certificate}
        title="No documents on file"
        description="Upload this worker's certificates and licences — expiry tracking starts the moment a document lands in the wallet."
      />
    );
  }

  const typeById = new Map((certTypes ?? []).map((certType) => [certType.id, certType]));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {certs?.map((cert) => {
        const certType = typeById.get(cert.cert_type_id);
        const blockedSites =
          cert.status === 'expired'
            ? (sites ?? []).filter((site) => site.required_cert_type_ids.includes(cert.cert_type_id))
            : [];

        return (
          <article
            key={cert.id}
            className={cn(
              'flex flex-col gap-2 rounded-lg border bg-card p-4',
              cert.status === 'expired' && 'border-l-4 border-l-danger',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">{certType?.name ?? 'Certificate'}</h3>
                <p className="text-xs text-muted-foreground">{certType?.code}</p>
              </div>
              <CertPill status={cert.status} />
            </div>

            <p
              className={cn(
                'text-sm',
                cert.status === 'expired'
                  ? 'font-medium text-danger'
                  : cert.status === 'expiring_soon'
                    ? 'font-medium text-warning'
                    : 'text-muted-foreground',
              )}
            >
              {expiryLine(cert)}
            </p>
            <p className="text-xs text-muted-foreground">
              Issued {formatACST(cert.issued_on, 'd MMM yyyy')}
            </p>

            {cert.file_url ? (
              <a
                href={cert.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <FileText size={14} aria-hidden />
                View document
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <FileText size={14} aria-hidden />
                No file attached
              </span>
            )}

            {blockedSites.map((site) => (
              <p
                key={site.id}
                className="mt-1 flex items-start gap-1.5 border-t pt-2 text-xs font-medium text-danger"
              >
                <Prohibit size={14} className="mt-px shrink-0" aria-hidden />
                Blocking assignment at: {site.name} (requires {certType?.name ?? 'this certificate'})
              </p>
            ))}
          </article>
        );
      })}
    </div>
  );
}
