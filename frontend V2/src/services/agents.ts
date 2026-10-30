import apiClient from './client';
import type {
  AgentJobListDTO,
  ApproveResponseDTO,
  ItineraryOptionsDTO,
} from '../types/dto/agent';

export const agentsService = {
  listJobs: async (limit = 50, offset = 0): Promise<AgentJobListDTO> => {
    const response = await apiClient.get<AgentJobListDTO>('/agent/jobs', { params: { limit, offset } });
    return response.data;
  },

  getOptions: async (eventId: string): Promise<ItineraryOptionsDTO> => {
    const response = await apiClient.get<ItineraryOptionsDTO>('/agent/itinerary/options', {
      params: { event_id: eventId },
    });
    return response.data;
  },

  approveOption: async (optionId: string): Promise<ApproveResponseDTO> => {
    const response = await apiClient.post<ApproveResponseDTO>('/agent/itinerary/approve', {
      option_id: optionId,
    });
    return response.data;
  },
};
