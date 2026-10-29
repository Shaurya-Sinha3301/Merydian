import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersService, type NewCustomer, type TripRequestBody, type AgentTripBody } from '../services/customers';
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
