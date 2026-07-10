import { CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import type { CertStatus } from '@/lib/database.types';
import { cn } from '@/lib/utils';

/**
 * The canonical rendering of the semantic status system (CLAUDE.md law):
 * green = compliant/approved/on-site/filled · amber = expiring/pending/warning
 * · red = expired/unfilled/flagged/blocked. Mirrored 1:1 by the mobile
 * StatusPill — change both together or neither.
 */

export type StatusTone = 'success' | 'warning' | 'danger';

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

const toneIcons: Record<StatusTone, typeof CheckCircle> = {
  success: CheckCircle,
  warning: WarningCircle,
  danger: XCircle,
};

interface StatusPillProps {
  tone: StatusTone;
  label: string;
  showIcon?: boolean;
  className?: string;
}

export function StatusPill({ tone, label, showIcon = true, className }: StatusPillProps) {
  const Icon = toneIcons[tone];
  return (
    <Badge variant="secondary" className={cn(toneClasses[tone], className)}>
      {showIcon && <Icon size={13} weight="duotone" aria-hidden />}
      {label}
    </Badge>
  );
}

const CERT_STATUS_TONE: Record<CertStatus, StatusTone> = {
  valid: 'success',
  expiring_soon: 'warning',
  expired: 'danger',
};

/** Worker-level compliance pill: ✓ Compliant / ⚠ Expiring / ✕ Expired. */
export function CompliancePill({ status, className }: { status: CertStatus; className?: string }) {
  const label = status === 'valid' ? 'Compliant' : status === 'expiring_soon' ? 'Expiring' : 'Expired';
  return <StatusPill tone={CERT_STATUS_TONE[status]} label={label} className={className} />;
}

/** Cert-card pill: Valid / Expiring soon / Expired. */
export function CertPill({ status, className }: { status: CertStatus; className?: string }) {
  const label = status === 'valid' ? 'Valid' : status === 'expiring_soon' ? 'Expiring soon' : 'Expired';
  return <StatusPill tone={CERT_STATUS_TONE[status]} label={label} className={className} />;
}
