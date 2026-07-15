import { Navigate, Outlet } from 'react-router';

import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/sidebar-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/hooks';

/**
 * WhiteFleet-parity shell: fixed sidebar + fixed header; only the main content
 * pane scrolls (overflow scoped here, never on the page body).
 */
export function AppShell() {
  const session = useSession();

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
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          {/* <DemoBanner /> */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1440px] p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
