import { createBrowserRouter } from 'react-router-dom';
import { GuestLayout } from '../layouts/GuestLayout';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { ROUTES } from '../constants/routes';
import { HealthCheck } from '../pages/HealthCheck';
import { LandingPage } from '../pages/LandingPage';
import { DemoLauncherPage } from '../pages/DemoLauncherPage';
import { LoginPage } from '../pages/LoginPage';
import { ApiPlayground } from '../pages/ApiPlayground';
import { TripOverviewPage } from '../pages/TripOverviewPage';
import { TimelinePage } from '../pages/TimelinePage';
import { OptimizationProgressPage } from '../pages/OptimizationProgressPage';
import { DiffViewerPage } from '../pages/DiffViewerPage';
import { ExplainabilityPage } from '../pages/ExplainabilityPage';
import { FeedbackPage } from '../pages/FeedbackPage';
import { SettingsPage } from '../pages/SettingsPage';
import { DashboardRouter, RoutedPage } from './elements';

export const router = createBrowserRouter([
  {
    path: '/dev/health',
    element: <HealthCheck />,
  },
  {
    path: '/dev/api',
    element: <ApiPlayground />,
  },
  {
    element: <GuestLayout />,
    children: [
      { path: ROUTES.LANDING, element: <LandingPage /> },
      { path: ROUTES.DEMO, element: <DemoLauncherPage /> },
      { path: ROUTES.LOGIN, element: <LoginPage /> },
    ],
  },
  {
    element: <AuthenticatedLayout />,
    children: [
      { path: ROUTES.DASHBOARD, element: <DashboardRouter /> },
      { path: '/trip-overview/:tripId', element: <TripOverviewPage /> },
      { path: '/timeline', element: <RoutedPage Page={TimelinePage} /> },
      { path: '/optimization', element: <RoutedPage Page={OptimizationProgressPage} /> },
      { path: '/diff-viewer', element: <RoutedPage Page={DiffViewerPage} /> },
      { path: '/explainability', element: <RoutedPage Page={ExplainabilityPage} /> },
      { path: '/feedback', element: <RoutedPage Page={FeedbackPage} /> },
      { path: ROUTES.SETTINGS, element: <RoutedPage Page={SettingsPage} /> },
    ],
  },
  {
    path: ROUTES.NOT_FOUND,
    element: <div className="p-8">404 Not Found</div>,
  },
]);
