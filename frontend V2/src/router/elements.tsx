import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { AgentDashboardPage } from '../pages/AgentDashboardPage';
import { CustomerDashboardPage } from '../pages/CustomerDashboardPage';
import { useAuthStore } from '../stores/auth.store';

export function usePageNavigate() {
  const navigate = useNavigate();
  return (path: string) => {
    if (path.startsWith('/')) {
      navigate(path);
      return;
    }
    const map: Record<string, string> = {
      'customer-dashboard': ROUTES.DASHBOARD,
      'agent-dashboard': ROUTES.DASHBOARD,
      timeline: ROUTES.TIMELINE,
      feedback: ROUTES.FEEDBACK,
      settings: ROUTES.SETTINGS,
      'optimization-progress': '/optimization',
      'diff-viewer': '/diff-viewer',
      explainability: '/explainability',
    };
    navigate(map[path] || `/${path}`);
  };
}

export function RoutedPage({ Page }: { Page: (props: { onNavigate: (p: string) => void }) => ReactNode }) {
  const handleNavigate = usePageNavigate();
  return <Page onNavigate={handleNavigate} />;
}

export function DashboardRouter() {
  const { user } = useAuthStore();
  const handleNavigate = usePageNavigate();
  if (user?.role === 'agent') {
    return <AgentDashboardPage onNavigate={handleNavigate} />;
  }
  return <CustomerDashboardPage onNavigate={handleNavigate} />;
}
