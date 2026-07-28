/**
 * Motion primitives — the JavaScript half of the system.
 *
 * The CSS half lives in `index.css` (`--duration-*`, `--ease-*`, the
 * `fade-up` / `shimmer` / `live-pulse` keyframes, and the `.stagger` variant).
 * Anything that animates in a stylesheet should reach for those; this module
 * exists for the places that can't — Leaflet fly-tos, the count-up hook,
 * `setTimeout`-driven states like "Copied ✓".
 *
 * There is no animation library in this app. Every transition is either a CSS
 * transition on a token duration or one of the keyframes above, which is why
 * `prefers-reduced-motion` can be honoured in exactly one place instead of
 * per-component.
 */

/** Milliseconds. Mirrors `--duration-*` in index.css — keep both in step. */
export const DURATION = {
  /** Hover, focus, toggles. */
  micro: 120,
  /** Panels, popovers, expands. */
  standard: 220,
  /** Route and section mounts. */
  entrance: 320,
  /** Per item in a staggered list. */
  stagger: 40,
  /** Numeric interpolation on KPI values. */
  countUp: 600,
} as const;

/** Mirrors `--ease-*` in index.css. */
export const EASE = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

/**
 * Past eight items a stagger stops reading as choreography and starts reading
 * as lag, so the delay flattens out rather than growing forever.
 */
export const STAGGER_CAP = 8;

/** Inline `animation-delay` for list items outside a `.stagger` parent. */
export function staggerDelay(index: number): string {
  return `${Math.min(index, STAGGER_CAP - 1) * DURATION.stagger}ms`;
}

/**
 * True when the user has asked the OS to reduce motion.
 *
 * CSS handles this on its own; call this only for motion that JavaScript
 * drives, where there is no stylesheet to opt out of — chiefly the count-up,
 * which must land on its final value immediately rather than tick to it.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
