import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useTrips } from '../../hooks/useTrips';
import { ROUTES, tripPath } from '../../constants/routes';
import { ErrorNote, Loading } from '../../ui/Surface';

/** Agents land on the overview; a traveller lands on their trip, or on planning one when they have none. */
export function AppIndex() {
  const isAgent = useAuthStore((s) => s.user?.role === 'agent');
  const { data, isLoading, error } = useTrips(10, 0);

  if (isAgent) return <Navigate to={ROUTES.OVERVIEW} replace />;
  if (isLoading) return <Loading label="Finding your trip" />;
  if (error) return <ErrorNote>Your trips could not be loaded. The server may still be waking up.</ErrorNote>;

  const first = data?.items[0];
  if (data && data.items.length === 1 && first) return <Navigate to={tripPath(first.trip_id)} replace />;
  if (data && data.items.length > 1) return <Navigate to={ROUTES.TRIPS} replace />;
  return <Navigate to={ROUTES.NEW_TRIP} replace />;
}
