import { useQuery } from '@tanstack/react-query';
import { itineraryService } from '@/services/itinerary';

export function useTimeline(tripId: string | null) {
  return useQuery({
    queryKey: ['timeline', tripId],
    queryFn: () => tripId ? itineraryService.getTripItinerary(tripId) : itineraryService.getCurrentItinerary(),
    enabled: true, // If no tripId, it fetches current itinerary
  });
}
