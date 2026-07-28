import { cn } from '@/lib/utils';

interface BrowserFrameProps {
  src: string;
  alt: string;
  /** Shown in the address bar. */
  url?: string;
  className?: string;
}

/**
 * A screenshot in a minimal browser chrome.
 *
 * The frame exists to say "this is a real product running in a real browser"
 * rather than "this is a mockup" — which is why the chrome is honest and
 * plain: three dots, an address bar with the actual domain, nothing invented.
 * A fake toolbar with fake extensions would undercut the exact claim it is
 * there to make.
 *
 * Deliberately drawn in markup rather than baked into the image so it
 * re-themes, stays crisp at any DPI, and lets the screenshot be swapped
 * without a trip through an image editor.
 */
export function BrowserFrame({ src, alt, url = 'rosterbay.com/app/roster', className }: BrowserFrameProps) {
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-xl border border-border-default bg-surface-2 shadow-[var(--elevation-3)]',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-1 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </span>
        <span className="num mx-auto truncate rounded-xs bg-surface-2 px-3 py-0.5 text-nano leading-relaxed text-text-tertiary">
          {url}
        </span>
      </div>
      <img src={src} alt={alt} className="block w-full" loading="eager" />
    </figure>
  );
}
