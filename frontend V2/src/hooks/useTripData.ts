import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timelineService } from '../services/timeline';
import { diffService } from '../services/diff';
import { explainabilityService } from '../services/explainability';
import { feedbackService } from '../services/feedback';
import { jobsService } from '../services/jobs';
import { queryKeys } from '../constants/queryKeys';
import { useTripSummary } from './useTrips';
import { toPlan } from '../lib/plan';

export function useTripPlan(tripId: string) {
  const query = useQuery({
    queryKey: [queryKeys.timeline, tripId],
    queryFn: () => timelineService.getTripTimeline(tripId),
    enabled: !!tripId,
  });
  return { ...query, days: toPlan(query.data) };
}

/** Everything the "what changed" screen needs: versions, the diff and the reasons. */
export function useTripChanges(tripId: string) {
  const summary = useTripSummary(tripId);
  const trip = summary.data;
  const current = trip?.current_version ?? undefined;
  const previous = current && current > 1 ? current - 1 : undefined;
  const familyId = trip?.family_id ?? undefined;

  const diff = useQuery({
    queryKey: [queryKeys.diff, tripId, familyId, previous, current],
    queryFn: () => diffService.getDiff(familyId, previous as number, current as number),
    enabled: !!previous && !!current,
  });

  const reasons = useQuery({
    queryKey: [queryKeys.explainability, tripId, familyId],
    queryFn: () => explainabilityService.getTripExplanations(tripId, familyId),
    enabled: !!tripId && !!trip,
  });

  return {
    trip,
    previous,
    current,
    diff: diff.data,
    reasons: reasons.data ?? [],
    isLoading: summary.isLoading || diff.isLoading || reasons.isLoading,
    error: summary.error || diff.error,
  };
}

/** Send feedback to the agent pipeline. One call: it parses the message, re-plans and explains. */
export function useSendFeedback(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => feedbackService.submitAgentFeedback(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.tripSummary, tripId] });
    },
  });
}

/** Poll one job until it finishes; refreshes the trip's data when it does. */
export function useJobProgress(jobId?: string, tripId?: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [queryKeys.jobs, jobId],
    queryFn: async () => {
      const job = await jobsService.getJob(jobId as string);
      if (job.status === 'COMPLETED' && tripId) {
        for (const key of [queryKeys.tripSummary, queryKeys.timeline, queryKeys.diff, queryKeys.explainability, queryKeys.trips]) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
      return job;
    },
    enabled: !!jobId,
    refetchInterval: (q) => (q.state.data && ['COMPLETED', 'FAILED'].includes(q.state.data.status) ? false : 1500),
  });
}
