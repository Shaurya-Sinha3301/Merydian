# Distributed Systems Roadmap

Based on the architectural audit, the following improvements are necessary to transition Merydian from a functioning prototype to a robust, scalable, distributed system.

## 1. Synchronization & Concurrency
- **Implement Optimistic Locking (Version Numbers)**: Add a `@version` integer column to the `Itinerary` and `TripSession` models. When updating, use `UPDATE ... WHERE id = :id AND version = :version`. If 0 rows are affected, throw a `StaleDataException` to prevent lost updates from concurrent users.
- **Distributed Redis Locks (Redlock)**: Introduce Redis distributed locks for TBO API calls to globally rate-limit outbound requests to external vendors, preventing HTTP 429 cascades.
- **Idempotency Keys**: Add strict `idempotency_key` checking at the FastAPI entry point for all mutating events (Feedback, Bookings) to reject accidental double-clicks instantly before they reach Celery.

## 2. Celery & Queue Hardening
- **Task ACKs Late**: Configure `task_acks_late = True` and `task_reject_on_worker_lost = True` in `celery_app.py` so that OOM crashes do not result in lost tasks.
- **Prefetch Tuning**: Set `worker_prefetch_multiplier = 1` for `booking_queue` and `event_queue` to ensure fair distribution of long-running LLM/API tasks across available workers.
- **Dead Letter Queue (DLQ)**: Route tasks that fail their `max_retries` limit into a dedicated `dead_letter_queue` so developers can inspect and replay them manually without clogging the primary queues.
- **Zombie Job Sweeper**: Create a scheduled cron task (Beat) that scans `agent_jobs` for tasks stuck in `RUNNING` for > 30 minutes and reverts them to `QUEUED`.

## 3. Redis Optimization
- **Split Redis Workloads**: Logically (or physically) separate the Redis instances: 
  - Broker / Backend (DB 0)
  - Pub/Sub WebSockets (DB 1)
  - Caching & Rate Limiting (DB 2)
- **Pub/Sub Resiliency**: Transition from naive Redis Pub/Sub to Redis Streams for WebSockets, allowing clients to recover missed messages if their WebSocket briefly disconnects.

## 4. Database & State Management
- **Transaction Boundaries**: Refactor `OptimizerService` to ensure external API calls and ML predictions happen *outside* of open database transactions. Currently, long-running processes hold DB connections open, which will exhaust connection pools at scale.
- **Select For Update**: Where appropriate, use `WITH (UPDLOCK)` or `SELECT FOR UPDATE` to strictly lock database rows during critical state transitions.

## 5. Observability
- **Correlation IDs**: `correlation_id` is passed correctly. We must ensure it is automatically injected into all logger formatting across FastAPI, Celery, and the ML modules to stitch together distributed traces.
- **Queue Metrics**: Export Celery queue lengths to Prometheus to trigger worker autoscaling.
