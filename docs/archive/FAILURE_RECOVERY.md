# Failure Recovery Analysis

This document traces potential failures and determines how the current system recovers.

## 1. Worker Crashes (OOM / Pod Eviction)
- **Scenario**: Worker is processing an itinerary optimization and runs out of memory.
- **Recovery**: Since `task_acks_late` is not enabled, the task is acknowledged upon receipt. The task is **lost**.
- **State**: The database record (`AgentJob`) remains stuck in the `RUNNING` state indefinitely, creating a zombie job.

## 2. Redis Restart / Network Partition
- **Scenario**: Connection to Redis drops.
- **Recovery**: Rate limiters fail-open (allowing traffic). Cache returns misses. Celery reconnects automatically. Pub/sub messages during the downtime are **permanently lost** (no persistence on pub/sub channels).
- **Consistency**: Clients waiting on WebSocket updates will stall indefinitely without timeouts.

## 3. Duplicate Task Consumption
- **Scenario**: Visibility timeout is reached, or network partition causes two workers to consume the same job ID.
- **Recovery**: `AgentJobService.claim_job()` uses an optimistic SQL lock (`WHERE status='QUEUED'`). The second worker will receive a `0` row count and safely abort.
- **Consistency**: Safe. 

## 4. API / External Dependency Timeout (TBO APIs, LLMs)
- **Scenario**: Hotel API times out.
- **Recovery**: `process_hotel_booking` marks the specific booking step as `FAILED` in the database, notifies the agent, and marks the overall job as `PARTIAL_FAILURE` or `FAILED`. 
- **Retries**: `process_event_task` implements an exponential backoff (`countdown=2 ** retries`). `agent_tasks.py` sets `max_retries=3`.

## 5. Database Rollback
- **Scenario**: Database write fails mid-optimization.
- **Recovery**: `get_db_session()` in `OptimizerService` correctly catches exceptions and issues `session.rollback()`. However, earlier side effects (like external API calls or WebSocket pushes) cannot be rolled back.
- **Consistency**: Database state is protected, but system state (distributed) might be fragmented.

## Summary
The system has robust job tracking and retry logic but severe gaps in **crash recovery** (missing ACKs) and **zombie job** cleanup.
