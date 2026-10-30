import { useQuery } from '@tanstack/react-query';
import { jobsService } from '@/services/jobs';

export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsService.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Keep polling every 2 seconds if the job isn't complete/failed
      const status = query.state.data?.status;
      if (status === 'COMPLETED' || status === 'FAILED') return false;
      return 2000;
    },
  });
}
