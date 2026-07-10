import {
  CalendarCheck,
  ClockCountdown,
  MapPinArea,
  SignOut,
  SquaresFour,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router';

import { DemoBanner } from '@/components/demo-banner';
import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession, useSignOut } from '@/features/auth/hooks';
import { useCompany } from '@/features/company/hooks';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { to: string; label: string; icon: Icon }[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: SquaresFour },
  { to: '/app/roster', label: 'Roster', icon: CalendarCheck },
  { to: '/app/workers', label: 'Workers', icon: UsersThree },
  { to: '/app/timesheets', label: 'Timesheets', icon: ClockCountdown },
  { to: '/app/sites', label: 'Job Sites', icon: MapPinArea },
];

export function AppShell() {
  const session = useSession();
  const company = useCompany();
  const signOut = useSignOut();
  const navigate = useNavigate();

  if (session.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex h-14 items-center border-b px-4">
          <Wordmark className="text-[15px]" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Main">
          {NAV_ITEMS.map(({ to, label, icon: NavIcon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <NavIcon size={18} weight="duotone" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 text-muted-foreground"
            onClick={() => {
              signOut.mutate(undefined, { onSuccess: () => void navigate('/') });
            }}
          >
            <SignOut size={18} weight="duotone" aria-hidden />
            Exit demo
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <header className="flex h-14 items-center justify-between border-b bg-card px-6">
          <span className="text-sm font-semibold">
            {company.data?.name ?? 'Torrens Facility Services'}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatACST(new Date(), 'EEEE, d MMMM yyyy')}
          </span>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
