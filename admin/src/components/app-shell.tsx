import { Navigate, Outlet } from 'react-router';

import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { SidebarProvider } from '@/components/sidebar-context';
import { SvgDefs } from '@/components/svg-defs';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/hooks';

/**
 * WhiteFleet-parity shell: fixed sidebar + fixed header; only the main content
 * pane scrolls (overflow scoped here, never on the page body).
 *
 * Below `lg` the sidebar is gone and a bottom tab bar takes its place. Both
 * the bar and <main> are flex children of the same column, so the tab bar can
 * never overlap content and the on-screen keyboard shrinks the whole column
 * (via `h-dvh`) rather than hiding the bar behind itself.
 */
export function AppShell() {
  const session = useSession();

  if (session.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <SvgDefs />
      {/* h-dvh, not h-screen: on iOS Safari `100vh` is the *large* viewport,
          so an h-screen shell hides its own last ~60px behind the URL bar and
          then refuses to scroll because overflow is hidden here. */}
      <div className="px-safe flex h-dvh overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          {/* <DemoBanner /> */}
          <main className="flex-1 overflow-y-auto overscroll-y-contain">
            <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-5 lg:p-6">
              <Outlet />
            </div>
          </main>
          <MobileNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
