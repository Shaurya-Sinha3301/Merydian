import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentsService } from '../services/agents';
import { queryKeys } from '../constants/queryKeys';

export function useAgentJobs(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: [queryKeys.agentJobs, { limit, offset }],
    queryFn: () => agentsService.listJobs(limit, offset),
    refetchInterval: 15000,
  });
}

export function useAgentOptions(eventId?: string) {
  return useQuery({
    queryKey: [queryKeys.agentOptions, eventId],
    queryFn: () => agentsService.getOptions(eventId as string),
    enabled: !!eventId,
  });
}

export function useApproveOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) => agentsService.approveOption(optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.agentOptions] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.agentJobs] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.trips] });
    },
  });
}
