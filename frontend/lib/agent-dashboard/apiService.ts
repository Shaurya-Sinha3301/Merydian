import { SearchCriteria, SearchResult } from './types';
import hotelsData from './data/hotels.json';
import flightsData from './data/flights.json';
import trainsData from './data/trains.json';
import cabsData from './data/cabs.json';
import metroData from './data/metro.json';

// Helper to map Hotel JSON to SearchResult
const mapHotelToResult = (hotel: any): SearchResult => ({
    id: `HT-${hotel.id}`,
    type: 'Hotel',
    provider: hotel.name,
    title: hotel.name,
    subtitle: `${hotel.type} • ${hotel.rating} ★`,
    description: hotel.description,
    details: {
        location: `${hotel.location.address}, ${hotel.location.city}`,
        rating: hotel.rating,
    },
    price: {
        amount: hotel.price_per_night,
        currency: 'INR',
    },
    tags: hotel.tags,
    images: hotel.images,
    facilities: hotel.facilities,
    // Agent-specific data with business metrics
    agentMetrics: {
        commission: hotel.agent_commission_amount || (hotel.price_per_night * 0.12),
        markup: hotel.markup_percent || 0,
        b2bPrice: hotel.cost_price || (hotel.price_per_night * 0.85),
    }
});

// Helper to map Flight JSON to SearchResult
const mapFlightToResult = (flight: any): SearchResult => ({
    id: flight.id,
    type: 'Flight',
    provider: flight.airline,
    title: `${flight.departure.city} (${flight.departure.airport}) → ${flight.arrival.city} (${flight.arrival.airport})`,
    subtitle: `${new Date(flight.departure.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(flight.arrival.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${flight.duration}`,
    details: {
        startTime: flight.departure.time,
        endTime: flight.arrival.time,
        duration: flight.duration,
    },
    price: {
        amount: flight.price,
        currency: 'INR',
    },
    tags: [flight.class, `${flight.seats_available} seats left`],
});

// Helper to map Train JSON to SearchResult
const mapTrainToResult = (train: any): SearchResult => ({
    id: train.id,
    type: 'Train',
    provider: train.train_name,
    title: `${train.departure.city} (${train.departure.station}) → ${train.arrival.city} (${train.arrival.station})`,
    subtitle: `${new Date(train.departure.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(train.arrival.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${train.duration}`,
    details: {
        startTime: train.departure.time,
        endTime: train.arrival.time,
        duration: train.duration,
    },
    price: {
        amount: train.price,
        currency: 'INR',
    },
    tags: [train.class, train.train_number],
});

// Helper to map Cab JSON to SearchResult
const mapCabToResult = (cab: any): SearchResult => ({
    id: cab.id,
    type: 'Cab',
    provider: cab.type,
    title: `${cab.model} (${cab.type})`,
    subtitle: `Driver: ${cab.driver.name} • ${cab.driver.rating} ★`,
    details: {
        duration: cab.estimated_arrival,
    },
    price: {
        amount: cab.base_fare, // This is base fare, logic could be more complex
        currency: 'INR',
    },
    tags: [`Capacity: ${cab.capacity}`, 'Instant Booking'],
});


export const apiService = {
    search: async (criteria: SearchCriteria): Promise<SearchResult[]> => {
        // Simulate API delay
        return new Promise((resolve) => {
            setTimeout(() => {
                let results: SearchResult[] = [];

                switch (criteria.type) {
                    case 'Flight':
                        results = flightsData.flights.map(mapFlightToResult);
                        break;
                    case 'Hotel':
                        results = hotelsData.hotels.map(mapHotelToResult);
                        break;
                    case 'Train':
                        results = trainsData.trains.map(mapTrainToResult);
                        break;
                    case 'Cab':
                        results = cabsData.cabs.map(mapCabToResult);
                        break;
                    case 'Metro':
                        // Metro is slightly different structure, usually not "bookable" in the same way, but let's list routes
                        results = metroData.metro_routes.map((route: any) => ({
                            id: route.id,
                            type: 'Metro',
                            provider: 'Metro Rail',
                            title: `${route.city} Metro - ${route.line_name}`,
                            subtitle: `Frequency: Every ${route.frequency_minutes} mins`,
                            details: {
                                duration: 'N/A'
                            },
                            price: {
                                amount: 20, // Dummy
                                currency: 'INR'
                            },
                            tags: [`First: ${route.first_train}`, `Last: ${route.last_train}`]
                        }));
                        break;
                    default:
                        results = [];
                        break;
                }

                // Simple client-side filtering (mocking backend search)
                if (criteria.destination && criteria.type !== 'Metro') { // Metro usually city based
                    const dest = criteria.destination.toLowerCase();
                    results = results.filter(r =>
                        r.title.toLowerCase().includes(dest) ||
                        r.details.location?.toLowerCase().includes(dest) ||
                        (r.type === 'Flight' && r.title.toLowerCase().includes(dest)) // Flight title has destination
                    );
                }

                resolve(results);
            }, 800);
        });
    }
};

