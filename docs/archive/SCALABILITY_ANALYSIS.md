# Scalability Analysis

## Evaluation against User Loads

### 10 Users (Current State)
- **Status**: Excellent.
- **Bottlenecks**: None. Database handles locking easily. Celery queues process synchronously fast enough. Redis handles pub/sub seamlessly.

### 100 Users
- **Status**: Good, but showing cracks.
- **Bottlenecks**: 
  - **Worker Starvation**: Without `prefetch_multiplier = 1`, one worker might pull 10 optimization tasks simultaneously, leaving other workers idle.
  - **API Rate Limits**: TBO API rate limits might be hit without global Redis-based distributed locking to pace outbound requests.

### 1,000 Users
- **Status**: Degrading heavily.
- **Bottlenecks**:
  - **Database Contention**: Polling the `agent_jobs` table and optimistic locking on `claim_job` will cause heavy transaction collisions.
  - **Race Conditions**: With 1,000 users, the probability of concurrent edits to the *same itinerary* skyrockets. Since there is no Optimistic Locking on itineraries, data loss will occur frequently.
  - **WebSocket Fan-out**: The `ConnectionManager` iterates over dictionaries in Python. Broadcasting to 1,000 WebSockets simultaneously will block the FastAPI event loop, causing dropped connections and latency spikes.

### 10,000 Users
- **Status**: Total system failure.
- **Bottlenecks**:
  - **Event Loop Blockage**: The synchronous Redis client (`redis.from_url`) used inside Celery workers for `notify_agent` will exhaust connection pools.
  - **Redis Saturation**: A single Redis node handling Celery Broker, Celery Backend, WebSockets Pub/Sub, Rate Limiting, and Caching will max out CPU and memory.
  - **Zombie Jobs**: Without Dead Letter Queues (DLQ) and `task_acks_late`, sudden autoscaling down (pod termination) will silently drop thousands of jobs.

## Identified Scalability Bottlenecks
1. **Itinerary Race Conditions**: Lack of entity-level optimistic locking or versioning.
2. **Task Hoarding**: Incorrect Celery prefetch settings for I/O heavy ML jobs.
3. **Missing Auto-Scaling Metrics**: No Queue length metrics to drive Kubernetes HPA (Horizontal Pod Autoscaling).
4. **Synchronous Pushes**: Fast-API WebSocket implementation blocks the event loop on mass broadcasts.
5. **No DLQ**: Failed/poison-pill jobs congest the retry loop.
