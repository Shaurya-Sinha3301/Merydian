# Engineering Impact & Priority Report

This report ranks the proposed distributed systems improvements by impact, scalability, and resume/portfolio value.

## High Priority (Immediate Action Recommended)

### 1. Optimistic Locking & Concurrency Control on Itineraries
- **Engineering Impact**: Critical. Prevents irreversible data loss (Lost Update Anomaly).
- **Scalability Impact**: Very High. Safely unlocks concurrent multi-user editing.
- **Complexity**: Low-Medium (Add version column, update SQLAlchemy logic, handle exception in UI).
- **Resume Value**: **High**. Demonstrates deep understanding of ACID properties, race conditions, and distributed state consistency. "Implemented Optimistic Concurrency Control to resolve race conditions in multi-agent environments."

### 2. Celery Reliability Hardening (ACKs, Prefetch, DLQ)
- **Engineering Impact**: High. Prevents silent data loss and task dropping on worker crashes.
- **Scalability Impact**: High. Optimizes horizontal scaling by preventing task hoarding.
- **Complexity**: Low (Mostly configuration changes in `celery_app.py` and creating a DLQ route).
- **Resume Value**: **High**. Proves production-readiness experience. "Architected fault-tolerant asynchronous execution pipelines using Celery, implementing late acknowledgements and Dead Letter Queues for 99.9% task reliability."

### 3. Zombie Job Sweeper (Self-Healing System)
- **Engineering Impact**: High. Keeps the system operational without manual database intervention.
- **Scalability Impact**: Medium.
- **Complexity**: Medium (Requires Celery Beat setup and safe timeout logic).
- **Resume Value**: **High**. "Built self-healing distributed systems by implementing background sweeper processes to automatically recover and requeue orphaned ML jobs."

## Medium Priority

### 4. Idempotency Keys at API Layer
- **Engineering Impact**: Medium. Shifts failure prevention left, saving Celery compute.
- **Scalability Impact**: Medium. Reduces unnecessary backend load.
- **Complexity**: Medium (Requires Redis lookup on entry points).
- **Resume Value**: **Medium-High**. "Designed idempotent REST APIs using Redis distributed caching to prevent duplicate financial and scheduling transactions."

### 5. Redis Distributed Locks for External API Limits
- **Engineering Impact**: Medium. Protects against rate limits from vendors.
- **Scalability Impact**: High. Essential for hitting 1,000+ users.
- **Complexity**: Medium.
- **Resume Value**: **Medium**. "Utilized Redis distributed locks to globally throttle egress traffic to third-party vendors."

## Low Priority (Future Scalability)

### 6. Transition WebSockets to Redis Streams
- **Engineering Impact**: Low (Current pub/sub works fine for current scale).
- **Scalability Impact**: High (Only needed at 10k+ users).
- **Complexity**: High (Requires completely rewriting the `ConnectionManager`).
- **Resume Value**: **High**, but not worth the immediate engineering effort relative to current needs.

### 7. Splitting Redis Workloads
- **Engineering Impact**: Low.
- **Scalability Impact**: Medium.
- **Complexity**: Low.
- **Resume Value**: **Low**. Standard DevOps task.

## Recommendation for Next Steps
Do not rewrite everything. Focus heavily on **Item 1** and **Item 2**. 
They require minimal code changes but provide massive architectural stability and powerful talking points for system design interviews.
