import { useQuery } from '@tanstack/react-query';
import { jobsService } from '../services/jobs';
import { queryKeys } from '../constants/queryKeys';
import { useTripStore } from '../stores/trip.store';

export function useJob(jobId: string, refetchInterval?: number) {
  const stored = useTripStore((s) => s.lastJobId);
  const resolved = jobId && jobId !== 'mock-job-id' ? jobId : (stored || '');
  return useQuery({
    queryKey: [queryKeys.jobs, resolved],
    queryFn: () => jobsService.getJob(resolved),
    enabled: !!resolved,
    refetchInterval: resolved ? refetchInterval : false,
  });
}
