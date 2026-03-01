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
    auto_approved?: boolean;
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

export interface TravellerEmailEntry {
    email: string;
    full_name?: string;
    members?: number;
    children?: number;
}

export interface InitializeTripWithOptimizationRequest {
    trip_name: string;
    destination: string;
    start_date: string;
    end_date: string;
    family_ids?: string[];
    traveller_emails?: TravellerEmailEntry[];
    num_travellers?: number;
    auto_approve?: boolean;
    custom_baseline?: Record<string, any>;
}

export interface RegisteredFamilyInfo {
    family_code: string;
    user_id: string;
    family_id: string;
    email: string;
    status: 'existing' | 'created';
}

export interface TripWithOptimizationResponse {
    success: boolean;
    trip_id: string;
    trip_session_id: string;
    option_id: string;
    event_id: string;
    optimizer_ran: boolean;
    message: string;
    summary: {
        families_registered: number;
        total_members: number;
        total_children: number;
        trip_duration_days: number;
        baseline_itinerary: string;
        estimated_cost: number;
        predicted_satisfaction: number;
    };
    registered_families?: RegisteredFamilyInfo[];
    auto_approved?: boolean;
}

export interface ItineraryOption {
    option_id: string;
    summary: string;
    cost: number;
    satisfaction: number;
    status: string;
    details: Record<string, any>;
}

export interface FamilyPreferences {
    id: string;
    family_code: string;
    family_name: string;
    trip_name?: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
    preferences: Record<string, any>;
    members: any[];
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
                let errMsg = error.detail;
                if (Array.isArray(errMsg)) {
                    errMsg = errMsg.map((e: any) => `${e.loc?.join('.')} ${e.msg}`).join(', ');
                } else if (typeof errMsg === 'object' && errMsg !== null) {
                    errMsg = JSON.stringify(errMsg);
                }
                const err = new Error(errMsg || `Request failed with status ${response.status}`);
                (err as any).status = response.status;
                throw err;
            }

            return response.json();
        } catch (error: any) {
            // Next.js intercepts console.error and displays a full-screen dev overlay.
            // We suppress 401/403 logs here because AuthProvider handles them natively.
            if (error.status !== 401 && error.status !== 403) {
                console.error(`API request failed: ${endpoint}`, error);
            }
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
            const err = new Error('Token refresh failed');
            (err as any).status = response.status;
            throw err;
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
     * Get current user profile
     */
    async getUserProfile(): Promise<any> {
        return this.request<any>('/users/me');
    }

    /**
     * Get current itinerary for authenticated user
     */
    async getCurrentItinerary(): Promise<any> {
        return this.request<any>('/itinerary/current');
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
     * Initialize a new trip (manual family preferences)
     */
    async initializeTrip(data: any): Promise<any> {
        return this.request('/trips/initialize', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Initialize a trip with automatic ML optimization (auto-fetches family prefs from DB)
     */
    async initializeTripWithOptimization(
        data: InitializeTripWithOptimizationRequest
    ): Promise<TripWithOptimizationResponse> {
        return this.request<TripWithOptimizationResponse>('/trips/initialize-with-optimization', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Get itinerary options for an event (agent dashboard)
     */
    async getAgentItineraryOptions(eventId: string): Promise<{ options: ItineraryOption[] }> {
        return this.request<{ options: ItineraryOption[] }>(
            `/agent/itinerary/options?event_id=${encodeURIComponent(eventId)}`
        );
    }

    /**
     * Register a customer and auto-create their family profile (agent action)
     */
    async registerCustomerByAgent(data: {
        email: string;
        members: number;
        children: number;
        initial_location?: string;
    }): Promise<{ message: string; family_code: string; user_id: string; family_id: string }> {
        return this.request('/agent/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Get detailed summary of a trip
     */
    async getTripSummary(tripId: string): Promise<any> {
        return this.request<any>(`/trips/${encodeURIComponent(tripId)}/summary`);
    }

    /**
     * Get the full actual itinerary JSON data of a trip
     */
    async getTripItinerary(tripId: string): Promise<any> {
        return this.request<any>(`/trips/${encodeURIComponent(tripId)}/itinerary`);
    }

    /**
     * Approve an itinerary option (agent action)
     */
    async approveOption(optionId: string): Promise<{
        message: string;
        option_id: string;
        tools_agent_triggered: boolean;
        communication_agent_triggered: boolean;
    }> {
        return this.request('/agent/itinerary/approve', {
            method: 'POST',
            body: JSON.stringify({ option_id: optionId }),
        });
    }

    /**
     * Get current family details and preferences
     */
    async getFamilyPreferences(): Promise<FamilyPreferences> {
        return this.request<FamilyPreferences>('/families/me');
    }

    /**
     * Update family preferences (patch the family record)
     */
    async updateFamilyPreferences(data: Partial<Record<string, any>>): Promise<FamilyPreferences> {
        return this.request<FamilyPreferences>('/families/me', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * List all trips (agent view)
     */
    async getAgentTrips(params?: { limit?: number; skip?: number; status?: string }): Promise<any> {
        const query = new URLSearchParams();
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.skip) query.set('skip', String(params.skip));
        if (params?.status) query.set('trip_status', params.status);
        const qs = query.toString();
        return this.request(`/trips/${qs ? '?' + qs : ''}`);
    }

    /**
     * Get trips associated with the currently authenticated customer's family
     */
    async getCustomerTrips(params?: { limit?: number; skip?: number; status?: string }): Promise<any> {
        const query = new URLSearchParams();
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.skip) query.set('skip', String(params.skip));
        if (params?.status) query.set('trip_status', params.status);
        const qs = query.toString();
        return this.request(`/trips/me${qs ? '?' + qs : ''}`);
    }

    /**
     * Get a structured diff between two itinerary versions
     */
    async getItineraryDiff(versionA: number, versionB: number): Promise<any> {
        return this.request(`/itinerary/diff?version_a=${versionA}&version_b=${versionB}`);
    }

    /**
     * Submit a natural-language feedback message through the agent pipeline.
     * Used by SuggestChangeModal — replaces localStorage suggestion storage.
     */
    async submitFeedbackMessage(message: string): Promise<AgentFeedbackResponse> {
        return this.request<AgentFeedbackResponse>('/itinerary/feedback/agent', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    }

    /**
     * List events for a family (agent auth required).
     * Used by CustomerSuggestionsPanel to display customer feedback from DB.
     */
    async getFamilyEvents(familyId: string, limit = 50): Promise<any[]> {
        return this.request<any[]>(`/events/?family_id=${encodeURIComponent(familyId)}&limit=${limit}`);
    }
}

// Export singleton instance
export const apiClient = new APIClient();
