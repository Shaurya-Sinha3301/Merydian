import apiClient from './client';
import type { FeedbackRequest, FeedbackResponse } from '../types/dto/feedback';

export interface AgentFeedbackResponse {
  job_id: string;
  status: string;
  message: string;
}

export const feedbackService = {
  submitFeedback: async (data: FeedbackRequest): Promise<FeedbackResponse> => {
    const response = await apiClient.post<FeedbackResponse>('/itinerary/feedback', data);
    return response.data;
  },

  submitAgentFeedback: async (message: string): Promise<AgentFeedbackResponse> => {
    const response = await apiClient.post<AgentFeedbackResponse>('/itinerary/feedback/agent', { message });
    return response.data;
  }
};
