import { useQuery } from '@tanstack/react-query';
import { tripsService } from '../services/trips';
import { queryKeys } from '../constants/queryKeys';
import { useAuthStore } from '../stores/auth.store';

export function useTrips(limit: number = 10, skip: number = 0) {
  const role = useAuthStore((s) => s.user?.role);
  const isAgent = role === 'agent';
  return useQuery({
    queryKey: [queryKeys.trips, { limit, skip, isAgent }],
    queryFn: () => (isAgent ? tripsService.getTrips(limit, skip) : tripsService.getMyTrips(limit, skip)),
  });
}

export function useTripSummary(tripId: string) {
  return useQuery({
    queryKey: [queryKeys.tripSummary, tripId],
    queryFn: () => tripsService.getTripSummary(tripId),
    enabled: !!tripId,
  });
}
