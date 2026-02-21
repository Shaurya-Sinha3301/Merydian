import itineraryDataJson from './data/itinerary_data.json';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  name: string;
  address: string;
  coordinates: Coordinates;
}

export interface TicketStatus {
  confirmed: boolean;
  bookingReference: string;
  ticketUrl: string;
  pnr?: string;
  seatNumbers?: string[];
  qrCode?: string;
}

export interface DriverDetails {
  name: string;
  contact: string;
  vehicleNumber: string;
  vehicleModel: string;
}

export interface TransportEvent {
  mode: 'Cab' | 'Flight' | 'Train';
  providerName: string;
  flightNumber?: string;
  driverDetails?: DriverDetails;
  pickupLocation: Location;
  dropLocation: Location;
  ticketStatus: TicketStatus;
}

export interface AccommodationEvent {
  hotelName: string;
  address: string;
  coordinates: Coordinates;
  roomType: string;
  roomNumbers: string[];
  checkInTime: string;
  checkOutTime: string;
  bookingReference: string;
  confirmationUrl: string;
}

export interface ActivityEvent {
  locationName: string;
  address: string;
  coordinates: Coordinates;
  activityType: string;
  description: string;
  entryFee: {
    amount: number;
    currency: string;
    perPerson: boolean;
    includes?: string;
  };
  ticketReference: {
    confirmed: boolean;
    bookingId: string;
    ticketUrl: string;
    qrCode?: string;
  };
  guideDetails?: {
    name: string;
    contact: string;
    experience: string;
  };
  skipperDetails?: {
    name: string;
    contact: string;
    boatName: string;
  };
}

export interface MealEvent {
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Brunch';
  restaurantName: string;
  location: string;
  cuisine: string;
  reservationStatus: string;
  bookingReference: string;
  specialArrangements?: string;
}

export interface Disruption {
  type: 'delay' | 'cancellation' | 'closure' | 'overbooking' | 'weather' | 'traffic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  suggestedAction?: string;
  estimatedDelay?: string;
  alternativeAvailable?: boolean;
}

export interface TimelineEvent {
  id: string;
  type: 'transport' | 'activity' | 'accommodation' | 'meal';
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  imageUrl?: string; // Add image support
  transport?: TransportEvent;
  accommodation?: AccommodationEvent;
  activity?: ActivityEvent;
  meal?: MealEvent;
  disruption?: Disruption;
  status?: 'confirmed' | 'delayed' | 'cancelled' | 'modified';
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  timelineEvents: TimelineEvent[];
}

export interface Itinerary {
  groupId: string;
  itineraryName: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  days: ItineraryDay[];
}

export interface ItineraryData {
  itineraries: Itinerary[];
}

const itineraryData: ItineraryData = itineraryDataJson as ItineraryData;

/**
 * Get itinerary by group ID
 */
export function getItineraryByGroupId(groupId: string): Itinerary | null {
  const itinerary = itineraryData.itineraries.find(
    (itin) => itin.groupId === groupId
  );
  return itinerary || null;
}

/**
 * Get all itineraries
 */
export function getAllItineraries(): Itinerary[] {
  return itineraryData.itineraries;
}

/**
 * Format time from ISO string to readable format
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date from ISO string to readable format
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get event type icon name
 */
export function getEventTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    transport: 'TruckIcon',
    activity: 'SparklesIcon',
    accommodation: 'HomeIcon',
    meal: 'CakeIcon',
  };
  return iconMap[type] || 'MapPinIcon';
}

/**
 * Get transport mode icon
 */
export function getTransportModeIcon(mode: string): string {
  const iconMap: Record<string, string> = {
    Cab: 'TruckIcon',
    Flight: 'PaperAirplaneIcon',
    Train: 'TruckIcon',
  };
  return iconMap[mode] || 'TruckIcon';
}


/**
 * Get disruption severity color
 */
export function getDisruptionColor(severity: string): string {
  const colorMap: Record<string, string> = {
    low: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    medium: 'text-orange-600 bg-orange-50 border-orange-200',
    high: 'text-red-600 bg-red-50 border-red-200',
    critical: 'text-rose-700 bg-rose-100 border-rose-300',
  };
  return colorMap[severity] || 'text-gray-600 bg-gray-50 border-gray-200';
}

/**
 * Get disruption icon
 */
export function getDisruptionIcon(type: string): string {
  const iconMap: Record<string, string> = {
    delay: 'ClockIcon',
    cancellation: 'XCircleIcon',
    closure: 'LockClosedIcon',
    overbooking: 'ExclamationTriangleIcon',
    weather: 'CloudIcon',
    traffic: 'TruckIcon',
  };
  return iconMap[type] || 'ExclamationTriangleIcon';
}

/**
 * Check if itinerary has any disruptions
 */
export function hasDisruptions(itinerary: Itinerary): boolean {
  return itinerary.days.some(day =>
    day.timelineEvents.some(event => event.disruption)
  );
}

/**
 * Get all disruptions from itinerary
 */
export function getDisruptions(itinerary: Itinerary): Array<{ event: TimelineEvent; dayNumber: number }> {
  const disruptions: Array<{ event: TimelineEvent; dayNumber: number }> = [];
  
  itinerary.days.forEach(day => {
    day.timelineEvents.forEach(event => {
      if (event.disruption) {
        disruptions.push({ event, dayNumber: day.dayNumber });
      }
    });
  });
  
  return disruptions;
}

/**
 * Get default image URL for event type
 */
export function getDefaultImageForEvent(event: TimelineEvent): string {
  // Return imageUrl if it exists
  if (event.imageUrl) return event.imageUrl;
  
  // Default images based on event type
  if (event.type === 'transport') {
    if (event.transport?.mode === 'Flight') {
      return 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80';
    }
    if (event.transport?.mode === 'Train') {
      return 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80'; // Cab
  }
  
  if (event.type === 'activity') {
    if (event.activity?.activityType?.toLowerCase().includes('beach')) {
      return 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80';
    }
    if (event.activity?.activityType?.toLowerCase().includes('cruise')) {
      return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80';
    }
    if (event.activity?.activityType?.toLowerCase().includes('fort') || 
        event.activity?.activityType?.toLowerCase().includes('historical')) {
      return 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&q=80'; // Generic activity
  }
  
  if (event.type === 'accommodation') {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'; // Hotel
  }
  
  if (event.type === 'meal') {
    if (event.meal?.cuisine?.toLowerCase().includes('seafood')) {
      return 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80';
    }
    if (event.meal?.cuisine?.toLowerCase().includes('indian')) {
      return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80'; // Generic restaurant
  }
  
  return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80'; // Default travel image
}
