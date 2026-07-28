import type { Icon } from '@phosphor-icons/react';
import { Link } from 'react-router';

import { Skeleton } from '@/components/ui/skeleton';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: number;
  icon: Icon;
  to: string;
  loading?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const TONE_TEXT = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export function KpiCard({ title, value, icon: CardIcon, to, loading, tone = 'default' }: KpiCardProps) {
  const displayed = useCountUp(loading ? 0 : value);

  return (
    <Link
      to={to}
      className="e1 group flex items-center justify-between gap-3 rounded-lg px-4 py-3 outline-none transition-[border-color,background-color] duration-[var(--duration-micro)] hover:border-border-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <div>
        <p className="label-micro">{title}</p>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-10" />
        ) : (
          <p className={cn('num mt-1 text-display', TONE_TEXT[tone])}>
            {displayed}
          </p>
        )}
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent-muted text-primary">
        <CardIcon size={18} weight="duotone" aria-hidden />
      </div>
    </Link>
  );
}
