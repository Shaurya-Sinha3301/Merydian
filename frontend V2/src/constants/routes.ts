export const ROUTES = {
  LANDING: '/',
  DEMO: '/demo',
  LOGIN: '/login',
  SIGNUP: '/signup',
  APP: '/app',
  OVERVIEW: '/app/overview',
  DESK: '/app/desk',
  CALENDAR: '/app/calendar',
  CUSTOMERS: '/app/customers',
  NEW_TRIP: '/app/new-trip',
  TRIPS: '/app/trips',
  ACTIVITY: '/app/activity',
} as const;

export const tripPath = (tripId: string) => `/app/trip/${tripId}`;
export const changesPath = (tripId: string) => `/app/trip/${tripId}/changes`;
export const feedbackPath = (tripId: string) => `/app/trip/${tripId}/feedback`;
