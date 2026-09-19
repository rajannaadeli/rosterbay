import { Check, Copy } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const COPIED_MS = 1200;

interface CopyButtonProps {
  value: string;
  /** Announced to screen readers, e.g. "Copy certificate code". */
  label: string;
  className?: string;
}

/**
 * Copy-to-clipboard beside an identifier — cert codes, site names, phone
 * numbers. Fades in on hover or keyboard focus of the containing group, so a
 * dense table isn't peppered with icons at rest; add `group/copy` to the
 * parent for that.
 */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async (event: React.MouseEvent) => {
    // These sit inside clickable rows and drawer headers — a copy must never
    // also open the row it lives in.
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard permission denied (or an insecure origin). Nothing useful
      // to say here — the value is on screen and selectable either way.
    }
  };

  return (
    <button
      type="button"
      aria-label={copied ? 'Copied' : label}
      onClick={handleCopy}
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-xs text-text-tertiary',
        'opacity-0 transition-[opacity,color,background-color] duration-[var(--duration-micro)]',
        'group-hover/copy:opacity-100 focus-visible:opacity-100 coarse:opacity-100',
        'hover:bg-surface-2 hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        copied && 'text-success opacity-100',
        className,
      )}
    >
      {copied ? (
        <Check size={12} weight="bold" aria-hidden />
      ) : (
        <Copy size={12} weight="regular" aria-hidden />
      )}
    </button>
  );
}
