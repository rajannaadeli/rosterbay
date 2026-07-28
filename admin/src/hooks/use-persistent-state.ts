import { useCallback, useState } from 'react';

/**
 * `useState` that survives a reload, backed by localStorage.
 *
 * For view preferences only — which roster view, which zoom. Never for data:
 * anything the server owns belongs in TanStack Query, not here.
 *
 * Reads lazily on first render and tolerates a private-mode or quota failure
 * by degrading to ordinary component state, since losing a toggle preference
 * is not worth an error boundary.
 */
export function usePersistentState<T>(key: string, fallback: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Private mode or quota — the in-memory value still applies.
      }
    },
    [key],
  );

  return [value, set];
}
