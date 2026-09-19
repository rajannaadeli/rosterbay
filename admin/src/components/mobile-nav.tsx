import {
  CalendarCheck,
  ClockCountdown,
  MapPinArea,
  SquaresFour,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react';
import { NavLink } from 'react-router';

import { cn } from '@/lib/utils';

interface NavEntry {
  label: string;
  /** Short form for the 320px case, where five labels can't all fit. */
  shortLabel?: string;
  href: string;
  icon: Icon;
}

// Same five modules as the sidebar, same order. Kept as its own list rather
// than imported from AppSidebar because the two diverge deliberately: the rail
// carries sign-out and the theme toggle, the tab bar carries only navigation.
const NAV_ITEMS: NavEntry[] = [
  { label: 'Dashboard', shortLabel: 'Home', href: '/app/dashboard', icon: SquaresFour },
  { label: 'Roster', href: '/app/roster', icon: CalendarCheck },
  { label: 'Workers', href: '/app/workers', icon: UsersThree },
  { label: 'Timesheets', shortLabel: 'Times', href: '/app/timesheets', icon: ClockCountdown },
  { label: 'Job Sites', shortLabel: 'Sites', href: '/app/sites', icon: MapPinArea },
];

/**
 * The ops manager's navigation below `lg`.
 *
 * A bottom tab bar rather than a hamburger drawer: all five destinations are
 * peers, the manager switches between them constantly while triaging, and a
 * drawer would put every one of those switches two taps away at the top of the
 * screen. It is a flex sibling of <main> rather than `fixed`, so it can never
 * sit on top of content and the on-screen keyboard pushes it off with the
 * viewport instead of covering it.
 */
export function MobileNav() {
  return (
    <nav
      aria-label="Main"
      style={{ '--safe-pad': '0.25rem' } as React.CSSProperties}
      className="pb-safe z-30 flex shrink-0 items-stretch border-t border-border-subtle bg-surface-1 lg:hidden"
    >
      {NAV_ITEMS.map(({ label, shortLabel, href, icon: ItemIcon }) => (
        <NavLink
          key={href}
          to={href}
          className={({ isActive }) =>
            cn(
              'relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pt-1.5 pb-1',
              'transition-colors duration-[var(--duration-micro)]',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none',
              // Active nav is one of the three places the accent glow is
              // allowed, and the 2px marker moves to the top edge here because
              // the tab sits at the bottom of the screen.
              isActive
                ? 'text-primary before:absolute before:inset-x-3 before:top-0 before:h-[2px] before:rounded-b-full before:bg-primary dark:before:shadow-[var(--accent-glow)]'
                : 'text-text-tertiary',
            )
          }
        >
          {({ isActive }) => (
            <>
              <ItemIcon size={21} weight={isActive ? 'fill' : 'duotone'} aria-hidden />
              {/* Five labels across a 320px screen leaves 64px each, which
                  "Dashboard" and "Timesheets" overrun even at 10px. Below the
                  `xs` line they shorten rather than truncate — a clipped word
                  reads as a bug, an abbreviation reads as a choice. */}
              <span className="text-nano leading-none font-medium tracking-normal">
                <span className="xs:hidden">{shortLabel ?? label}</span>
                <span className="hidden xs:inline">{label}</span>
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
