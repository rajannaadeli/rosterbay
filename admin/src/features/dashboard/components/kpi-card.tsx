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
      className="group flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 outline-none transition-shadow hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-10" />
        ) : (
          <p className={cn('text-2xl font-semibold tracking-tight tabular-nums', TONE_TEXT[tone])}>
            {displayed}
          </p>
        )}
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <CardIcon size={18} weight="duotone" aria-hidden />
      </div>
    </Link>
  );
}
