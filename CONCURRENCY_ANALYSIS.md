# Concurrency Analysis

This document outlines how Merydian currently handles concurrent requests.

## Scenario: Two users edit the same itinerary simultaneously
1. User A and User B submit feedback simultaneously.
2. Two separate API requests create two separate `AgentJob` rows in the database.
3. Both jobs are pushed to the Celery `event_queue`.

### Can duplicate jobs run?
- Duplicate identical jobs can run because each API request generates a *new* unique `AgentJob` ID. There is no deduplication based on payload idempotency keys at the API layer. 
- However, a *single job* will not be executed twice. 

### Job Ownership and State Transitions
- The system employs **Optimistic Database Locking** for task execution state.
- In `AgentJobService.claim_job()`, a worker executes:
  `UPDATE agent_jobs SET status='RUNNING' WHERE id=<job_id> AND status='QUEUED'`
- This relies on the ACID properties of PostgreSQL. If two Celery workers pop the *same* job ID (e.g., due to Redis network partition or Celery visibility timeout), only one worker will successfully update the row and receive a `rowcount > 0`. The other worker aborts.

### Can two workers overwrite the same itinerary?
- **Yes.** Because the backend lacks an `idempotency_key` or `version_number` on the itinerary update query itself, two separate jobs running on the same itinerary could result in a classic **Race Condition** / **Lost Update**. 
- If Worker A reads the itinerary, Worker B reads the itinerary, Worker A optimizes and writes, and then Worker B optimizes and writes, Worker A's changes are completely overwritten and lost.

### Synchronization Mechanisms
- **Redis Locks**: None used.
- **Optimistic Locking**: Used for Job status (`status='QUEUED'` check). NOT used for Itinerary entities (no `@version` or Compare-And-Swap).
- **DB Transactions**: Standard SQLAlchemy sessions are used, but they do not use `SELECT ... FOR UPDATE` row-level locks when reading itineraries for optimization.

### Conclusion
Race conditions are heavily possible on business entities (Itineraries). The current DB transactions are insufficient for domain entity concurrency. Job state concurrency is correctly handled via SQL updates.
