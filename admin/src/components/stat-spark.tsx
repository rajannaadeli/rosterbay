/**
 * Drawn micro-visuals for the stat strip — each ≤40×28px, no chart library.
 *
 * A KPI that says "1" tells you the count. These say *which* one, *when*, and
 * *how far through* — the same number with its shape attached. Every variant
 * is fed from data the page has already loaded.
 */

const W = 40;
const H = 24;

/**
 * Presence strip: one tick per worker, lit for those on site.
 *
 * Reads as a crew list rather than a bar, which is the point — "1 of 14" is a
 * different fact from "1", and the gap between lit and unlit ticks is it.
 */
export function PresenceSpark({ total, active }: { total: number; active: number }) {
  const ticks = Math.max(1, Math.min(total, 20));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      {Array.from({ length: ticks }, (_, i) => {
        const lit = i < active;
        const x = (i * W) / ticks + 0.5;
        const w = Math.max(1.4, W / ticks - 1);
        return (
          <rect
            key={i}
            x={x}
            y={lit ? 4 : 8}
            width={w}
            height={lit ? H - 8 : H - 16}
            rx={0.8}
            fill={lit ? 'var(--success)' : 'var(--text-tertiary)'}
            opacity={lit ? 1 : 0.35}
            className={lit ? 'dark:drop-shadow-[0_0_3px_var(--success)]' : undefined}
          />
        );
      })}
    </svg>
  );
}

/**
 * A 24-hour track with unfilled windows marked — the coverage ribbon's
 * renderer at KPI scale, so "2 unfilled" carries *when* with it.
 */
export function DayTrackSpark({
  windows,
}: {
  /** `[startMin, endMin]` pairs within the day, in minutes. */
  windows: [number, number][];
}) {
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      <rect x={0} y={H / 2 - 3} width={W} height={6} rx={3} fill="var(--border-subtle)" />
      {/* Midday tick, so a window's position is readable without an axis. */}
      <rect x={W / 2 - 0.5} y={H / 2 - 6} width={1} height={12} fill="var(--border-strong)" />
      {windows.map(([start, end], i) => (
        <rect
          key={i}
          x={(start / 1440) * W}
          y={H / 2 - 3}
          width={Math.max(1.5, ((end - start) / 1440) * W)}
          height={6}
          rx={2}
          fill="var(--danger)"
        />
      ))}
    </svg>
  );
}

/**
 * Compressed compliance runway: today at the left, twelve months right, one
 * dot per expiring cert. Same geometry as the drawer's full runway.
 */
export function RunwaySpark({ daysUntil }: { daysUntil: number[] }) {
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      <rect x={0} y={H / 2 - 2} width={W} height={4} rx={2} fill="var(--border-subtle)" />
      <rect x={0} y={H / 2 - 5} width={1} height={10} fill="var(--primary)" />
      {/* The 30-day danger zone, proportional to a 12-month horizon. */}
      <rect
        x={0}
        y={H / 2 - 2}
        width={(30 / 365) * W}
        height={4}
        fill="var(--warning)"
        opacity={0.35}
      />
      {daysUntil.map((days, i) => (
        <circle
          key={i}
          cx={Math.min(W - 2, Math.max(2, (Math.max(0, days) / 365) * W))}
          cy={H / 2}
          r={3}
          fill={days < 0 ? 'var(--danger)' : days <= 30 ? 'var(--warning)' : 'var(--primary)'}
        />
      ))}
    </svg>
  );
}

/** Pending vs flagged as one stacked bar, in their semantic colours. */
export function ReviewSplitSpark({ pending, flagged }: { pending: number; flagged: number }) {
  const total = Math.max(1, pending + flagged);
  const pendingW = (pending / total) * W;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      <rect x={0} y={H / 2 - 4} width={W} height={8} rx={4} fill="var(--border-subtle)" />
      <rect x={0} y={H / 2 - 4} width={pendingW} height={8} fill="var(--warning)" rx={4} />
      <rect
        x={pendingW}
        y={H / 2 - 4}
        width={W - pendingW}
        height={8}
        fill="var(--danger)"
        rx={4}
      />
      {/* Seam, so two adjacent semantic fills don't read as one gradient. */}
      {pending > 0 && flagged > 0 && (
        <rect x={pendingW - 0.5} y={H / 2 - 4} width={1} height={8} fill="var(--surface-1)" />
      )}
    </svg>
  );
}
