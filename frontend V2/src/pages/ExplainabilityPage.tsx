import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { useCurrentTrip } from '../hooks/useCurrentTrip';
import { ExplainabilityPanel } from '../features/explainability/ExplainabilityPanel';

interface ExplainabilityPageProps {
  onNavigate: (page: string) => void;
}

export function ExplainabilityPage({ onNavigate }: ExplainabilityPageProps) {
  const { tripId, name } = useCurrentTrip();
  return (
    <>
      <div className="mb-6">
        <Breadcrumbs
          crumbs={[
            { label: 'Dashboard', onClick: () => onNavigate('customer-dashboard') },
            { label: name, onClick: () => onNavigate(tripId ? `/trip-overview/${tripId}` : 'customer-dashboard') },
            { label: 'Change Review', onClick: () => onNavigate('diff-viewer') },
            { label: 'AI Explanation' },
          ]}
        />
      </div>
      <ExplainabilityPanel onNavigate={onNavigate} />
    </>
  );
}
