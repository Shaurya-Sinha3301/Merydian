import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { useCurrentTrip } from '../hooks/useCurrentTrip';
import { DiffViewer } from '../features/diff/DiffViewer';

interface DiffViewerPageProps {
  onNavigate: (page: string) => void;
}

export function DiffViewerPage({ onNavigate }: DiffViewerPageProps) {
  const { tripId, name } = useCurrentTrip();
  return (
    <>
      <div className="mb-6">
        <Breadcrumbs
          crumbs={[
            { label: 'Dashboard', onClick: () => onNavigate('customer-dashboard') },
            { label: name, onClick: () => onNavigate(tripId ? `/trip-overview/${tripId}` : 'customer-dashboard') },
            { label: 'Change Review' },
          ]}
        />
      </div>
      <DiffViewer onNavigate={onNavigate} />
    </>
  );
}
