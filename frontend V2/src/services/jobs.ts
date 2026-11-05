import apiClient from './client';
import type { JobDTO } from '../types/dto/jobs';

export const jobsService = {
  getJob: async (jobId: string): Promise<JobDTO> => {
    const response = await apiClient.get<JobDTO>(`/jobs/${jobId}`);
    return response.data;
  },
  /** Wait for a background job to finish and return its result; throws with the reason if it failed. */
  followJob: async <T>(jobId: string, intervalMs = 1500, timeoutMs = 180_000): Promise<T> => {
    const until = Date.now() + timeoutMs;
    for (;;) {
      const job = (await apiClient.get<JobDTO>(`/jobs/${jobId}`)).data;
      if (job.status === 'COMPLETED' && job.result) return job.result as T;
      if (job.status === 'FAILED' || job.status === 'CANCELLED') {
        throw new Error(job.description.replace(/^ValueError: /, '') || 'We could not build that plan.');
      }
      if (Date.now() > until) throw new Error('This is taking longer than expected. Check back in a minute.');
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  },
  getAgentJobs: async (limit: number = 50, offset: number = 0) => {
    const response = await apiClient.get(`/agent/jobs?limit=${limit}&offset=${offset}`);
    return response.data;
  }
};
