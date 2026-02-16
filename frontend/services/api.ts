/**
 * API Client Service
 * 
 * Handles all HTTP requests to the backend API with authentication support.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface AgentFeedbackResponse {
    success: boolean;
    event_type: string;
    action_taken: string;
    explanations: string[];
    itinerary_updated: boolean;
    iteration: number;
    cost_analysis?: {
        total_cost_change: number;
        changes: Array<{
            poi_name: string;
            day: number;
            cost_delta: number;
            reason: string;
        }>;
    };
}

export interface Itinerary {
    id: string;
    days: Array<{
        day: number;
        pois: Array<{
            id: string;
            name: string;
            arrival_time: string;
            departure_time: string;
        }>;
    }>;
}

export class APIClient {
    private token: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('token');
        }
    }

    setToken(token: string) {
        this.token = token;
    }

    clearToken() {
        this.token = null;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
            ...options.headers,
        };

        const url = `${API_BASE_URL}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    detail: `HTTP ${response.status}: ${response.statusText}`
                }));
                throw new Error(error.detail || `Request failed with status ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Process natural language feedback through agent pipeline
     * @param message - Natural language feedback
     * @param tripId - Trip identifier (defaults to user's active trip if not provided)
     */
    async processAgentFeedback(message: string, tripId: string = 'default_trip'): Promise<AgentFeedbackResponse> {
        return this.request<AgentFeedbackResponse>('/itinerary/feedback/agent', {
            method: 'POST',
            body: JSON.stringify({ message, trip_id: tripId }),
        });
    }

    /**
     * Get current itinerary for authenticated user
     */
    async getCurrentItinerary(): Promise<Itinerary> {
        return this.request<Itinerary>('/itinerary/current');
    }

    /**
     * Submit POI feedback
     */
    async submitFeedback(data: {
        rating: number;
        comment: string;
        node_id: string;
    }) {
        return this.request('/itinerary/feedback', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Request POI addition
     */
    async requestPOI(data: {
        poi_name: string;
        urgency: 'soft' | 'medium' | 'high';
    }) {
        return this.request('/itinerary/poi-request', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Signup a new user
     */
    async signup(data: any): Promise<{ access_token: string; token_type: string }> {
        return this.request<{ access_token: string; token_type: string }>('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Initialize a new trip
     */
    async initializeTrip(data: any): Promise<any> {
        return this.request('/trips/initialize', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

// Export singleton instance
export const apiClient = new APIClient();
