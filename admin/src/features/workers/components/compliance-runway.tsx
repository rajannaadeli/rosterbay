import { FileText, Prohibit } from '@phosphor-icons/react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Tables, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

type Cert = Views<'worker_certs_with_status'>;

/** The runway looks twelve months ahead; anything further is a full track. */
const HORIZON_DAYS = 365;
/** Width of the pre-today region, as a share of the whole rail. */
const PAST_SHARE = 0.18;
/** The 0–30 day warning band, as a share of the future region. */
const DANGER_DAYS = 30;

const LANE_LABEL_PX = 148;

/**
 * Where a marker sits on the rail, 0–1 across the whole component.
 *
 * Expired certs render *left* of today inside the past region, compressed —
 * six days expired and sixty days expired both need to read as "over the
 * line", and giving the past a proportional axis would push a long-lapsed
 * cert off-screen or squash the twelve months that actually matter.
 */
function positionFor(daysUntilExpiry: number): number {
  if (daysUntilExpiry < 0) {
    const depth = Math.min(1, Math.abs(daysUntilExpiry) / 90);
    return PAST_SHARE * (1 - depth) * 0.9;
  }
  const ahead = Math.min(1, daysUntilExpiry / HORIZON_DAYS);
  return PAST_SHARE + ahead * (1 - PAST_SHARE);
}

function expiryLabel(cert: Cert): string {
  const days = cert.days_until_expiry;
  if (days < 0) {
    const n = Math.abs(days);
    return `EXPIRED ${n === 0 ? 'TODAY' : `${n}d`}`;
  }
  if (days === 0) return 'EXPIRES TODAY';
  // Past the horizon the exact figure is noise — one seeded White Card runs to
  // 2126, and "36512d" tells an ops manager nothing "12m+" doesn't.
  if (days > HORIZON_DAYS) return '12m+';
  return `${days}d`;
}

interface ComplianceRunwayProps {
  certs: Cert[];
  certTypes: Tables<'cert_types'>[] | undefined;
  sites: Tables<'job_sites'>[] | undefined;
}

/**
 * A twelve-month certification timeline — the compliance equivalent of a fuel
 * gauge.
 *
 * Replaces a grid of cert cards where every card looked the same regardless of
 * whether it lapsed last week or renews in a year. Here the distance between a
 * marker and the TODAY line *is* the remaining runway, so a worker's whole
 * compliance position reads in one horizontal scan.
 */
export function ComplianceRunway({ certs, certTypes, sites }: ComplianceRunwayProps) {
  const typeById = new Map((certTypes ?? []).map((certType) => [certType.id, certType]));

  // Soonest-expiring first: the lane that needs attention is the top one.
  const ordered = [...certs].sort((a, b) => a.days_until_expiry - b.days_until_expiry);

  const todayPct = PAST_SHARE * 100;
  const dangerPct = (DANGER_DAYS / HORIZON_DAYS) * (1 - PAST_SHARE) * 100;

  return (
    <div className="e1 flex flex-col overflow-hidden rounded-lg">
      {/* Month scale */}
      <div className="flex items-end border-b border-border-subtle bg-surface-2 px-3 pt-2 pb-1.5">
        <span style={{ width: LANE_LABEL_PX }} className="label-micro shrink-0">
          Certification
        </span>
        <div className="relative h-4 min-w-0 flex-1 pr-6">
          <span
            style={{ left: `${todayPct}%` }}
            className="num absolute -translate-x-1/2 rounded-xs bg-primary px-1 py-px text-[10px] leading-none font-semibold text-primary-foreground"
          >
            TODAY
          </span>
          {[3, 6, 9, 12].map((month) => (
            <span
              key={month}
              style={{ left: `${PAST_SHARE * 100 + (month / 12) * (1 - PAST_SHARE) * 100}%` }}
              className="num absolute -translate-x-1/2 text-[10px] leading-none text-text-tertiary"
            >
              +{month}m
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        {ordered.map((cert, index) => {
          const certType = typeById.get(cert.cert_type_id);
          const expired = cert.status === 'expired';
          const expiring = cert.status === 'expiring_soon';
          const markerPct = positionFor(cert.days_until_expiry) * 100;
          const blockedSites = expired
            ? (sites ?? []).filter((site) =>
                site.required_cert_type_ids.includes(cert.cert_type_id),
              )
            : [];

          return (
            <div
              key={cert.id}
              className="flex items-center gap-0 border-b border-border-subtle px-3 py-2.5 last:border-b-0 animate-[fade-up_var(--duration-entrance)_var(--ease-out)_both]"
              style={{ animationDelay: `${Math.min(index, 7) * 40}ms` }}
            >
              <div style={{ width: LANE_LABEL_PX }} className="min-w-0 shrink-0 pr-3">
                <p className="truncate text-small font-medium">
                  {certType?.name ?? 'Certificate'}
                </p>
                <p className="num truncate text-[10px] leading-tight text-text-tertiary">
                  {certType?.code}
                </p>
              </div>

              <div className="relative h-8 min-w-0 flex-1 pr-6">
                {/* Rail */}
                <span className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 overflow-hidden rounded-full bg-surface-2">
                  {/* 0–30 day warning wash, immediately right of today */}
                  <span
                    className="absolute inset-y-0 bg-warning/20"
                    style={{ left: `${todayPct}%`, width: `${dangerPct}%` }}
                  />
                  {/* Filled portion = runway remaining. For an expired cert the
                      fill stops at today and the lapsed stub is hatched. */}
                  <span
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full',
                      expired ? 'bg-danger/25' : expiring ? 'bg-warning' : 'bg-primary',
                    )}
                    style={{ width: `${expired ? todayPct : markerPct}%` }}
                  />
                  {expired && (
                    <svg
                      aria-hidden
                      className="absolute inset-y-0 left-0"
                      style={{ width: `${todayPct}%`, height: '100%' }}
                    >
                      <rect width="100%" height="100%" fill="url(#rb-hatch-danger)" />
                    </svg>
                  )}
                </span>

                {/* TODAY line */}
                <span
                  aria-hidden
                  className="absolute inset-y-1 w-px bg-primary dark:shadow-[var(--accent-glow)]"
                  style={{ left: `${todayPct}%` }}
                />

                {/* Expiry marker */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`${certType?.name ?? 'Certificate'} — ${expiryLabel(cert)}`}
                        style={{ left: `${markerPct}%` }}
                        className={cn(
                          'absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-1',
                          'transition-transform duration-[var(--duration-micro)] hover:scale-125',
                          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                          expired ? 'bg-danger' : expiring ? 'bg-warning' : 'bg-primary',
                        )}
                      />
                    }
                  />
                  <TooltipContent>
                    <span className="num">Issued {formatACST(cert.issued_on, 'd MMM yyyy')}</span>
                    <br />
                    <span className="num">Expires {formatACST(cert.expires_on, 'd MMM yyyy')}</span>
                    {cert.file_url && (
                      <>
                        <br />
                        <span className="inline-flex items-center gap-1 text-primary">
                          <FileText size={11} aria-hidden /> Document attached
                        </span>
                      </>
                    )}
                  </TooltipContent>
                </Tooltip>

                {/* Days-remaining label, parked clear of the marker */}
                <span
                  className={cn(
                    'num absolute top-1/2 -translate-y-1/2 text-[10px] leading-none font-semibold whitespace-nowrap',
                    expired
                      ? 'text-danger'
                      : expiring
                        ? 'text-warning'
                        : 'text-text-tertiary',
                  )}
                  style={
                    // Past the two-thirds mark the label would run off the
                    // right edge, so it flips to the marker's left.
                    markerPct > 66
                      ? { right: `${100 - markerPct}%`, marginRight: 10 }
                      : { left: `${markerPct}%`, marginLeft: 10 }
                  }
                >
                  {expiryLabel(cert)}
                </span>
              </div>

              {blockedSites.length > 0 && (
                <span className="ml-3 flex shrink-0 items-center gap-1 text-[10px] leading-none font-semibold text-danger">
                  <Prohibit size={12} weight="bold" aria-hidden />
                  Blocks: {blockedSites.map((site) => site.name).join(', ')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The same runway compressed to one 4px rail — used in the Workers table's
 * hover card, where a full lane list would be a second drawer.
 *
 * Reuses `positionFor` so a marker sits at the identical fraction in both
 * places; a viewer moving between them is reading the same picture.
 */
export function ComplianceRunwaySpark({ certs, className }: { certs: Cert[]; className?: string }) {
  if (certs.length === 0) {
    return <span className={cn('block h-1 rounded-full bg-surface-2', className)} />;
  }
  const soonest = Math.min(...certs.map((cert) => cert.days_until_expiry));
  const tone = soonest < 0 ? 'bg-danger' : soonest <= DANGER_DAYS ? 'bg-warning' : 'bg-primary';

  return (
    <span className={cn('relative block h-1 rounded-full bg-surface-2', className)}>
      <span
        className={cn('absolute inset-y-0 left-0 rounded-full', tone)}
        style={{ width: `${Math.max(4, positionFor(soonest) * 100)}%` }}
      />
      {certs.map((cert) => (
        <span
          key={cert.id}
          className={cn(
            'absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full',
            cert.days_until_expiry < 0
              ? 'bg-danger'
              : cert.days_until_expiry <= DANGER_DAYS
                ? 'bg-warning'
                : 'bg-primary',
          )}
          style={{ left: `${positionFor(cert.days_until_expiry) * 100}%` }}
        />
      ))}
    </span>
  );
}
