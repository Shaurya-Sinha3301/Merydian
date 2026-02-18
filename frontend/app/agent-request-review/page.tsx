import type { Metadata } from 'next';

import AgentWorkflowTabs from '@/components/common/AgentWorkflowTabs';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import AgentRequestReviewInteractive from './components/AgentRequestReviewInteractive';

export const metadata: Metadata = {
  title: 'Request Review - TripCraft Agent Portal',
  description: 'Analyze trip requests and modify system-generated itineraries with full cost and margin visibility for customer travel planning.',
};

export default function AgentRequestReviewPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">

      <AgentWorkflowTabs requestId="TR-2026-0142" />
      <NavigationBreadcrumbs
        requestContext={{
          customerName: "Sarah Johnson",
          destination: "Paris, France",
          requestId: "TR-2026-0142"
        }}
      />
      <AgentRequestReviewInteractive />
    </div>
  );
}