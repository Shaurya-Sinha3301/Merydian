import { useQuery } from '@tanstack/react-query';
import { itineraryService } from '@/services/itinerary';
import { explanationsService } from '@/services/explanations';

export function useDiff(versionA: number | null, versionB: number | null) {
  return useQuery({
    queryKey: ['diff', versionA, versionB],
    queryFn: () => itineraryService.getItineraryDiff(versionA!, versionB!),
    enabled: versionA !== null && versionB !== null,
  });
}

export function useExplanations(tripId: string | null) {
  return useQuery({
    queryKey: ['explanations', tripId],
    queryFn: () => explanationsService.getTripExplanations(tripId!),
    enabled: !!tripId,
  });
}
