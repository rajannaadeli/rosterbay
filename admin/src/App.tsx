import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';

import { AppShell } from '@/components/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { EntryPage } from '@/pages/entry-page';
import { SiteDetailPage } from '@/pages/site-detail-page';
import { SitesPage } from '@/pages/sites-page';
import { WorkerDetailPage } from '@/pages/worker-detail-page';
import { WorkersPage } from '@/pages/workers-page';

// Heavy routes (leaflet, dnd-kit) load on demand.
const DashboardPage = lazy(() =>
  import('@/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const RosterPage = lazy(() =>
  import('@/pages/roster-page').then((m) => ({ default: m.RosterPage })),
);
const TimesheetsPage = lazy(() =>
  import('@/pages/timesheets-page').then((m) => ({ default: m.TimesheetsPage })),
);
const WorkerFramePage = lazy(() =>
  import('@/pages/worker-frame-page').then((m) => ({ default: m.WorkerFramePage })),
);

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const router = createBrowserRouter([
  { path: '/', element: <EntryPage /> },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <LazyRoute><DashboardPage /></LazyRoute> },
      { path: 'roster', element: <LazyRoute><RosterPage /></LazyRoute> },
      { path: 'timesheets', element: <LazyRoute><TimesheetsPage /></LazyRoute> },
      { path: 'workers', element: <WorkersPage /> },
      { path: 'workers/:workerId', element: <WorkerDetailPage /> },
      { path: 'sites', element: <SitesPage /> },
      { path: 'sites/new', element: <SiteDetailPage /> },
      { path: 'sites/:siteId', element: <SiteDetailPage /> },
    ],
  },
  { path: '/worker', element: <LazyRoute><WorkerFramePage /></LazyRoute> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
