import { TripRequest } from './types';
import activeGroupsData from './data/active_groups.json';
import upcomingGroupsData from './data/upcoming_groups.json';
import hotelsData from './data/hotels.json';
import flightsData from './data/flights.json';
import trainsData from './data/trains.json';
import cabsData from './data/cabs.json';

// Export the raw data for direct access
export { activeGroupsData, upcomingGroupsData, hotelsData, flightsData, trainsData, cabsData };

// Convert JSON groups to TripRequest format
const convertGroupToTripRequest = (group: any, isActive: boolean): TripRequest => {
    // Flatten all members from all families
    const allMembers = group.families ? 
        group.families.flatMap((family: any) => 
            family.members.map((m: any) => ({ ...m, familyId: family.id, familyName: family.family_name }))
        ) : 
        group.members || [];

    const adults = allMembers.filter((m: any) => m.role === 'Head' || (m.role === 'Member' && m.age >= 18)).length;
    const children = allMembers.filter((m: any) => m.role === 'Child' || m.age < 18).length;
    const seniors = allMembers.filter((m: any) => m.age >= 60).length;

    // Add sample bookings for active groups
    const bookings = isActive ? [
        {
            id: `BK-${group.id}-001`,
            type: 'Flight' as const,
            status: 'Confirmed' as const,
            details: {
                provider: 'IndiGo',
                reservationNumber: `6E${Math.floor(Math.random() * 10000)}`,
                date: group.start_date,
                time: '08:30 AM',
                description: `Flight to ${group.current_location}`,
                cost: 4500 * (adults + children),
                currency: 'INR',
                location: 'Indira Gandhi International Airport'
            }
        },
        {
            id: `BK-${group.id}-002`,
            type: 'Hotel' as const,
            status: 'Confirmed' as const,
            details: {
                provider: 'Ocean Breeze Resort',
                reservationNumber: `HT${Math.floor(Math.random() * 10000)}`,
                date: group.start_date,
                description: `${Math.ceil((adults + children) / 2)}x Deluxe Rooms`,
                cost: 5200 * Math.ceil((adults + children) / 2) * 
                      Math.ceil((new Date(group.end_date).getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24)),
                currency: 'INR',
                location: `${group.current_location}, India`
            }
        }
    ] : [];

    return {
        id: group.id,
        customerName: group.group_name,
        destination: group.current_location === 'Not Started' ? group.package_type : group.current_location,
        startDate: group.start_date,
        endDate: group.end_date,
        groupSize: { adults, children, seniors },
        members: allMembers.map((m: any) => ({
            id: m.id,
            name: m.name,
            age: m.age,
            type: m.role === 'Child' || m.age < 18 ? 'Child' : m.age >= 60 ? 'Senior' : 'Adult',
            familyId: m.familyId
        })),
        families: group.families,
        budgetRange: { min: 5000, max: 15000 }, // Default values
        status: group.status === 'Active' ? 'booked' : 'approved',
        priority: 'medium',
        constraints: [],
        confidenceScore: 85,
        submittedAt: new Date(group.start_date).toISOString(),
        bookings
    };
};

// Convert active groups
export const activeGroups: TripRequest[] = activeGroupsData.groups.map(g => convertGroupToTripRequest(g, true));

// Convert upcoming groups
export const upcomingGroups: TripRequest[] = upcomingGroupsData.groups.map(g => convertGroupToTripRequest(g, false));

// Combined groups for backward compatibility
export const allGroups: TripRequest[] = [...activeGroups, ...upcomingGroups];

export const mockRequests: TripRequest[] = [
    {
        id: 'GRP-2026-001',
        customerName: 'The Johnson Family Group',
        destination: 'Paris, France',
        startDate: '2026-03-15',
        endDate: '2026-03-22',
        groupSize: { adults: 2, children: 1, seniors: 0 },
        members: [
            { id: 'T1', name: 'James Johnson', age: 40, type: 'Adult' },
            { id: 'T2', name: 'Sarah Johnson', age: 38, type: 'Adult' },
            { id: 'T3', name: 'Timmy Johnson', age: 10, type: 'Child' }
        ],
        budgetRange: { min: 3500, max: 4500 },
        status: 'new',
        priority: 'high',
        constraints: [
            { type: 'mobility', severity: 'medium', description: 'Child-friendly activities required' },
            { type: 'preference', severity: 'low', description: 'Prefer morning museum visits' },
        ],
        confidenceScore: 85,
        submittedAt: '2026-01-18T09:30:00',
        bookings: [
            {
                id: 'BK-001',
                type: 'Flight',
                status: 'Confirmed',
                details: {
                    provider: 'Air France',
                    reservationNumber: 'AF12345',
                    date: '2026-03-15',
                    time: '10:00 AM',
                    description: 'JFK to CDG',
                    cost: 1200,
                    currency: 'USD',
                    location: 'JFK Airport, Terminal 4'
                }
            },
            {
                id: 'BK-002',
                type: 'Hotel',
                status: 'Confirmed',
                details: {
                    provider: 'Le Meurice',
                    reservationNumber: 'H789012',
                    date: '2026-03-15',
                    description: '1x Family Suite',
                    cost: 2500,
                    currency: 'USD',
                    location: '228 Rue de Rivoli, 75001 Paris'
                }
            }
        ]
    },
    {
        id: 'GRP-2026-002',
        customerName: 'Chen & Lee Families',
        destination: 'Tokyo, Japan',
        startDate: '2026-04-10',
        endDate: '2026-04-20',
        groupSize: { adults: 4, children: 2, seniors: 2 },
        members: [
            { id: 'T4', name: 'Wei Chen', age: 45, type: 'Adult' },
            { id: 'T5', name: 'Li Chen', age: 42, type: 'Adult' },
            { id: 'T6', name: 'Jun Chen', age: 12, type: 'Child' },
            { id: 'T7', name: 'David Lee', age: 40, type: 'Adult' },
            { id: 'T8', name: 'Mary Lee', age: 38, type: 'Adult' },
            { id: 'T9', name: 'Grace Lee', age: 8, type: 'Child' },
            { id: 'T10', name: 'Grandpa Chen', age: 72, type: 'Senior' },
            { id: 'T11', name: 'Grandma Chen', age: 68, type: 'Senior' }
        ],
        budgetRange: { min: 15000, max: 20000 },
        status: 'in-review',
        priority: 'medium',
        constraints: [
            { type: 'mobility', severity: 'high', description: 'Limited walking ability for seniors' },
            { type: 'time', severity: 'medium', description: 'Prefer slower-paced itinerary' },
        ],
        confidenceScore: 72,
        submittedAt: '2026-01-17T14:20:00',
        bookings: []
    },
    {
        id: 'GRP-2026-003',
        customerName: 'Rodriguez Reunion',
        destination: 'Barcelona, Spain',
        startDate: '2026-05-05',
        endDate: '2026-05-12',
        groupSize: { adults: 8, children: 3, seniors: 0 },
        budgetRange: { min: 12500, max: 15500 },
        status: 'new',
        priority: 'low',
        constraints: [],
        confidenceScore: 92,
        submittedAt: '2026-01-18T11:45:00',
        bookings: []
    },
    {
        id: 'GRP-2026-004',
        customerName: 'Thompson Corporate Retreat',
        destination: 'Rome, Italy',
        startDate: '2026-06-01',
        endDate: '2026-06-08',
        groupSize: { adults: 12, children: 0, seniors: 0 },
        budgetRange: { min: 40000, max: 55000 },
        status: 'approved',
        priority: 'high',
        constraints: [
            { type: 'budget', severity: 'high', description: 'Strict budget limit due to large group' },
            { type: 'preference', severity: 'medium', description: 'Must avoid crowded tourist spots' },
        ],
        confidenceScore: 68,
        submittedAt: '2026-01-16T16:10:00',
        bookings: []
    },
];
