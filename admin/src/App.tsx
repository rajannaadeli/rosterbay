import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';

import { AppShell } from '@/components/app-shell';
import { ComingSoon } from '@/components/coming-soon';
import { EntryPage } from '@/pages/entry-page';
import { RosterPage } from '@/pages/roster-page';
import { SiteDetailPage } from '@/pages/site-detail-page';
import { SitesPage } from '@/pages/sites-page';
import { WorkerDetailPage } from '@/pages/worker-detail-page';
import { WorkersPage } from '@/pages/workers-page';

const router = createBrowserRouter([
  { path: '/', element: <EntryPage /> },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <ComingSoon title="Dashboard" /> },
      { path: 'roster', element: <RosterPage /> },
      { path: 'timesheets', element: <ComingSoon title="Timesheets" /> },
      { path: 'workers', element: <WorkersPage /> },
      { path: 'workers/:workerId', element: <WorkerDetailPage /> },
      { path: 'sites', element: <SitesPage /> },
      { path: 'sites/new', element: <SiteDetailPage /> },
      { path: 'sites/:siteId', element: <SiteDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
