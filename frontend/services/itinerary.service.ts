/**
 * Itinerary Service
 * 
 * High-level service for itinerary operations including agent feedback processing.
 */

import { apiClient, AgentFeedbackResponse, Itinerary } from './api';

export type { AgentFeedbackResponse };

export class ItineraryService {
    /**
     * Submit natural language feedback through AI agent pipeline
     * 
     * Examples:
     * - "I want to visit Red Fort"
     * - "Remove Lodhi Gardens from our itinerary"
     * - "We loved Akshardham Temple!"
     * 
     * @param message - Natural language feedback
     * @returns Agent response with explanations and cost analysis
     */
    async submitFeedback(message: string, tripId: string = 'default_trip'): Promise<AgentFeedbackResponse> {
        if (!message || !message.trim()) {
            throw new Error('Feedback message cannot be empty');
        }

        try {
            return await apiClient.processAgentFeedback(message.trim(), tripId);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            throw error;
        }
    }

    /**
     * Get current optimized itinerary
     */
    async getCurrentItinerary(): Promise<Itinerary> {
        try {
            return await apiClient.getCurrentItinerary();
        } catch (error) {
            console.error('Failed to fetch itinerary:', error);
            throw error;
        }
    }

    /**
     * Rate a specific POI in the itinerary
     */
    async ratePOI(nodeId: string, rating: number, comment: string) {
        return apiClient.submitFeedback({
            rating,
            comment,
            node_id: nodeId,
        });
    }

    /**
     * Request addition of a specific POI
     */
    async requestPOIAddition(poiName: string, urgency: 'soft' | 'medium' | 'high' = 'medium') {
        return apiClient.requestPOI({
            poi_name: poiName,
            urgency,
        });
    }
}

// Export singleton instance
export const itineraryService = new ItineraryService();
