# Asynchronous Architecture Audit

## 1. Overview
The Merydian asynchronous execution pipeline is built around **Celery** as the task queue, **Redis** as the message broker, result backend, and pub/sub intermediary, and **PostgreSQL** (via SQLModel/SQLAlchemy) for persistent state.

## 2. Components
### Celery
- **Broker & Backend**: Redis (`settings.CELERY_BROKER_URL` and `settings.CELERY_RESULT_BACKEND`).
- **Queues**:
  - `booking_queue`: Dedicated queue for handling external API calls (TBO Hotels, TBO Air).
  - `event_queue`: Handles asynchronous system events like feedback or POI requests.
  - `notification_queue`: Dedicated for sending non-blocking push notifications to the user/agent.
  - `default`: Fallback queue for unrouted tasks.

### Redis
- **Message Broker**: Transports tasks from FastAPI producers to Celery workers.
- **Result Backend**: Stores task outcomes for 1 hour (`result_expires = 3600`).
- **Pub/Sub (WebSockets)**: `booking_notifications` and `traveller_notifications` channels are used to broadcast messages from asynchronous Celery workers to the FastAPI application, which then pushes real-time WebSocket updates to agents and travellers.
- **Rate Limiting & Caching**: Standard KV storage for request throttling and caching endpoint responses.

### Asyncio / FastAPI
- FastAPI acts as the producer. It uses `asyncio` for non-blocking HTTP request handling and WebSocket connections.
- WebSocket connections are managed in memory (`ConnectionManager`), bridging the gap between Redis pub/sub and connected clients.

## 3. Task Lifecycle
1. **Creation**: Tasks are triggered via API endpoints or internal services. `AgentJobService.create_job` or Celery's `.delay()` is invoked.
2. **Queuing**: The task is published to Redis. The database record (if `AgentJob`) is updated to `QUEUED`.
3. **Consumption**: A Celery worker picks up the task from its subscribed queue.
4. **Execution**: The worker begins processing. For `AgentJob` tasks, it calls `AgentJobService.claim_job` (an atomic SQL update) to guarantee single-execution.
5. **State Transitions (AgentJob)**: `CREATED` → `QUEUED` → `RUNNING` → `COMPLETED` (or `FAILED` / `RETRYING`).
6. **Completion**: Results are stored in the database or Redis, and notifications are published to the Redis pub/sub channels.

## 4. Backend Services & Event Ordering
- **Event Service / Agent Service**: Act as orchestrators. They define task semantics and dispatch to the correct worker queue.
- **Ordering**: Task ordering is generally FIFO per queue. However, logical ordering is enforced by state machines in the database (e.g., checking `JobStatus` and preventing duplicate execution).
- **Idempotency**: Implemented via database-level atomic updates (e.g., `UPDATE ... WHERE status = QUEUED`).
