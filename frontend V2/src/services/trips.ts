import apiClient from './client';
import type { PaginatedResponse, TripDetailResponse } from '../types/dto/trip';

export const tripsService = {
  getTrips: async (limit: number = 10, skip: number = 0): Promise<PaginatedResponse<TripDetailResponse>> => {
    const response = await apiClient.get<PaginatedResponse<TripDetailResponse>>('/trips/', {
      params: { limit, skip }
    });
    return response.data;
  },

  getMyTrips: async (limit: number = 10, skip: number = 0): Promise<PaginatedResponse<TripDetailResponse>> => {
    const response = await apiClient.get<PaginatedResponse<TripDetailResponse>>('/trips/me', {
      params: { limit, skip }
    });
    return response.data;
  },

  getTripSummary: async (tripId: string): Promise<TripDetailResponse> => {
    const response = await apiClient.get<TripDetailResponse>(`/trips/${tripId}/summary`);
    return response.data;
  }
};
