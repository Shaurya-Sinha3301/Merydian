# Redis Usage Report

Redis is utilized extensively across the Merydian backend. Below is an exhaustive audit of every Redis usage context.

## 1. Message Broker (Celery)
- **Producer**: FastAPI application (`.delay()` calls).
- **Consumer**: Celery Workers.
- **Key Schema**: Celery default keys (`celery`, `_kombu.binding.celery`, etc.)
- **TTL**: Transient until consumed.
- **Lifecycle**: Tasks are persisted in Redis lists/streams until workers pop and acknowledge them.

## 2. Result Backend (Celery)
- **Producer**: Celery Workers returning results.
- **Consumer**: FastAPI checking task status, though often not polled due to pub/sub usage.
- **Key Schema**: `celery-task-meta-{task_id}`
- **TTL**: 3600 seconds (1 hour). Configured via `celery_app.conf.result_expires`.
- **Lifecycle**: Stored upon task completion (`SUCCESS` or `FAILURE`), auto-expires.

## 3. Pub/Sub (WebSockets)
- **Producer**: Celery Workers (`notify_agent` and `process_notification_task`).
- **Consumer**: FastAPI Background Listener (`start_redis_listener` in `app/core/websocket.py`).
- **Channels**: 
  - `booking_notifications` (for travel agents)
  - `traveller_notifications` (for standard users)
- **TTL**: None. Ephemeral (fire and forget).
- **Lifecycle**: Dispatched synchronously by the worker process. Consumed asynchronously by FastAPI and routed to connected WebSocket clients. 

## 4. Cache (API Responses)
- **Producer / Consumer**: FastAPI decorators (`@cache` in `app/core/cache.py`).
- **Key Schema**: `cache:{prefix}:{request.url.path}:{request.url.query}` (or function hashes).
- **TTL**: Default 60 seconds.
- **Lifecycle**: Checked on request. If missed, endpoint executes and the JSON response is written to Redis using `setex`. Validated upon retrieval.

## 5. Rate Limiter (API Endpoints)
- **Producer / Consumer**: FastAPI Dependency (`RateLimiter` in `app/core/rate_limit.py`).
- **Key Schema**: `rate_limit:{client_ip}:{request.url.path}`
- **TTL**: Dynamically set (e.g., 60 seconds).
- **Lifecycle**: Incremented via `INCR` on request. If it's the first request, an expiration is set via `EXPIRE`. If `current_requests > times`, it raises a 429 HTTP Exception. It fails-open if Redis is unavailable.

## Missing Usages (Not Found)
- **Distributed Locks**: No Redis-based distributed locks (e.g., Redlock) are implemented. Concurrency locking relies entirely on PostgreSQL (`UPDATE ... WHERE status=QUEUED`) and Python memory `threading.Lock`.
- **State Store**: Not used as a primary state store (PostgreSQL is used).
