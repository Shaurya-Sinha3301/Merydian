export interface SearchCriteria {
    type: 'Flight' | 'Hotel' | 'Train' | 'Bus' | 'Metro' | 'Cab';
    origin?: string;
    destination?: string;
    date: string;
    returnDate?: string;
    travelers: number;
    class?: string;
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
}

// Mock Data Generators

const generateFlights = (criteria: SearchCriteria): SearchResult[] => {
    return [
        {
            id: 'FL-001',
            type: 'Flight',
            provider: 'Indigo',
            title: `${criteria.origin || 'DEL'} → ${criteria.destination || 'BOM'}`,
            subtitle: '06:00 AM - 08:15 AM • 2h 15m',
            details: { startTime: '06:00', endTime: '08:15', duration: '2h 15m' },
            price: { amount: 5400, currency: 'INR' },
            tags: ['Non-stop', 'Economy']
        },
        {
            id: 'FL-002',
            type: 'Flight',
            provider: 'Air India',
            title: `${criteria.origin || 'DEL'} → ${criteria.destination || 'BOM'}`,
            subtitle: '10:00 AM - 12:10 PM • 2h 10m',
            details: { startTime: '10:00', endTime: '12:10', duration: '2h 10m' },
            price: { amount: 6200, currency: 'INR' },
            tags: ['Meal Included', 'Refundable']
        },
        {
            id: 'FL-003',
            type: 'Flight',
            provider: 'Vistara',
            title: `${criteria.origin || 'DEL'} → ${criteria.destination || 'BOM'}`,
            subtitle: '05:30 PM - 07:45 PM • 2h 15m',
            details: { startTime: '17:30', endTime: '19:45', duration: '2h 15m' },
            price: { amount: 7500, currency: 'INR' },
            tags: ['Business Class Available']
        }
    ];
};

const generateHotels = (criteria: SearchCriteria): SearchResult[] => {
    return [
        {
            id: 'HT-001',
            type: 'Hotel',
            provider: 'Taj Palace',
            title: 'Taj Palace, New Delhi',
            subtitle: 'Luxury Hotel • 5 Star',
            description: 'Experience the grandeur of Taj Palace, New Delhi. Nestled in the heart of the diplomatic enclave, our 5-star hotel is an oasis of calm and luxury. Enjoy world-class dining, a rejuvenating spa, and lush gardens. Perfect for both business and leisure travelers seeking an unforgettable stay.',
            details: { location: 'Chanakyapuri, New Delhi', rating: 4.8 },
            price: { amount: 18000, currency: 'INR' },
            tags: ['Breakfast Included', 'Free Cancellation'],
            images: [
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                'https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                'https://images.unsplash.com/photo-1571896349842-6e53ce41be03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            ],
            facilities: ['Free Wifi', 'Swimming Pool', 'Spa', 'Gym', 'Restaurant']
        },
        {
            id: 'HT-002',
            type: 'Hotel',
            provider: 'Ibis Aerocity',
            title: 'Ibis New Delhi Aerocity',
            subtitle: 'Business Hotel • 4 Star',
            description: 'Modern, vibrant, and perfectly located. Ibis New Delhi Aerocity offers comfortable rooms, a lively bar, and easy access to the airport and metro. Ideal for transit passengers and business travelers looking for value and convenience.',
            details: { location: 'Aerocity, New Delhi', rating: 4.2 },
            price: { amount: 6500, currency: 'INR' },
            tags: ['Airport Transfer'],
            images: [
                'https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            ],
            facilities: ['Free Wifi', 'Airport Shuttle', 'Bar', '24h Front Desk']
        },
        {
            id: 'HT-003',
            type: 'Hotel',
            provider: 'The Leela Palace',
            title: 'The Leela Palace',
            subtitle: 'Ultra Luxury • 5 Star',
            description: 'Ranked among the best hotels in the world, The Leela Palace New Delhi represents the magnificent architecture and elegance of Lutyens Delhi. Indulge in royal luxury, exceptional service, and culinary masterpieces at our award-winning restaurants.',
            details: { location: 'Diplomatic Enclave, New Delhi', rating: 4.9 },
            price: { amount: 25000, currency: 'INR' },
            tags: ['Spa', 'Pool View'],
            images: [
                'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                'https://images.unsplash.com/photo-1590490360182-c87295ecc039?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            ],
            facilities: ['Butler Service', 'Rooftop Pool', 'Fine Dining', 'Spa']
        }
    ];
};

const generateOthers = (criteria: SearchCriteria): SearchResult[] => {
    return [
        {
            id: `OT-${Math.random().toString(36).substr(2, 5)}`,
            type: criteria.type,
            provider: 'Uber Intercity',
            title: `${criteria.origin || 'City Center'} → ${criteria.destination || 'Airport'}`,
            subtitle: 'Sedan • 4 Seater',
            details: { startTime: 'Now', duration: '45m' },
            price: { amount: 800, currency: 'INR' },
            tags: ['Instant Confirmation']
        }
    ];
};


export const apiService = {
    search: async (criteria: SearchCriteria): Promise<SearchResult[]> => {
        // Simulate API delay
        return new Promise((resolve) => {
            setTimeout(() => {
                switch (criteria.type) {
                    case 'Flight':
                        resolve(generateFlights(criteria));
                        break;
                    case 'Hotel':
                        resolve(generateHotels(criteria));
                        break;
                    default:
                        resolve(generateOthers(criteria));
                        break;
                }
            }, 1000); // 1 second delay
        });
    }
};
