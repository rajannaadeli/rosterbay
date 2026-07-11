import { CalendarCheck } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

/** The one logo lockup: CalendarCheck glyph in teal + Inter semibold wordmark. */
export function Wordmark({ className, iconSize = 22 }: { className?: string; iconSize?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-semibold tracking-tight text-foreground', className)}>
      <CalendarCheck size={iconSize} weight="duotone" className="text-primary" aria-hidden />
      RosterBay
    </span>
  );
}
