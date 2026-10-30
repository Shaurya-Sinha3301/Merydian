import { client } from './client';
import { JobDTO } from '../types/dto';

export const jobsService = {
  getJobStatus: (jobId: string) => client.get<JobDTO>(`/jobs/${encodeURIComponent(jobId)}`),
};
