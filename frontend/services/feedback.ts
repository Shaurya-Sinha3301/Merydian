/* eslint-disable */
import { client } from './client';

export const feedbackService = {
  submitAgentFeedback: (message: string, tripId?: string) => 
    client.post<unknown>('/itinerary/feedback/agent', { message, trip_id: tripId || 'default_trip' }),
    
  submitPOIFeedback: (data: { rating: number; comment: string; node_id: string }) => 
    client.post<unknown>('/itinerary/feedback', data),
    
  requestPOI: (data: { poi_name: string; urgency: 'soft' | 'medium' | 'high' }) => 
    client.post<unknown>('/itinerary/poi-request', data),
    
  getFamilyEvents: (familyId: string, limit = 50) => 
    client.get<any[]>(`/events/?family_id=${encodeURIComponent(familyId)}&limit=${limit}`),
};
