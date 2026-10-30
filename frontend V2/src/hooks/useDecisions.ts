import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decisionsService } from '../services/decisions';
import { agentsService } from '../services/agents';
import { queryKeys } from '../constants/queryKeys';

export function useDecisions(enabled = true) {
  return useQuery({
    queryKey: ['decisions'],
    queryFn: () => decisionsService.list(),
    enabled,
    refetchInterval: 15000,
  });
}

function refresh(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['decisions'] });
  qc.invalidateQueries({ queryKey: [queryKeys.agentJobs] });
  qc.invalidateQueries({ queryKey: [queryKeys.trips] });
  qc.invalidateQueries({ queryKey: [queryKeys.timeline] });
  qc.invalidateQueries({ queryKey: ['analytics'] });
}

export function useAcceptOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) => agentsService.approveOption(optionId),
    onSuccess: () => refresh(qc),
  });
}

export function useDeclineRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason?: string }) => decisionsService.decline(eventId, reason),
    onSuccess: () => refresh(qc),
  });
}

export function useAnalytics() {
  return useQuery({ queryKey: ['analytics'], queryFn: decisionsService.analytics, refetchInterval: 30000 });
}

export function useRequestPlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ place, note }: { place: string; note?: string }) => decisionsService.requestPlace(place, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  });
}
