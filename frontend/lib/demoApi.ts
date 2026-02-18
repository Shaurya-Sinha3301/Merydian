/**
 * Demo API Client
 * Handles communication with the demo feedback endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ItineraryItem {
    time: string;
    title: string;
    type: string;
    icon: string;
    is_new?: boolean;
}

export interface DayActivity {
    day: string;
    date: string;
    items: ItineraryItem[];
}

export interface ItineraryData {
    destination: string;
    start_date: string;
    end_date: string;
    days: DayActivity[];
    stats: {
        activities: number;
        hotels: number;
        restaurants: number;
        attractions: number;
        total_cost: number;
    };
}

export interface DemoFeedbackResponse {
    success: boolean;
    action: string;
    message: string;
    updated_itinerary: ItineraryData;
    added_items: string[];
}

/**
 * Submit demo feedback to update the itinerary
 */
export async function submitDemoFeedback(message: string): Promise<DemoFeedbackResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/demo/feedback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
    });

    if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get the current demo itinerary
 */
export async function getDemoItinerary(): Promise<ItineraryData> {
    const response = await fetch(`${API_BASE_URL}/api/v1/demo/itinerary`);

    if (!response.ok) {
        throw new Error(`Failed to fetch itinerary: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Reset the demo itinerary to initial state
 */
export async function resetDemoItinerary(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/demo/reset`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`Failed to reset itinerary: ${response.statusText}`);
    }

    return response.json();
}
