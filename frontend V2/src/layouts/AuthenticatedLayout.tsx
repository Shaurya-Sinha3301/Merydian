import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useTripStore } from '../stores/trip.store';
import { ROUTES } from '../constants/routes';
import { AppShell } from '../components/layout/AppShell';
import { useTheme } from '../providers/ThemeProvider';
import { useWebSockets } from '../hooks/useWebSockets';

type Page =
  | 'login'
  | 'customer-dashboard'
  | 'agent-dashboard'
  | 'trip-overview'
  | 'timeline'
  | 'feedback'
  | 'optimization-progress'
  | 'diff-viewer'
  | 'explainability'
  | 'settings';

export const AuthenticatedLayout = () => {
  const { token, user } = useAuthStore();
  const currentTripId = useTripStore((s) => s.currentTripId);
  const lastJobId = useTripStore((s) => s.lastJobId);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  useWebSockets();


  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  let currentPage: Page = user?.role === 'agent' ? 'agent-dashboard' : 'customer-dashboard';
  if (location.pathname.includes('/timeline')) currentPage = 'timeline';
  else if (location.pathname.includes('/feedback')) currentPage = 'feedback';
  else if (location.pathname.includes('/settings')) currentPage = 'settings';
  else if (location.pathname.includes('/optimization')) currentPage = 'optimization-progress';
  else if (location.pathname.includes('/diff')) currentPage = 'diff-viewer';
  else if (location.pathname.includes('/explainability')) currentPage = 'explainability';
  else if (location.pathname.includes('/trip')) currentPage = 'trip-overview';

  const handleNavigate = (page: Page) => {
    switch (page) {
      case 'settings':
        navigate(ROUTES.SETTINGS);
        break;
      case 'timeline':
        navigate(ROUTES.TIMELINE);
        break;
      case 'feedback':
        navigate(ROUTES.FEEDBACK);
        break;
      case 'optimization-progress':
        navigate(lastJobId ? `/optimization?job_id=${lastJobId}` : '/optimization');
        break;
      case 'diff-viewer':
        navigate('/diff-viewer');
        break;
      case 'explainability':
        navigate('/explainability');
        break;
      case 'trip-overview':
        navigate(currentTripId ? `/trip-overview/${currentTripId}` : ROUTES.DASHBOARD);
        break;
      case 'customer-dashboard':
      case 'agent-dashboard':
      default:
        navigate(ROUTES.DASHBOARD);
        break;
    }
  };

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={handleNavigate}
      darkMode={theme === 'dark'}
      onToggleDark={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      role={user?.role === 'agent' ? 'agent' : 'customer'}
    >
      <Outlet />
    </AppShell>
  );
};
