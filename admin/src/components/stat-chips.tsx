import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface StatChip {
  label: string;
  value: ReactNode;
  /** Semantic tone — maps to the status-color law, never off-system colors. */
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const TONE_CLASSES = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

/**
 * WhiteFleet-style low-height stat strip — compact chips in one bordered row,
 * replacing tall stat cards so key numbers never force scrolling.
 */
export function StatChips({ chips, loading }: { chips: StatChip[]; loading?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-2.5">
      {chips.map(({ label, value, tone = 'default' }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={cn('text-sm font-semibold tabular-nums', TONE_CLASSES[tone])}>
            {loading ? <Skeleton className="inline-block h-4 w-6" /> : value}
          </span>
        </div>
      ))}
    </div>
  );
}
