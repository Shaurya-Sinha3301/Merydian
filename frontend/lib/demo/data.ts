
import { Family, TripStatus, DayItinerary } from './types';

const generateDelhiItinerary = (): DayItinerary[] => [
    {
        dayNumber: 1,
        date: "2024-05-10",
        segments: [
            { id: 's1', time: '08:00', activity: 'Arrival & Pick-up', location: 'IGI Airport', type: 'Transport', status: 'Completed', transport: { mode: 'van', vehicleNumber: 'DL1VB 4422', driverName: 'Rajesh Kumar', driverPhone: '+91 98765 43210', departureTime: '08:00', arrivalTime: '09:30', status: 'on_time' } },
            { id: 's2', time: '13:00', activity: 'Lunch at Karim\'s', location: 'Old Delhi', type: 'Meal', status: 'Completed' },
            { id: 's3', time: '15:00', activity: 'Red Fort Exploration', location: 'Netaji Subhash Marg', type: 'POI', status: 'Completed' }
        ]
    },
    {
        dayNumber: 2,
        date: "2024-05-11",
        segments: [
            { id: 's4', time: '10:00', activity: 'Qutub Minar Visit', location: 'Mehrauli', type: 'POI', status: 'Current' },
            { id: 's5', time: '14:00', activity: 'Lotus Temple', location: 'Kalkaji', type: 'POI', status: 'Planned' },
            { id: 's6', time: '17:00', activity: 'Metro to Connaught Place', location: 'Yellow Line', type: 'Transport', status: 'Planned', transport: { mode: 'metro', status: 'confirmed', departureTime: '17:00', arrivalTime: '17:45' } }
        ]
    }
];

export const MOCK_FAMILIES: Family[] = [
    {
        id: 'fam-1', name: 'Sharma Family', size: 4, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'Lotus Temple @ 16:00', status: TripStatus.ON_SCHEDULE, sentiment: 'Very Satisfied', tags: ['VIP'], constraints: { hard: ['Red Fort', 'Akshardham'], soft: ['Avoid late nights'] }, members: [
            { name: 'Rahul Sharma', age: 38, aadhaarNumber: 'XXXX-XXXX-1234', role: 'adult' },
            { name: 'Anita Sharma', age: 36, aadhaarNumber: 'XXXX-XXXX-5678', role: 'adult' },
            { name: 'Sneha Sharma', age: 12, aadhaarNumber: 'XXXX-XXXX-9012', role: 'child' },
            { name: 'Aarav Sharma', age: 8, aadhaarNumber: 'XXXX-XXXX-3456', role: 'child' }
        ], itinerary: generateDelhiItinerary()
    },
    {
        id: 'fam-2', name: 'Patel Family', size: 3, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'Bus to Qutub Minar', status: TripStatus.DELAYED, sentiment: 'Neutral', tags: ['Vegetarian'], constraints: { hard: ['Qutub Minar'], soft: ['Pure Veg Food Only'] }, members: [
            { name: 'Vikram Patel', age: 45, aadhaarNumber: 'XXXX-XXXX-1111', role: 'adult' },
            { name: 'Meena Patel', age: 42, aadhaarNumber: 'XXXX-XXXX-2222', role: 'adult' },
            { name: 'Kishan Patel', age: 70, aadhaarNumber: 'XXXX-XXXX-3333', role: 'senior' }
        ], itinerary: generateDelhiItinerary()
    },
    { id: 'fam-3', name: 'Gupta Family', size: 5, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'India Gate Walk', status: TripStatus.ON_SCHEDULE, sentiment: 'Very Satisfied', tags: ['Budget'], constraints: { hard: ['India Gate'], soft: ['Budget Friendly'] }, members: [], itinerary: generateDelhiItinerary() },
    { id: 'fam-4', name: 'Singh Family', size: 2, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'Chandni Chowk Food Walk', status: TripStatus.AT_RISK, sentiment: 'Neutral', tags: ['Adventure'], constraints: { hard: ['Food Walk'], soft: ['Fast Paced'] }, members: [], itinerary: generateDelhiItinerary() },
    { id: 'fam-5', name: 'Reddy Family', size: 4, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'Humayun\'s Tomb', status: TripStatus.ON_SCHEDULE, sentiment: 'Very Satisfied', tags: ['AC Preference'], constraints: { hard: ['National Museum'], soft: ['AC Transport'] }, members: [], itinerary: generateDelhiItinerary() },
    { id: 'fam-6', name: 'Khan Family', size: 6, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'Jama Masjid', status: TripStatus.ON_SCHEDULE, sentiment: 'Very Satisfied', tags: ['Halal'], constraints: { hard: ['Jama Masjid'], soft: ['Halal food'] }, members: [], itinerary: generateDelhiItinerary() },
    { id: 'fam-7', name: 'Joshi Family', size: 3, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'Shopping CP', status: TripStatus.ON_SCHEDULE, sentiment: 'Neutral', tags: ['Shopping'], constraints: { hard: ['CP'], soft: ['Morning activities'] }, members: [], itinerary: generateDelhiItinerary() },
    { id: 'fam-8', name: 'Mehta Family', size: 4, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'Akshardham Show', status: TripStatus.ON_SCHEDULE, sentiment: 'Very Satisfied', tags: ['Show'], constraints: { hard: ['Akshardham'], soft: ['No crowds'] }, members: [], itinerary: generateDelhiItinerary() },
    { id: 'fam-9', name: 'Iyer Family', size: 5, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'Birla Mandir', status: TripStatus.DELAYED, sentiment: 'Unsatisfied', tags: ['South Indian'], constraints: { hard: ['Lotus Temple'], soft: ['South Indian Food'] }, members: [], itinerary: generateDelhiItinerary() },
    { id: 'fam-10', name: 'Das Family', size: 3, tourId: 'DL-001', tourName: 'Historic Delhi', currentCity: 'New Delhi', localTime: '14:30 IST', nextSegment: 'Street Food', status: TripStatus.ON_SCHEDULE, sentiment: 'Very Satisfied', tags: ['Street Food'], constraints: { hard: ['Street Food tour'], soft: ['Flexible'] }, members: [], itinerary: generateDelhiItinerary() },
];
