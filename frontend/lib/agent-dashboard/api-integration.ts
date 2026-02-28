/**
 * API Integration Layer for Agent Dashboard
 * 
 * Transforms backend API responses to frontend TripRequest format
 * Based on CORRECTED_AGENT_ROUTES.md specification
 */

import { TripRequest, Family, Traveler } from './types';
import { apiClient } from '@/services/api';

/**
 * Backend Trip Response Interface
 */
export interface BackendTrip {
  trip_id: string;
  trip_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  families: string[]; // Family IDs
  trip_status: 'active' | 'pending_approval' | 'completed' | 'cancelled';
  iteration_count: number;
  feedback_count: number;
  created_at: string;
  updated_at: string;
  summary?: {
    estimated_cost: number;
    total_members: number;
    total_children: number;
    predicted_satisfaction: number;
  };
}

/**
 * Map backend trip status to frontend status
 */
export const mapTripStatus = (backendStatus: string): TripRequest['status'] => {
  const statusMap: Record<string, TripRequest['status']> = {
    'active': 'in-review',
    'pending_approval': 'new',
    'completed': 'approved',
    'cancelled': 'approved', // Treat cancelled as approved for display
    'booked': 'booked',
  };
  return statusMap[backendStatus] || 'new';
};

/**
 * Calculate priority based on trip start date
 */
export const calculatePriority = (trip: BackendTrip): TripRequest['priority'] => {
  const daysUntilStart = Math.floor(
    (new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysUntilStart < 7) return 'high';
  if (daysUntilStart < 14) return 'high';
  if (daysUntilStart < 30) return 'medium';
  return 'low';
};

/**
 * Transform backend trip to frontend TripRequest
 */
export const transformTrip = (backendTrip: BackendTrip): TripRequest => {
  const estimatedCost = backendTrip.summary?.estimated_cost || 10000;
  const totalMembers = backendTrip.summary?.total_members || 2;
  const totalChildren = backendTrip.summary?.total_children || 0;
  
  return {
    id: backendTrip.trip_id,
    customerName: backendTrip.families[0] || 'Unknown Customer',
    destination: backendTrip.destination,
    startDate: backendTrip.start_date,
    endDate: backendTrip.end_date,
    status: mapTripStatus(backendTrip.trip_status),
    priority: calculatePriority(backendTrip),
    budgetRange: {
      min: estimatedCost * 0.9,
      max: estimatedCost * 1.1,
    },
    groupSize: {
      adults: totalMembers - totalChildren,
      children: totalChildren,
      seniors: 0, // Not available from backend
    },
    submittedAt: backendTrip.created_at,
    preferences: {
      pace: 'moderate',
      interests: [],
      dietary: [],
    },
    constraints: [],
    confidenceScore: backendTrip.summary?.predicted_satisfaction 
      ? backendTrip.summary.predicted_satisfaction * 100 
      : 75,
  };
};

/**
 * Fetch active groups from backend
 */
export const fetchActiveGroups = async (): Promise<TripRequest[]> => {
  try {
    const response = await apiClient.getAgentTrips({
      status: 'active',
      limit: 50,
    });
    
    const items: BackendTrip[] = response?.items ?? [];
    return items.map(transformTrip);
  } catch (error) {
    console.error('Error fetching active groups:', error);
    throw error;
  }
};

/**
 * Fetch all trips from backend
 */
export const fetchAllTrips = async (params?: {
  limit?: number;
  skip?: number;
  status?: string;
}): Promise<{ items: TripRequest[]; total: number }> => {
  try {
    const response = await apiClient.getAgentTrips(params);
    
    const items: BackendTrip[] = response?.items ?? [];
    return {
      items: items.map(transformTrip),
      total: response?.total ?? items.length,
    };
  } catch (error) {
    console.error('Error fetching trips:', error);
    throw error;
  }
};

/**
 * Fetch trip details with enriched data
 */
export const fetchTripDetails = async (tripId: string): Promise<TripRequest> => {
  try {
    const summary = await apiClient.getTripSummary(tripId);
    
    // Transform summary to TripRequest format
    return {
      id: summary.trip_id || tripId,
      customerName: summary.families?.[0] || 'Unknown Customer',
      destination: summary.destination || 'Unknown',
      startDate: summary.start_date || new Date().toISOString(),
      endDate: summary.end_date || new Date().toISOString(),
      status: mapTripStatus(summary.trip_status || 'active'),
      priority: calculatePriority(summary as BackendTrip),
      budgetRange: {
        min: (summary.estimated_cost || 10000) * 0.9,
        max: (summary.estimated_cost || 10000) * 1.1,
      },
      groupSize: {
        adults: (summary.total_members || 2) - (summary.total_children || 0),
        children: summary.total_children || 0,
        seniors: 0,
      },
      submittedAt: summary.created_at || new Date().toISOString(),
      preferences: {
        pace: 'moderate',
        interests: [],
        dietary: [],
      },
      constraints: [],
      confidenceScore: summary.predicted_satisfaction 
        ? summary.predicted_satisfaction * 100 
        : 75,
    };
  } catch (error) {
    console.error('Error fetching trip details:', error);
    throw error;
  }
};

/**
 * Calculate statistics from trip list
 */
export const calculateStats = (groups: TripRequest[]) => {
  return {
    activeTrips: groups.filter(g => g.status === 'in-review' || g.status === 'booked').length,
    pendingApprovals: groups.filter(g => g.status === 'new').length,
    totalRevenue: groups.reduce((sum, g) => sum + g.budgetRange.max, 0),
    avgSatisfaction: groups.length > 0
      ? groups.reduce((sum, g) => sum + g.confidenceScore, 0) / groups.length / 100
      : 0.85,
  };
};
