# API Integration Guide

## Standardized HTTP Client (`services/client.ts`)
All network requests must route through `apiClient` defined in `services/client.ts`. This ensures:
- **Authentication**: JWT Bearer tokens are automatically attached from localStorage/context.
- **Error Handling**: Standardized parsing of backend `HTTPException` formats into throw-able JavaScript `Error` objects with consistent `.message` properties.
- **Correlation IDs**: `X-Correlation-ID` headers are injected for distributed tracing matching backend logs.

## Domain Services
The API is chunked into domain-specific service files:
- `trips.ts`: Managing trip lifecycles (`/trips`).
- `timeline.ts`: Fetching and mutating the active itinerary (`/itinerary`).
- `feedback.ts`: Sending customer feedback and constraints (`/itinerary/feedback`).
- `jobs.ts`: Polling long-running optimization tasks (`/jobs`).
- `explanations.ts`: Fetching AI reasoning for diffs.

## React Query Hooks
Never call service methods directly from components. Always wrap them in a TanStack React Query hook (e.g., `useActiveTrip`, `useJobStatus`).
- Use `useQuery` for reads.
- Use `useMutation` for writes.
- Rely on `queryClient.invalidateQueries` to refresh data after a successful mutation rather than manually updating React state.
