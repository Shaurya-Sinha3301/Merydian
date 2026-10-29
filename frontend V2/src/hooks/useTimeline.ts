import { useQuery } from '@tanstack/react-query';
import { timelineService } from '../services/timeline';
import { queryKeys } from '../constants/queryKeys';
import { useTripStore } from '../stores/trip.store';

export function useTimeline(tripId?: string) {
  const storedTripId = useTripStore((s) => s.currentTripId);
  const resolved = tripId || storedTripId || '';
  return useQuery({
    queryKey: [queryKeys.timeline, resolved],
    queryFn: () => timelineService.getTripTimeline(resolved),
    enabled: !!resolved,
  });
}
