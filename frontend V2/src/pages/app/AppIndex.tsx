import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useTrips } from '../../hooks/useTrips';
import { ROUTES, tripPath } from '../../constants/routes';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { ButtonLink } from '../../ui/Button';

/** Agents land on the desk; a traveller lands on their trip. */
export function AppIndex() {
  const isAgent = useAuthStore((s) => s.user?.role === 'agent');
  const { data, isLoading, error } = useTrips(10, 0);

  if (isAgent) return <Navigate to={ROUTES.DESK} replace />;
  if (isLoading) return <Loading label="Finding your trip" />;
  if (error) return <ErrorNote>Your trips could not be loaded. The server may still be waking up.</ErrorNote>;

  const first = data?.items[0];
  if (first) return <Navigate to={tripPath(first.trip_id)} replace />;
  return (
    <Empty
      title="Your account is ready"
      action={<ButtonLink to={ROUTES.DEMO}>Explore a demo trip</ButtonLink>}
    >
      A travel agent sets up your trip and it appears here, with every change explained. Until then you can look around a
      demo trip.
    </Empty>
  );
}
