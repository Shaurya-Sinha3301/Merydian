import apiClient from './client';
import type { ExplanationDTO } from '../types/dto/explainability';

interface ExplanationsEnvelope {
  explanations?: ExplanationDTO[];
}

export const explainabilityService = {
  getExplanations: async (itineraryId: string, familyId?: string): Promise<ExplanationDTO[]> => {
    const response = await apiClient.get<ExplanationDTO[] | ExplanationsEnvelope>(`/itinerary/explanations/${itineraryId}`, {
      params: familyId ? { family_id: familyId } : undefined
    });
    const data = response.data;
    return Array.isArray(data) ? data : (data.explanations ?? []);
  },

  getTripExplanations: async (tripId: string, familyId?: string): Promise<ExplanationDTO[]> => {
    const response = await apiClient.get<ExplanationsEnvelope>(`/itinerary/explanations/trip/${tripId}`, {
      params: familyId ? { family_id: familyId } : undefined
    });
    return response.data.explanations ?? [];
  }
};
