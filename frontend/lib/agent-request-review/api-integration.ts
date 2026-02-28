/**
 * API Integration for Agent Request Review
 * 
 * Handles fetching and transforming event data from backend
 */

import { apiClient } from '@/services/api';

export interface BackendEvent {
  event_id: string;
  family_id: string;
  event_type: string;
  message: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface TransformedEvent {
  id: string;
  familyId: string;
  type: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Fetch events for a specific family
 */
export const fetchFamilyEvents = async (
  familyId: string,
  limit: number = 50
): Promise<TransformedEvent[]> => {
  try {
    const events = await apiClient.getFamilyEvents(familyId, limit);
    
    return events.map((event: BackendEvent) => ({
      id: event.event_id,
      familyId: event.family_id,
      type: event.event_type,
      message: event.message,
      timestamp: event.created_at,
      metadata: event.metadata,
    }));
  } catch (error) {
    console.error('Error fetching family events:', error);
    throw error;
  }
};

/**
 * Fetch all events (for agent dashboard)
 */
export const fetchAllEvents = async (
  limit: number = 100
): Promise<TransformedEvent[]> => {
  try {
    // Note: This would need a backend endpoint that returns all events
    // For now, we'll use the family events endpoint with a placeholder
    const events = await apiClient.getFamilyEvents('all', limit);
    
    return events.map((event: BackendEvent) => ({
      id: event.event_id,
      familyId: event.family_id,
      type: event.event_type,
      message: event.message,
      timestamp: event.created_at,
      metadata: event.metadata,
    }));
  } catch (error) {
    console.error('Error fetching all events:', error);
    throw error;
  }
};

/**
 * Group events by family
 */
export const groupEventsByFamily = (
  events: TransformedEvent[]
): Record<string, TransformedEvent[]> => {
  return events.reduce((acc, event) => {
    if (!acc[event.familyId]) {
      acc[event.familyId] = [];
    }
    acc[event.familyId].push(event);
    return acc;
  }, {} as Record<string, TransformedEvent[]>);
};

/**
 * Filter events by type
 */
export const filterEventsByType = (
  events: TransformedEvent[],
  eventType: string
): TransformedEvent[] => {
  return events.filter(event => event.type === eventType);
};
