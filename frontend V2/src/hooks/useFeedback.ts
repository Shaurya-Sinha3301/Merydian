import { useMutation } from '@tanstack/react-query';
import { feedbackService } from '../services/feedback';
import type { FeedbackRequest } from '../types/dto/feedback';
import { useTripStore } from '../stores/trip.store';

export function useSubmitFeedback() {
  const setLastJobId = useTripStore((s) => s.setLastJobId);
  return useMutation({
    mutationFn: async (data: FeedbackRequest) => {
      const eventResult = await feedbackService.submitFeedback(data);
      try {
        const agentResult = await feedbackService.submitAgentFeedback(data.comment);
        if (agentResult.job_id) {
          setLastJobId(agentResult.job_id);
        }
        return { ...eventResult, job_id: agentResult.job_id };
      } catch {
        return eventResult;
      }
    },
  });
}
