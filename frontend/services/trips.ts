import { client } from './client';
import { TripSummaryDTO } from '../types/dto';

export const tripsService = {
  getAgentTrips: (params?: { limit?: number; skip?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.skip) query.set('skip', String(params.skip));
    if (params?.status) query.set('trip_status', params.status);
    const qs = query.toString();
    return client.get<TripSummaryDTO[]>(`/trips/${qs ? '?' + qs : ''}`);
  },

  getCustomerTrips: (params?: { limit?: number; skip?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.skip) query.set('skip', String(params.skip));
    if (params?.status) query.set('trip_status', params.status);
    const qs = query.toString();
    return client.get<TripSummaryDTO[]>(`/trips/me${qs ? '?' + qs : ''}`);
  },

  getTripSummary: (tripId: string) => client.get<TripSummaryDTO>(`/trips/${encodeURIComponent(tripId)}/summary`),
  
  initializeTrip: (data: unknown) => client.post<unknown>('/trips/initialize', data),
  
  initializeTripWithOptimization: (data: unknown) => client.post<unknown>('/trips/initialize-with-optimization', data),
};
