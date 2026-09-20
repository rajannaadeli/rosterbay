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
        // Wraps at every width. This was a horizontal scroller on phones,
        // which meant the roster's leading control sat half off-screen with
        // nothing to say it was there — a row you have to discover by
        // swiping is a row that gets missed. Two short rows of controls are
        // plainly better than one hidden one.
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
