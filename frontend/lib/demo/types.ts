
export enum TripStatus {
    ON_SCHEDULE = 'On Schedule',
    DELAYED = 'Delayed',
    AT_RISK = 'At Risk',
    ISSUE_REPORTED = 'Issue Reported',
    RE_OPTIMIZING = 'Re-optimizing',
    AWAITING_APPROVAL = 'Awaiting Approval'
}

export interface FamilyMember {
    name: string;
    age: number;
    aadhaarNumber: string; // Masked in UI except last 4
    role: 'adult' | 'child' | 'senior';
}

export interface TransportDetails {
    mode: 'flight' | 'train' | 'bus' | 'van' | 'car' | 'metro' | 'auto';
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
    flightNumber?: string;
    trainNumber?: string;
    departureTime: string;
    arrivalTime: string;
    status: 'confirmed' | 'on_time' | 'delayed' | 'cancelled';
    delayMinutes?: number;
    notes?: string;
}

export interface ItinerarySegment {
    id: string;
    time: string;
    activity: string;
    location: string;
    type: 'Flight' | 'Hotel' | 'Bus' | 'POI' | 'Meal' | 'Transport';
    status: 'Completed' | 'Current' | 'Planned' | 'Delayed' | 'Cancelled';
    transport?: TransportDetails;
}

export interface DayItinerary {
    dayNumber: number;
    date: string;
    segments: ItinerarySegment[];
}

export interface Family {
    id: string;
    name: string;
    size: number;
    members: FamilyMember[];
    tourId: string;
    tourName: string;
    currentCity: string;
    localTime: string;
    nextSegment: string;
    status: TripStatus;
    sentiment: 'Very Satisfied' | 'Neutral' | 'Unsatisfied';
    tags: string[];
    constraints: {
        hard: string[];
        soft: string[];
    };
    itinerary?: DayItinerary[];
}

export interface KPI {
    label: string;
    value: string | number;
    delta: string;
    isPositive: boolean;
}

export interface Issue {
    id: string;
    severity: 'Critical' | 'Moderate';
    description: string;
    familyId: string;
    familyName: string;
    timestamp: string;
}
