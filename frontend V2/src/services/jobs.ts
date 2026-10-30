import apiClient from './client';
import type { JobDTO } from '../types/dto/jobs';

export const jobsService = {
  getJob: async (jobId: string): Promise<JobDTO> => {
    const response = await apiClient.get<JobDTO>(`/jobs/${jobId}`);
    return response.data;
  },
  getAgentJobs: async (limit: number = 50, offset: number = 0) => {
    const response = await apiClient.get(`/agent/jobs?limit=${limit}&offset=${offset}`);
    return response.data;
  }
};
