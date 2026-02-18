export interface Booking {
    id: string;
    type: 'Flight' | 'Hotel' | 'Train' | 'Cab';
    status: 'Confirmed' | 'Pending' | 'Cancelled';
    details: {
        provider: string; // e.g., "Air India", "Taj Hotel"
        reservationNumber: string;
        date: string;
        time?: string;
        description: string; // e.g., "Flight from DEL to CDG", "2x Deluxe Rooms"
        cost: number;
        currency: string;
        location?: string;
    };
    documents?: string[]; // URLs to tickets/vouchers
}

export interface Traveler {
    id: string;
    name: string;
    age: number;
    type: 'Adult' | 'Child' | 'Senior';
    familyId?: string; // Optional, to group by family within a large group
}

export interface FamilyMember {
    id: string;
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    passport_number?: string;
    role: 'Head' | 'Member' | 'Child';
}

export interface Family {
    id: string;
    family_name: string;
    members: FamilyMember[];
}

export interface SearchResult {
    id: string;
    type: 'Flight' | 'Hotel' | 'Train' | 'Bus' | 'Metro' | 'Cab';
    provider: string; // "Air India", "Marriott"
    logo?: string;
    title: string; // "New Delhi (DEL) → Mumbai (BOM)"
    subtitle: string; // "10:00 AM - 12:10 PM • 2h 10m"
    description?: string; // Full description for details page
    details: {
        startTime?: string;
        endTime?: string;
        duration?: string;
        location?: string; // For hotels
        rating?: number;
    };
    price: {
        amount: number;
        currency: string;
    };
    tags: string[]; // "Non-stop", "Refundable"
    images?: string[]; // For hotels/listings
    facilities?: string[]; // "Wifi", "Pool", "Gym"

    // Agent-specific data
    agentMetrics?: {
        commission: number;
        markup: number;
        b2bPrice: number;
    };
}

export interface SearchCriteria {
    type: 'Flight' | 'Hotel' | 'Train' | 'Bus' | 'Metro' | 'Cab';
    origin?: string;
    destination?: string;
    date: string;
    returnDate?: string;
    travelers: number;
    class?: string;
}

export interface TripRequest {
    id: string;
    customerName: string;
    destination: string;
    startDate: string;
    endDate: string;
    groupSize: {
        adults: number;
        children: number;
        seniors: number;
    };
    members?: Traveler[]; // List of specific travelers
    families?: Family[]; // List of families in the group
    budgetRange: {
        min: number;
        max: number;
    };
    status: 'new' | 'in-review' | 'approved' | 'booked';
    priority: 'high' | 'medium' | 'low';
    constraints: Array<{
        type: 'mobility' | 'time' | 'budget' | 'preference';
        severity: 'high' | 'medium' | 'low';
        description: string;
    }>;
    confidenceScore: number;
    submittedAt: string;
    bookings?: Booking[]; // New field for bookings
}
