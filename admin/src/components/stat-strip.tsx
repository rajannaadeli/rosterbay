import type { Icon } from '@phosphor-icons/react';
import { Link } from 'react-router';

import { Skeleton } from '@/components/ui/skeleton';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

export interface StatSegment {
  label: string;
  value: number;
  icon: Icon;
  /** Optional destination — segment becomes a link with hover tint. */
  to?: string;
  /** Optional click handler — segment becomes a filter button. */
  onClick?: () => void;
  /** Pressed state when this segment's filter is active. */
  active?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  /** Count-up animation (dashboard KPIs). Off for static counts. */
  animate?: boolean;
}

const TONE_TEXT = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

function SegmentValue({ value, tone, animate }: { value: number; tone: keyof typeof TONE_TEXT; animate: boolean }) {
  const counted = useCountUp(animate ? value : value, animate ? 600 : 0);
  return (
    <span className={cn('text-xl font-semibold tabular-nums', TONE_TEXT[tone])}>
      {animate ? counted : value}
    </span>
  );
}

/**
 * Low-height stat strip: one bordered card, segments split by hairlines, each
 * optionally routing to a filtered view. Replaces tall KPI cards (spec §6).
 */
export function StatStrip({ segments, loading }: { segments: StatSegment[]; loading?: boolean }) {
  return (
    <div className="flex divide-x overflow-hidden rounded-lg border bg-card">
      {segments.map((seg) => {
        const inner = (
          <>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <seg.icon size={16} weight="duotone" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{seg.label}</p>
              {loading ? (
                <Skeleton className="mt-0.5 h-6 w-8" />
              ) : (
                <SegmentValue
                  value={seg.value}
                  tone={seg.tone ?? 'default'}
                  animate={seg.animate ?? false}
                />
              )}
            </div>
          </>
        );
        const interactive = Boolean(seg.to || seg.onClick);
        const className = cn(
          'relative flex flex-1 items-center gap-2.5 px-4 py-2.5 text-left transition-colors',
          interactive && 'hover:bg-muted/50',
          seg.active &&
            'bg-primary/5 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary',
        );
        if (seg.to) {
          return (
            <Link key={seg.label} to={seg.to} className={className}>
              {inner}
            </Link>
          );
        }
        if (seg.onClick) {
          return (
            <button key={seg.label} type="button" onClick={seg.onClick} className={className}>
              {inner}
            </button>
          );
        }
        return (
          <div key={seg.label} className={className}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
