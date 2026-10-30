import { useQuery } from '@tanstack/react-query';
import { tripsService } from '@/services/trips';
import { useAppStore } from '@/lib/store';

export function useCustomerTrips(params?: { limit?: number; skip?: number; status?: string }) {
  return useQuery({
    queryKey: ['customer-trips', params],
    queryFn: () => tripsService.getCustomerTrips(params),
  });
}

export function useActiveTrip() {
  const { activeTripId } = useAppStore();
  
  return useQuery({
    queryKey: ['trip-summary', activeTripId],
    queryFn: () => tripsService.getTripSummary(activeTripId!),
    enabled: !!activeTripId,
  });
}
