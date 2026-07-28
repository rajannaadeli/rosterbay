import { ArrowClockwise } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const SPIN_MS = 400;

interface RefreshButtonProps {
  onRefresh: () => void;
  /** Announced to screen readers, e.g. "Refresh the live map". */
  label: string;
  /** Keeps the icon spinning while an in-flight fetch resolves. */
  busy?: boolean;
  className?: string;
}

/**
 * Per-card refresh for live surfaces (the dashboard map, the activity feed).
 *
 * The spin always runs its full 400ms even when the query resolves from cache
 * in 5ms — an instant, invisible refresh reads as a dead button, and the
 * point of the control is the acknowledgement.
 */
export function RefreshButton({ onRefresh, label, busy, className }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!spinning) return;
    const timer = window.setTimeout(() => setSpinning(false), SPIN_MS);
    return () => window.clearTimeout(timer);
  }, [spinning]);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        setSpinning(true);
        onRefresh();
      }}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-text-tertiary',
        'transition-colors duration-[var(--duration-micro)] hover:bg-surface-2 hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <ArrowClockwise
        size={13}
        weight="bold"
        aria-hidden
        className={cn(
          (spinning || busy) && 'animate-[spin_400ms_var(--ease-inout)]',
          busy && 'animate-spin',
        )}
      />
    </button>
  );
}
