# Merydian Real-Time Event Flow

## Overview

Merydian relies on a real-time event-driven architecture to keep both Travel Agents and Customers updated on the status of their trips, itinerary optimizations, and background jobs.

## The Event Pipeline

1. **Job Execution**: When a background job (e.g., itinerary optimization) completes, the Celery worker task (`app/workers/agent_tasks.py`) executes.
2. **Database Update**: The task updates the Postgres database (via `AgentJobService`) with the new status (`COMPLETED` or `FAILED`).
3. **Redis Publish**: The worker task immediately publishes a JSON payload describing the event (`JOB_COMPLETED`) to Redis via standard Pub/Sub mechanisms.
4. **FastAPI Subscription**: A background listener in the FastAPI application (`app/core/websocket.py`) listens to these Redis channels (`booking_notifications`, `traveller_notifications`).
5. **WebSocket Dispatch**: The FastAPI listener receives the event from Redis and pushes it down the active WebSocket connection to the specific client (either `Agent` or `Traveller`).
6. **Frontend Reactivity**: The React frontend (using the `useWebSockets.ts` hook) receives the message and calls `queryClient.invalidateQueries()`, seamlessly forcing React Query to refetch the affected data (e.g., trips, jobs) and update the UI instantly without page reloads.

## Channel Definitions

- `booking_notifications`: Used primarily for Agent-facing events. Messages include job completion statuses that update the Agent Dashboard optimization queues.
- `traveller_notifications`: Used primarily for Customer-facing events. Messages include itinerary updates, booking confirmations, and direct agent messages.

## Expected Message Payload

```json
{
  "type": "JOB_COMPLETED",
  "job_id": "uuid-string",
  "trip_id": "uuid-string",
  "agent_id": "uuid-string"
}
```

## Adding New Events

To add a new real-time event:
1. Define the event trigger in your Python service (or Celery task) and publish to the appropriate Redis channel using `redis.publish`.
2. Update the frontend `useWebSockets.ts` hook to intercept the new `data.type` and trigger the appropriate `queryClient.invalidateQueries` or state update.
