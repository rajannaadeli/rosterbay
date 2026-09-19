import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query from JS.
 *
 * Layout is CSS's job everywhere it can be — this exists for the two cases it
 * can't reach: not *rendering* something at all (a `display:none` hero still
 * downloads its images), and swapping a component's structure rather than its
 * styling (the worker page's phone chrome).
 *
 * `useSyncExternalStore` rather than useState+useEffect so the first render
 * already has the right answer and there is no one-frame flash of the wrong
 * layout. The server snapshot returns false, which is the mobile-first
 * assumption: the smaller layout renders, then upgrades.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `sm` and up — 640px. */
export const MQ_SM = '(min-width: 40rem)';
/** Tailwind's `md` and up — 768px. The table/grid → card/agenda line. */
export const MQ_MD = '(min-width: 48rem)';
/** Tailwind's `lg` and up — 1024px. The sidebar line. */
export const MQ_LG = '(min-width: 64rem)';
