import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: Icon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: IconComponent, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <div className="rounded-lg bg-muted p-3">
        <IconComponent size={26} weight="duotone" className="text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-1 text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
