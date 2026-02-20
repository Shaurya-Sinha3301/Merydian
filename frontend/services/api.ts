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

export interface LoginResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
}

export class APIClient {
    private token: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('access_token');
        }
    }

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', token);
        }
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
        }
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
                credentials: 'include', // Include cookies for refresh token
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
     * Login with email and password
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        // OAuth2 password flow requires form data
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            credentials: 'include', // Include cookies for refresh token
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({
                detail: 'Login failed'
            }));
            throw new Error(error.detail || 'Login failed');
        }

        return response.json();
    }

    /**
     * Signup a new user
     */
    async signup(data: {
        email: string;
        password: string;
        full_name: string;
        role: string;
    }): Promise<LoginResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            credentials: 'include', // Include cookies for refresh token
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({
                detail: 'Signup failed'
            }));
            throw new Error(error.detail || 'Signup failed');
        }

        return response.json();
    }

    /**
     * Refresh access token using refresh token cookie
     */
    async refreshToken(): Promise<LoginResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include', // Send refresh token cookie
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        return response.json();
    }

    /**
     * Logout current session
     */
    async logout(): Promise<void> {
        await this.request('/auth/logout', {
            method: 'POST',
        });
        this.clearToken();
    }

    /**
     * Logout from all sessions
     */
    async logoutAll(): Promise<void> {
        await this.request('/auth/logout-all', {
            method: 'POST',
        });
        this.clearToken();
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
