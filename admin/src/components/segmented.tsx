import { cn } from '@/lib/utils';

interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number> {
  /** Accessible name for the group, e.g. "Roster view". */
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * The one segmented control: view switches, zoom levels, theme.
 *
 * Same construction as `ThemeToggle` — a single sliding thumb rather than
 * per-segment backgrounds, so a switch is one transform and two segments can
 * never both look active mid-transition.
 */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'relative flex h-8 shrink-0 items-center rounded-sm border border-border-default bg-bg-base p-0.5 coarse:h-11',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-xs border border-border-subtle bg-surface-1 shadow-[var(--elevation-2)] transition-transform duration-[var(--duration-standard)] ease-[var(--ease-out)]"
        style={{
          width: `calc((100% - 0.25rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 flex h-7 flex-1 items-center justify-center px-2.5 text-small font-medium coarse:h-10',
              'rounded-xs transition-colors duration-[var(--duration-micro)]',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active ? 'text-foreground' : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
