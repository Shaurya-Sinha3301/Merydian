import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useTripStore } from '../stores/trip.store';
import { ROUTES } from '../constants/routes';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { NotificationBell } from './NotificationBell';

const agentNav = [
  { to: ROUTES.OVERVIEW, label: 'Overview' },
  { to: ROUTES.DESK, label: 'Desk' },
  { to: ROUTES.AGENTS, label: 'Agents' },
  { to: ROUTES.CALENDAR, label: 'Calendar' },
  { to: ROUTES.INSIGHTS, label: 'Insights' },
  { to: ROUTES.TRIPS, label: 'Trips' },
  { to: ROUTES.CUSTOMERS, label: 'Customers' },
  { to: ROUTES.BOOKINGS, label: 'Bookings' },
];

const travellerNav = [
  { to: ROUTES.TRIPS, label: 'My trips' },
  { to: ROUTES.NEW_TRIP, label: 'Plan a trip' },
];

export function AppShell() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setCurrentTripId = useTripStore((s) => s.setCurrentTripId);
  const setLastJobId = useTripStore((s) => s.setLastJobId);
  const navigate = useNavigate();

  if (!token) return <Navigate to={ROUTES.LANDING} replace />;

  const isAgent = user?.role === 'agent';
  const isDemo = (user?.email ?? '').endsWith('@demo.merydian.com');

  const leave = () => {
    logout();
    setCurrentTripId(null);
    setLastJobId(null);
    navigate(ROUTES.LANDING);
  };

  return (
    <div className="min-h-dvh bg-ground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <header className="no-print border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
          <Logo to={ROUTES.APP} />
          {(
            <nav aria-label={isAgent ? 'Agent' : 'Traveller'} className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
              {(isAgent ? agentNav : travellerNav).map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `h-9 shrink-0 px-2 text-sm font-semibold leading-9 ${isActive ? 'border-b-2 border-magenta' : 'text-ink-2 hover:text-ink'}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            {isAgent && (
              <NavLink to={ROUTES.WEBHOOKS} className="hidden text-sm font-semibold text-ink-2 hover:text-ink sm:inline">
                Webhooks
              </NavLink>
            )}
            {!isAgent && <Tag>Traveller</Tag>}
            <span className="hidden text-sm font-bold xl:inline">{user?.full_name}</span>
            <Button variant="quiet" onClick={leave}>
              {isDemo ? 'Leave demo' : 'Sign out'}
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
