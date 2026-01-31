import type { Metadata } from 'next';
import AgentNavigation from '@/components/common/AgentNavigation';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import AgentDashboardInteractive from './components/AgentDashboardInteractive';

export const metadata: Metadata = {
  title: 'Agent Dashboard - TripCraft',
  description: 'Manage incoming trip requests, review customer preferences, and monitor operational metrics with comprehensive workflow tools for travel agents.',
};

export default function AgentDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <AgentNavigation />
      <NavigationBreadcrumbs />
      <AgentDashboardInteractive />
    </div>
  );
}