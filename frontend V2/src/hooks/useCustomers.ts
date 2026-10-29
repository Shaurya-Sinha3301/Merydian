import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerDetailService, customersService, type AgentTripBody, type NewCustomer, type PreferencesPatch, type TripRequestBody } from '../services/customers';
import { queryKeys } from '../constants/queryKeys';

export function useCustomers() {
  return useQuery({ queryKey: ['customers'], queryFn: customersService.list });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewCustomer) => customersService.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

function refreshTrips(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [queryKeys.trips] });
  qc.invalidateQueries({ queryKey: ['customers'] });
}

export function useRequestTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TripRequestBody) => customersService.requestTrip(body),
    onSuccess: () => refreshTrips(qc),
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgentTripBody) => customersService.createTrip(body),
    onSuccess: () => refreshTrips(qc),
  });
}

export function useCustomer(familyId?: string) {
  return useQuery({
    queryKey: ['customer', familyId],
    queryFn: () => customerDetailService.get(familyId as string),
    enabled: !!familyId,
  });
}

export function useSavePreferences(familyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PreferencesPatch) => customerDetailService.savePreferences(familyId, patch),
    onSuccess: (data) => {
      qc.setQueryData(['customer', familyId], data);
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useTripHistory(tripId: string) {
  return useQuery({
    queryKey: ['trip-history', tripId],
    queryFn: () => customerDetailService.tripHistory(tripId),
    enabled: !!tripId,
  });
}
