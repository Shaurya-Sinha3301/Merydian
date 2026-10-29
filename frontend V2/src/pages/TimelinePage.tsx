import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { useCurrentTrip } from '../hooks/useCurrentTrip';
import { Timeline } from '../features/timeline/Timeline';

interface TimelinePageProps {
  onNavigate: (page: string) => void;
}

export function TimelinePage({ onNavigate }: TimelinePageProps) {
  const { tripId, name } = useCurrentTrip();
  return (
    <>
      <div className="mb-6">
        <Breadcrumbs
          crumbs={[
            { label: 'Dashboard', onClick: () => onNavigate('customer-dashboard') },
            { label: name, onClick: () => onNavigate(tripId ? `/trip-overview/${tripId}` : 'customer-dashboard') },
            { label: 'Timeline' },
          ]}
        />
      </div>
      <Timeline onNavigate={onNavigate} />
    </>
  );
}
