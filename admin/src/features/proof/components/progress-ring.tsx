import { cn } from '@/lib/utils';

interface ProgressRingProps {
  done: number;
  total: number;
  /** Outer diameter in px. */
  size?: number;
  /** Amber when a shift finished with tasks outstanding; teal otherwise. */
  tone?: 'primary' | 'warning';
  className?: string;
}

/**
 * Task completion at a glance. Strokes use currentColor so the ring inherits
 * the semantic token (no hex values live here).
 */
export function ProgressRing({
  done,
  total,
  size = 48,
  tone = 'primary',
  className,
}: ProgressRingProps) {
  const stroke = size >= 44 ? 4 : 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total === 0 ? 0 : Math.min(1, done / total);

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${done} of ${total} tasks complete`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={cn(
            'transition-[stroke-dashoffset] duration-500',
            tone === 'warning' ? 'text-warning' : 'text-primary',
          )}
        />
      </svg>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center font-semibold tabular-nums',
          size >= 44 ? 'text-[11px]' : 'text-[10px]',
          tone === 'warning' && 'text-warning',
        )}
      >
        {done}/{total}
      </span>
    </div>
  );
}
