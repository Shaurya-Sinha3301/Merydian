import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { useCurrentTrip } from '../hooks/useCurrentTrip';
import { FeedbackPanel } from '../features/feedback/FeedbackPanel';

interface FeedbackPageProps {
  onNavigate: (page: string) => void;
}

export function FeedbackPage({ onNavigate }: FeedbackPageProps) {
  const { tripId, name } = useCurrentTrip();
  return (
    <>
      <div className="mb-6">
        <Breadcrumbs
          crumbs={[
            { label: 'Dashboard', onClick: () => onNavigate('customer-dashboard') },
            { label: name, onClick: () => onNavigate(tripId ? `/trip-overview/${tripId}` : 'customer-dashboard') },
            { label: 'Feedback' },
          ]}
        />
      </div>
      <FeedbackPanel onNavigate={onNavigate} />
    </>
  );
}
