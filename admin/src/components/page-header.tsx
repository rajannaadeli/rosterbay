import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned action slot — buttons, filters, exports. */
  actions?: ReactNode;
  /** Small uppercase eyebrow above the title (module or context). */
  eyebrow?: string;
  className?: string;
}

/**
 * The one page header in the app. Every route composes this rather than
 * hand-rolling an `<h1>` + description + button row, which is how the five
 * pages drifted into five different title sizes in the first place.
 */
export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="label-micro mb-1.5">{eyebrow}</p>}
        <h1 className="truncate text-display text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-small text-text-secondary">{description}</p>
        )}
      </div>
      {actions && (
        // `-mx-4 px-4` bleeds the scroller to the page gutter so a row of
        // controls that overruns the screen scrolls cleanly to its last item
        // instead of clipping against the padding. Above `lg` it wraps as
        // before and the scroller never engages.
        <div className="scroll-x-contained scrollbar-thin -mx-4 shrink-0 px-4 sm:-mx-5 sm:px-5 lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="flex w-max min-w-full items-center gap-2 lg:w-auto lg:flex-wrap lg:justify-end">
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}
