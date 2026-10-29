import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useTripStore } from '../stores/trip.store';
import { ROUTES } from '../constants/routes';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';

const agentNav = [
  { to: ROUTES.DESK, label: 'Desk' },
  { to: ROUTES.TRIPS, label: 'Trips' },
  { to: ROUTES.ACTIVITY, label: 'Activity' },
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

  const leave = () => {
    logout();
    setCurrentTripId(null);
    setLastJobId(null);
    navigate(ROUTES.LANDING);
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <header className="border-b border-rule bg-ground">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
          <Logo to={ROUTES.APP} />
          {isAgent && (
            <nav aria-label="Agent" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
              {agentNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `h-9 shrink-0 rounded-xl px-4 text-sm font-extrabold leading-9 ${isActive ? 'bg-ink text-paper' : 'hover:bg-paper'}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Tag>{isAgent ? 'Travel agent' : 'Traveller'}</Tag>
            <span className="hidden text-sm font-bold sm:inline">{user?.full_name}</span>
            <Button variant="quiet" onClick={leave}>
              Leave demo
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
