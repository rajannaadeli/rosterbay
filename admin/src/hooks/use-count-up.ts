import { useEffect, useRef, useState } from 'react';

/** KPI count-up (spec §6): numbers rise to their value instead of snapping. */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    let frame: number;

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
