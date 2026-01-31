import type { Metadata } from 'next';


import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import { Sidebar } from '@/components/ui/Sidebar';
import AgentDashboardInteractive from './components/AgentDashboardInteractive';

export const metadata: Metadata = {
  title: 'Agent Dashboard - TripCraft',
  description: 'Manage incoming trip requests, review customer preferences, and monitor operational metrics with comprehensive workflow tools for travel agents.',
};

export default function AgentDashboardPage() {
  return (
    <div className="flex bg-background h-[calc(100vh-4rem)] overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <NavigationBreadcrumbs />
        <AgentDashboardInteractive />
      </main>
    </div>
  );
}