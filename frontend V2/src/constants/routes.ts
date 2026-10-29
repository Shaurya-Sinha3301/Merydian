export const ROUTES = {
  LANDING: '/',
  DEMO: '/demo',
  LOGIN: '/login',
  SIGNUP: '/signup',
  APP: '/app',
  DESK: '/app/desk',
  TRIPS: '/app/trips',
  ACTIVITY: '/app/activity',
} as const;

export const tripPath = (tripId: string) => `/app/trip/${tripId}`;
export const changesPath = (tripId: string) => `/app/trip/${tripId}/changes`;
export const feedbackPath = (tripId: string) => `/app/trip/${tripId}/feedback`;
