import { useEffect, useRef, useState } from 'react';

import { DURATION, prefersReducedMotion } from '@/lib/motion';

/**
 * KPI count-up: numbers rise to their value instead of snapping.
 *
 * This is the one animation in the app that CSS can't opt out of on its own —
 * the value itself is interpolated in JS — so the reduced-motion check lives
 * here rather than in the stylesheet.
 */
export function useCountUp(target: number, durationMs: number = DURATION.countUp): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    if (durationMs === 0 || prefersReducedMotion()) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    let frame: number;

    // Matches --ease-out: fast departure, long settle.
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + (target - from) * eased);
      setValue(next);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
