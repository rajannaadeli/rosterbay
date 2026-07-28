import { Desktop, Moon, Sun, type Icon } from '@phosphor-icons/react';

import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const OPTIONS: { value: 'light' | 'dark' | 'system'; label: string; icon: Icon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Desktop },
];

/**
 * Light · Dark · System, as a segmented control in the sidebar's user block.
 *
 * The thumb is a single absolutely-positioned element that slides between
 * thirds, so the swap is one transform rather than three cross-fading
 * backgrounds — cheaper, and it can't leave two segments lit mid-transition.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const index = Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === theme),
  );

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        'relative flex h-7 items-center rounded-sm border border-border-subtle bg-surface-2 p-0.5',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-[6px] bg-surface-1 shadow-[var(--elevation-2)] transition-transform duration-[var(--duration-standard)] ease-[var(--ease-out)]"
        style={{
          width: `calc((100% - 0.25rem) / ${OPTIONS.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {OPTIONS.map(({ value, label, icon: OptionIcon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'relative z-10 flex h-6 flex-1 items-center justify-center rounded-[6px] transition-colors duration-[var(--duration-micro)]',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active ? 'text-foreground' : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            <OptionIcon size={13} weight={active ? 'fill' : 'regular'} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
