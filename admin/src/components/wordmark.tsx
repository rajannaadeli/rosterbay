import { SquaresFour } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

export function Wordmark({ className, iconSize = 22 }: { className?: string; iconSize?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-semibold tracking-tight text-foreground', className)}>
      <SquaresFour size={iconSize} weight="duotone" className="text-primary" aria-hidden />
      RosterBay
    </span>
  );
}
