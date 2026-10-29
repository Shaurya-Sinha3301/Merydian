import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { useCurrentTrip } from '../hooks/useCurrentTrip';
import { OptimizationProgress } from '../features/optimization/OptimizationProgress';

interface OptimizationProgressPageProps {
  onNavigate: (page: string) => void;
}

export function OptimizationProgressPage({ onNavigate }: OptimizationProgressPageProps) {
  const { tripId, name } = useCurrentTrip();
  return (
    <>
      <div className="mb-6">
        <Breadcrumbs
          crumbs={[
            { label: 'Dashboard', onClick: () => onNavigate('customer-dashboard') },
            { label: name, onClick: () => onNavigate(tripId ? `/trip-overview/${tripId}` : 'customer-dashboard') },
            { label: 'Optimization Progress' },
          ]}
        />
      </div>
      <OptimizationProgress onNavigate={onNavigate} />
    </>
  );
}
