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

const expandedItemClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
    // Teal accent bar on the active route.
    'before:absolute before:top-1/2 before:left-0 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:transition-opacity',
    isActive
      ? 'bg-primary/10 font-medium text-primary before:opacity-100'
      : 'text-muted-foreground before:opacity-0 hover:bg-sidebar-accent/50 hover:text-foreground',
  );

const railItemClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
    'before:absolute before:top-1/2 before:-left-2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:transition-opacity',
    isActive
      ? 'bg-primary/10 text-primary before:opacity-100'
      : 'text-muted-foreground before:opacity-0 hover:bg-sidebar-accent/50 hover:text-foreground',
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
          'relative h-screen shrink-0 border-r bg-sidebar transition-[width] duration-[400ms] ease-in-out',
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
            className="flex size-7.5 mb-0.5 shrink-0 items-center justify-center rounded-lg"
          >
            <CalendarCheckIcon size={24} weight="fill" className="text-green-800" aria-hidden />
          </button>

          <div className="my-1 h-px w-full shrink-0 bg-border" />

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

          <div className="flex w-full shrink-0 flex-col items-center gap-1 border-t px-2 py-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Exit demo"
                    onClick={handleSignOut}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
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
          <div className="flex h-[49px] shrink-0 items-center gap-2.5 border-b px-[18px]">
            <button
              type="button"
              aria-label="Expand sidebar"
              onClick={() => setCollapsed(false)}
              className="flex size-7.5 mt-[1px] shrink-0 items-center justify-center rounded-lg"
            >
              <CalendarCheckIcon size={24} weight="fill" className="text-green-800" aria-hidden />
            </button>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold leading-tight">RosterBay</span>
              <span className="truncate text-[11px] leading-tight text-muted-foreground">
                {company.data?.name ?? 'Torrens Facility Services'}
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-3 px-[10px]">
            {NAV_ITEMS.map(({ label, href, icon: ItemIcon }) => (
              <NavLink key={href} to={href} className={expandedItemClasses}>
                <ItemIcon size={22} weight="duotone" className="shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="flex shrink-0 flex-col border-t">
            <div className="flex items-center gap-3 px-2.5 pt-3 pb-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {(email[0] ?? 'M').toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-xs font-medium leading-none">Marcus Webb</span>
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs leading-none text-muted-foreground">
                    {email}
                  </span>
                  <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[9px] uppercase tracking-wider">
                    Admin
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 px-2 pb-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <SignOut size={16} weight="duotone" className="shrink-0" aria-hidden />
                <span>Exit demo</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
