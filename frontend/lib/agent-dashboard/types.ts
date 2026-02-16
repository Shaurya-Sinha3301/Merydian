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
