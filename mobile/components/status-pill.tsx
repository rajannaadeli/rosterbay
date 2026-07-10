import { CheckCircleIcon, WarningCircleIcon, XCircleIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import type { CertStatus } from '@/lib/database.types';
import { cn } from '@/lib/utils';

/**
 * The canonical rendering of the semantic status system (CLAUDE.md law):
 * green = compliant/approved/on-site/filled · amber = expiring/pending/warning
 * · red = expired/unfilled/flagged/blocked. Mirrors the web StatusPill 1:1 —
 * change both together or neither.
 */

export type StatusTone = 'success' | 'warning' | 'danger';

const TONE_HEX: Record<StatusTone, string> = {
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
};

const toneBg: Record<StatusTone, string> = {
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  danger: 'bg-danger/10',
};

const toneText: Record<StatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

const toneIcons: Record<StatusTone, typeof CheckCircleIcon> = {
  success: CheckCircleIcon,
  warning: WarningCircleIcon,
  danger: XCircleIcon,
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
    <Badge variant="secondary" className={cn(toneBg[tone], className)}>
      {showIcon && (
        <View accessibilityElementsHidden>
          <Icon size={13} weight="duotone" color={TONE_HEX[tone]} />
        </View>
      )}
      <Text className={cn('text-xs font-medium', toneText[tone])}>{label}</Text>
    </Badge>
  );
}

export const CERT_STATUS_TONE: Record<CertStatus, StatusTone> = {
  valid: 'success',
  expiring_soon: 'warning',
  expired: 'danger',
};

/** Cert-card pill: Valid / Expiring soon / Expired. */
export function CertPill({ status, className }: { status: CertStatus; className?: string }) {
  const label = status === 'valid' ? 'Valid' : status === 'expiring_soon' ? 'Expiring soon' : 'Expired';
  return <StatusPill tone={CERT_STATUS_TONE[status]} label={label} className={className} />;
}
