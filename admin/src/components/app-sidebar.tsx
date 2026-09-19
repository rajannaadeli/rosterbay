import {
  CalendarCheck,
  CalendarCheckIcon,
  ClockCountdown,
  MapPinArea,
  SignOut,
  SquaresFour,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react';
import { NavLink, useNavigate } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession, useSignOut } from '@/features/auth/hooks';
import { useCompany } from '@/features/company/hooks';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';

interface NavEntry {
  label: string;
  href: string;
  icon: Icon;
}

const NAV_ITEMS: NavEntry[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: SquaresFour },
  { label: 'Roster', href: '/app/roster', icon: CalendarCheck },
  { label: 'Workers', href: '/app/workers', icon: UsersThree },
  { label: 'Timesheets', href: '/app/timesheets', icon: ClockCountdown },
  { label: 'Job Sites', href: '/app/sites', icon: MapPinArea },
];

// Active nav is one of the three places the accent glow is allowed (with
// primary actions and live indicators) — and only in dark, where it reads.
const expandedItemClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex items-center gap-2.5 rounded-sm px-3 py-2 text-body transition-colors duration-[var(--duration-micro)]',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    'before:absolute before:top-1/2 before:left-0 before:h-5 before:w-[2px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:transition-opacity before:duration-[var(--duration-micro)]',
    // accent-muted, not surface-2: in light the sidebar already sits on
    // surface-1 (#FFF) and surface-2 is a 2% step, so a surface fill left the
    // active route effectively unmarked. The accent tint reads in both themes.
    isActive
      ? 'bg-accent-muted font-medium text-foreground before:opacity-100 dark:before:shadow-[var(--accent-glow)] [&_svg]:text-primary'
      : 'text-text-secondary before:opacity-0 hover:bg-surface-2 hover:text-foreground dark:hover:bg-surface-2/60',
  );

const railItemClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex size-9 shrink-0 items-center justify-center rounded-sm transition-colors duration-[var(--duration-micro)]',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    'before:absolute before:top-1/2 before:-left-2 before:h-5 before:w-[2px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:transition-opacity before:duration-[var(--duration-micro)]',
    isActive
      ? 'bg-accent-muted text-primary before:opacity-100 dark:before:shadow-[var(--accent-glow)]'
      : 'text-text-secondary before:opacity-0 hover:bg-surface-2 hover:text-foreground dark:hover:bg-surface-2/60',
  );

export function AppSidebar() {
  const { collapsed, setCollapsed } = useSidebar();
  const company = useCompany();
  const session = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();

  const email = session.data?.user.email ?? '';

  const handleSignOut = () => {
    signOut.mutate(undefined, { onSuccess: () => void navigate('/') });
  };

  return (
    <TooltipProvider delay={200}>
      <nav
        aria-label="Main"
        className={cn(
          // Hidden below `lg`: a 240px rail (or even the 65px one) on a 320px
          // screen leaves no usable content column. MobileNav carries these
          // same five destinations there, and the sign-out / theme controls
          // that live at the foot of this rail move into the header's account
          // menu. h-full rather than h-screen so the shell's h-dvh governs.
          'relative hidden h-full shrink-0 border-r border-border-subtle bg-surface-1 transition-[width] duration-[400ms] ease-[var(--ease-out)] lg:block',
          collapsed ? 'w-[65px]' : 'w-60',
        )}
      >
        {/* ── Collapsed rail ── */}
        <div
          className={cn(
            'absolute inset-0 flex w-[65px] flex-col items-center gap-0.5 py-2.5 transition-opacity duration-[400ms] ease-in-out',
            collapsed ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0',
          )}
        >
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={() => setCollapsed(false)}
            className="flex size-7.5 mb-1.5 shrink-0 items-center justify-center rounded-sm text-primary transition-colors duration-[var(--duration-micro)] hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CalendarCheckIcon size={24} weight="fill" aria-hidden />
          </button>

          <div className="my-1 h-px w-full shrink-0 bg-border-subtle" />

          <div className="flex w-full flex-1 flex-col items-center gap-1 py-2 overflow-y-auto">
            {NAV_ITEMS.map(({ label, href, icon: ItemIcon }) => (
              <Tooltip key={href}>
                <TooltipTrigger
                  render={<NavLink to={href} className={railItemClasses} aria-label={label} />}
                >
                  <ItemIcon size={22} weight="duotone" aria-hidden />
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="flex w-full shrink-0 flex-col items-center gap-1.5 border-t border-border-subtle px-2 py-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Exit demo"
                    onClick={handleSignOut}
                    className="flex size-9 shrink-0 items-center justify-center rounded-sm text-text-secondary transition-colors duration-[var(--duration-micro)] hover:bg-danger-muted hover:text-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  />
                }
              >
                <SignOut size={18} weight="duotone" aria-hidden />
              </TooltipTrigger>
              <TooltipContent side="right">Exit demo</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Expanded view ── */}
        <div
          className={cn(
            'absolute inset-0 flex w-60 flex-col transition-opacity duration-[400ms] ease-in-out',
            collapsed ? 'pointer-events-none z-0 opacity-0' : 'z-10 opacity-100',
          )}
        >
          <div className="flex h-[57px] shrink-0 items-center gap-2.5 border-b border-border-subtle px-4">
            <button
              type="button"
              aria-label="Expand sidebar"
              onClick={() => setCollapsed(false)}
              className="flex size-8 shrink-0 items-center justify-center rounded-sm text-primary transition-colors duration-[var(--duration-micro)] hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <CalendarCheckIcon size={24} weight="fill" aria-hidden />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-h3 leading-none">RosterBay</span>
              <span className="truncate text-micro leading-none tracking-normal text-text-tertiary">
                {company.data?.name ?? 'Torrens Facility Services'}
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-3">
            {NAV_ITEMS.map(({ label, href, icon: ItemIcon }) => (
              <NavLink key={href} to={href} className={expandedItemClasses}>
                <ItemIcon size={22} weight="duotone" className="shrink-0" aria-hidden />
                <span className="truncate pt-[4px]">{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="flex shrink-0 flex-col border-t border-border-subtle">
            <div className="flex items-center gap-2.5 px-3 pt-3 pb-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-micro font-semibold tracking-normal text-primary">
                {(email[0] ?? 'M').toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-small font-medium leading-none">Marcus Webb</span>
                <div className="flex items-center gap-1.5">
                  <span className="num truncate text-micro leading-none tracking-normal text-text-tertiary">
                    {email}
                  </span>
                  <Badge variant="secondary" className="h-4 shrink-0 px-1 text-micro tracking-normal leading-none">
                    Admin
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 px-3 pb-3">
              <ThemeToggle />
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-small text-text-secondary transition-colors duration-[var(--duration-micro)] hover:bg-danger-muted hover:text-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <SignOut size={15} weight="duotone" className="shrink-0" aria-hidden />
                <span>Exit demo</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
