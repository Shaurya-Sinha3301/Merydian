export const ROUTES = {
  LANDING: '/',
  DEMO: '/demo',
  LOGIN: '/login',
  SIGNUP: '/signup',
  APP: '/app',
  OVERVIEW: '/app/overview',
  DESK: '/app/desk',
  CALENDAR: '/app/calendar',
  INSIGHTS: '/app/insights',
  AGENTS: '/app/agents',
  BOOKINGS: '/app/bookings',
  WEBHOOKS: '/app/webhooks',
  SETTINGS: '/app/settings',
  CUSTOMERS: '/app/customers',
  NEW_TRIP: '/app/new-trip',
  TRIPS: '/app/trips',
  ACTIVITY: '/app/activity',
} as const;

export const customerPath = (familyId: string) => `/app/customers/${familyId}`;
export const historyPath = (tripId: string) => `/app/trip/${tripId}/history`;
export const tripBookingsPath = (tripId: string) => `/app/trip/${tripId}/bookings`;
export const groupPath = (tripId: string) => `/app/trip/${tripId}/group`;
export const notesPath = (tripId: string) => `/app/trip/${tripId}/notes`;
export const tripPath = (tripId: string) => `/app/trip/${tripId}`;
export const changesPath = (tripId: string) => `/app/trip/${tripId}/changes`;
export const feedbackPath = (tripId: string) => `/app/trip/${tripId}/feedback`;
