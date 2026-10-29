import { useQuery } from '@tanstack/react-query';
import { explainabilityService } from '../services/explainability';
import { queryKeys } from '../constants/queryKeys';
import { useTripStore } from '../stores/trip.store';

export function useExplainability(itineraryId: string, familyId?: string) {
  const tripId = useTripStore((s) => s.currentTripId);
  const useTrip = !itineraryId || itineraryId.startsWith('mock-');
  return useQuery({
    queryKey: [queryKeys.explainability, itineraryId, familyId, tripId],
    queryFn: () =>
      useTrip && tripId
        ? explainabilityService.getTripExplanations(tripId, familyId)
        : explainabilityService.getExplanations(itineraryId, familyId),
    enabled: !!(itineraryId || tripId),
  });
}
