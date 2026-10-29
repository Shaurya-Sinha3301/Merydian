import { useEffect } from 'react';
import { useTrips, useTripSummary } from './useTrips';
import { useTripStore } from '../stores/trip.store';
import { useAuthStore } from '../stores/auth.store';

/**
 * The trip the person is working on. Travellers with a single trip are
 * auto-selected; agents choose a trip from their dashboard.
 */
export function useCurrentTrip() {
  const tripId = useTripStore((s) => s.currentTripId);
  const setCurrentTripId = useTripStore((s) => s.setCurrentTripId);
  const isAgent = useAuthStore((s) => s.user?.role === 'agent');
  const { data: trips } = useTrips(50, 0);
  const summary = useTripSummary(tripId || '');

  const firstTripId = trips?.items?.[0]?.trip_id;
  useEffect(() => {
    if (!tripId && !isAgent && firstTripId) setCurrentTripId(firstTripId);
  }, [tripId, isAgent, firstTripId, setCurrentTripId]);

  const trip = summary.data;
  const version = trip?.current_version ?? undefined;
  return {
    tripId: tripId || '',
    trip,
    name: trip?.trip_name || 'Your trip',
    familyId: trip?.family_id ?? undefined,
    currentVersion: version,
    previousVersion: version && version > 1 ? version - 1 : undefined,
    isLoading: summary.isLoading,
  };
}
