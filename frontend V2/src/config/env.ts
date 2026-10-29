const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const ENV = {
  API_URL: rawApiUrl.replace(/\/$/, ''),
  API_ORIGIN: (import.meta.env.VITE_API_ORIGIN as string | undefined)
    || rawApiUrl.replace(/\/api\/v1\/?$/, '')
    || 'http://localhost:8000',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
} as const;
