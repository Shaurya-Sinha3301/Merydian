import { TripRequest } from './types';

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
