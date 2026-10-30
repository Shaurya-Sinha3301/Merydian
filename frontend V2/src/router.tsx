import { createBrowserRouter, Link } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Demo } from './pages/Demo';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Credits } from './pages/Credits';
import { AppShell } from './shell/AppShell';
import { AppIndex } from './pages/app/AppIndex';
import { TripLayout } from './pages/app/TripLayout';
import { PlanPage } from './pages/app/PlanPage';
import { ChangesPage } from './pages/app/ChangesPage';
import { FeedbackPage } from './pages/app/FeedbackPage';
import { OverviewPage } from './pages/app/OverviewPage';
import { CalendarPage } from './pages/app/CalendarPage';
import { CustomersPage } from './pages/app/CustomersPage';
import { NewTripPage } from './pages/app/NewTripPage';
import { CustomerDetailPage } from './pages/app/CustomerDetailPage';
import { HistoryPage } from './pages/app/HistoryPage';
import { InsightsPage } from './pages/app/InsightsPage';
import { AgentsPage } from './pages/app/AgentsPage';
import { WebhooksPage } from './pages/app/WebhooksPage';
import { BookingsPage, TripBookingsPage } from './pages/app/BookingsPage';
import { GroupPage } from './pages/app/GroupPage';
import { NotesPage } from './pages/app/NotesPage';
import { ForgotPassword, ResetPassword } from './pages/Recovery';
import { SettingsPage } from './pages/app/SettingsPage';
import { DeskPage } from './pages/app/DeskPage';
import { TripsPage } from './pages/app/TripsPage';
import { ActivityPage } from './pages/app/ActivityPage';
import { Logo } from './ui/Logo';
import { ButtonLink } from './ui/Button';

function NotFound() {
  return (
    <div className="min-h-dvh bg-ground">
      <header className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6">
        <Logo />
      </header>
      <main className="border-t-2 border-ink">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <h1 className="display text-[3rem] sm:text-[5rem]">
            This page has moved.
          </h1>
          <p className="mt-5 max-w-[44ch] text-lg text-ink-2">
            We could not find what you were looking for. <Link to="/" className="font-bold underline underline-offset-4">Go to the front door</Link>.
          </p>
          <div className="mt-8">
            <ButtonLink to="/demo" variant="cyan" size="lg">
              Explore the demo
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/demo', element: <Demo /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/credits', element: <Credits /> },
  { path: '/forgot', element: <ForgotPassword /> },
  { path: '/reset', element: <ResetPassword /> },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      { index: true, element: <AppIndex /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'desk', element: <DeskPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'webhooks', element: <WebhooksPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/:familyId', element: <CustomerDetailPage /> },
      { path: 'new-trip', element: <NewTripPage /> },
      { path: 'trips', element: <TripsPage /> },
      { path: 'activity', element: <ActivityPage /> },
      {
        path: 'trip/:tripId',
        element: <TripLayout />,
        children: [
          { index: true, element: <PlanPage /> },
          { path: 'changes', element: <ChangesPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'bookings', element: <TripBookingsPage /> },
          { path: 'group', element: <GroupPage /> },
          { path: 'notes', element: <NotesPage /> },
          { path: 'feedback', element: <FeedbackPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
