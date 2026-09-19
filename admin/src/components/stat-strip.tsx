import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Skeleton } from '@/components/ui/skeleton';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

export interface StatSegment {
  label: string;
  value: number;
  icon: Icon;
  /** Drawn micro-visual — the number's shape, sitting under it. */
  spark?: ReactNode;
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
    <span className={cn('num text-h2 font-bold', TONE_TEXT[tone])}>
      {animate ? counted : value}
    </span>
  );
}

/**
 * Low-height stat strip: one bordered card, segments split by hairlines, each
 * optionally routing to a filtered view. Replaces tall KPI cards (spec §6).
 *
 * It is a grid rather than a flex row so it can reflow to 2×2 on a phone —
 * four segments sharing 320px gives each ~74px, which is narrower than the
 * icon plus its padding and leaves nothing for the number that is the whole
 * point. The hairlines come from a per-cell `border-l border-t` pulled back a
 * pixel and clipped by the container, so they land in the right places at any
 * column count without the divider utilities needing to know the breakpoint.
 */
export function StatStrip({
  segments,
  loading,
  className,
}: {
  segments: StatSegment[];
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'e1 grid grid-cols-2 overflow-hidden rounded-lg sm:grid-cols-4',
        className,
      )}
    >
      {segments.map((seg) => {
        const inner = (
          <>
            <div className="hidden size-8 shrink-0 items-center justify-center rounded-sm bg-accent-muted text-primary xs:flex">
              <seg.icon size={16} weight="duotone" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="label-micro truncate">{seg.label}</p>
              {loading ? (
                <Skeleton className="mt-0.5 h-6 w-8" />
              ) : (
                <div className="flex items-center gap-2.5">
                  <SegmentValue
                    value={seg.value}
                    tone={seg.tone ?? 'default'}
                    animate={seg.animate ?? false}
                  />
                  {seg.spark}
                </div>
              )}
            </div>
          </>
        );
        const interactive = Boolean(seg.to || seg.onClick);
        const className = cn(
          '-mt-px -ml-px flex min-w-0 items-center gap-2 border-t border-l border-border-subtle px-3 py-2.5 text-left',
          'relative transition-colors duration-[var(--duration-micro)] sm:gap-2.5 sm:px-4',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none',
          interactive && 'hover:bg-surface-2',
          seg.active &&
            'bg-accent-muted after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary',
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
