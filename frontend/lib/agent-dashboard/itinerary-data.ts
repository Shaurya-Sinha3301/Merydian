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

export interface TimelineEvent {
  id: string;
  type: 'transport' | 'activity' | 'accommodation' | 'meal';
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  transport?: TransportEvent;
  accommodation?: AccommodationEvent;
  activity?: ActivityEvent;
  meal?: MealEvent;
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
