import apiClient from './client';
import type { TimelineDTO } from '../types/dto/timeline';

export const timelineService = {
  getCurrentTimeline: async (familyId?: string): Promise<TimelineDTO> => {
    const response = await apiClient.get<TimelineDTO | Record<string, unknown>>('/itinerary/current', {
      params: familyId ? { family_id: familyId } : undefined
    });
    return response.data as TimelineDTO;
  },

  getTripTimeline: async (tripId: string): Promise<TimelineDTO> => {
    const response = await apiClient.get<TimelineDTO>(`/itinerary/${tripId}/timeline`);
    return response.data;
  }
};
