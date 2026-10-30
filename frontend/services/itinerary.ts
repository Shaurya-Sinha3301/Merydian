import { client } from './client';
import { TimelineDTO, DiffDTO } from '../types/dto';

export const itineraryService = {
  getCurrentItinerary: () => client.get<TimelineDTO>('/itinerary/current'),
  
  getTripItinerary: (tripId: string) => client.get<TimelineDTO>(`/trips/${encodeURIComponent(tripId)}/itinerary`),
  
  getItineraryDiff: (versionA: number, versionB: number) => 
    client.get<DiffDTO>(`/itinerary/diff?version_a=${versionA}&version_b=${versionB}`),
    
  getAgentItineraryOptions: (eventId: string) => 
    client.get<{ options: unknown[] }>(`/agent/itinerary/options?event_id=${encodeURIComponent(eventId)}`),
    
  approveOption: (optionId: string) => client.post<unknown>('/agent/itinerary/approve', { option_id: optionId }),
};
