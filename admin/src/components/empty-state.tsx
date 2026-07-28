import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Drawn line-art glyphs, one per empty surface.
 *
 * Deliberately hand-drawn rather than pulled from an illustration library:
 * six of these weigh less than a dependency, they inherit `currentColor` so
 * they cost nothing to support in dark mode, and a stroked outline reads as
 * "nothing here yet" where a filled icon reads as a button.
 *
 * Everything is stroked at 1.25px on a 64×48 canvas, with the accent reserved
 * for the one element the copy is actually about.
 */
export type EmptyGlyph = 'list' | 'calendar' | 'people' | 'map' | 'search' | 'clock';

function GlyphFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      width="64"
      height="48"
      viewBox="0 0 64 48"
      fill="none"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-border-strong"
    >
      {children}
    </svg>
  );
}

const GLYPHS: Record<EmptyGlyph, ReactNode> = {
  // A checklist with its last line still blank.
  list: (
    <>
      <rect x="16" y="8" width="32" height="34" rx="3" stroke="currentColor" />
      <path d="M22 18h4M22 26h4" stroke="currentColor" />
      <path d="M30 18h12M30 26h9" stroke="currentColor" />
      <path d="M22 34h4" className="text-primary" stroke="currentColor" />
      <path d="M30 34h6" stroke="currentColor" strokeDasharray="2 3" />
    </>
  ),
  // A month grid with one day left unfilled.
  calendar: (
    <>
      <rect x="14" y="10" width="36" height="32" rx="3" stroke="currentColor" />
      <path d="M14 19h36M23 10V6M41 10V6" stroke="currentColor" />
      <path d="M21 26h4M30 26h4M39 26h4M21 34h4M30 34h4" stroke="currentColor" />
      <rect
        x="38"
        y="32"
        width="5"
        height="5"
        rx="1.5"
        className="text-primary"
        stroke="currentColor"
      />
    </>
  ),
  // Two figures, the second only sketched in.
  people: (
    <>
      <circle cx="26" cy="17" r="6" stroke="currentColor" />
      <path d="M15 38c0-6.1 4.9-11 11-11s11 4.9 11 11" stroke="currentColor" />
      <circle cx="42" cy="20" r="4.5" stroke="currentColor" strokeDasharray="2 3" />
      <path d="M34 38c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeDasharray="2 3" />
    </>
  ),
  // A pin over a geofence ring.
  map: (
    <>
      <ellipse cx="32" cy="36" rx="15" ry="5" stroke="currentColor" strokeDasharray="3 3" />
      <path
        d="M32 34s-8-8.6-8-14a8 8 0 1 1 16 0c0 5.4-8 14-8 14Z"
        className="text-primary"
        stroke="currentColor"
      />
      <circle cx="32" cy="20" r="2.75" className="text-primary" stroke="currentColor" />
    </>
  ),
  // A lens with nothing under it.
  search: (
    <>
      <circle cx="29" cy="21" r="11" stroke="currentColor" />
      <path d="M37 29l8 8" className="text-primary" stroke="currentColor" />
      <path d="M24 21h10" stroke="currentColor" strokeDasharray="2 3" />
    </>
  ),
  // A dial with no reading.
  clock: (
    <>
      <circle cx="32" cy="24" r="14" stroke="currentColor" />
      <path d="M32 16v8l5 3" className="text-primary" stroke="currentColor" />
      <path d="M32 10V8M32 40v-2M46 24h2M16 24h2" stroke="currentColor" />
    </>
  ),
};

interface EmptyStateProps {
  /** Legacy Phosphor icon. Prefer `glyph`; kept for un-migrated call sites. */
  icon?: Icon;
  glyph?: EmptyGlyph;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: IconComponent,
  glyph,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-default px-6 py-14 text-center',
        className,
      )}
    >
      {glyph ? (
        <GlyphFrame>{GLYPHS[glyph]}</GlyphFrame>
      ) : IconComponent ? (
        <div className="rounded-sm bg-surface-2 p-3">
          <IconComponent size={26} weight="duotone" className="text-text-tertiary" aria-hidden />
        </div>
      ) : null}
      <p className="mt-1 text-h3 text-foreground">{title}</p>
      <p className="max-w-sm text-small text-text-secondary">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
