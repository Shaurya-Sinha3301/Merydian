# Task Execution Flow (Feedback Optimization)

This document traces a single optimization request—Customer submits feedback—through the asynchronous execution pipeline.

## Execution Trace

1. **API Layer (`app/api/...`)**
   - Customer submits feedback via an HTTP endpoint.
   - The endpoint invokes the `EventService` or `AgentJobService` to create a job.
   - DB Interaction: An `AgentJob` row is inserted into PostgreSQL with status `CREATED`. 

2. **Job Queuing (`AgentJobService`)**
   - The job state transitions from `CREATED` to `QUEUED` in the database.
   - The job ID is pushed to the Celery broker (Redis) via `execute_agent_job_task.delay(job_id)`.

3. **Celery Worker Pickup (`app/workers/agent_tasks.py`)**
   - The Celery worker pulls the task from the Redis broker.
   - The worker executes `execute_agent_job_task`.

4. **Job Claiming / Concurrency Control (`AgentJobService.claim_job`)**
   - **DB Interaction**: Atomic SQL update: `UPDATE agent_jobs SET status='RUNNING' WHERE id=job_id AND status='QUEUED'`.
   - If the update fails (0 rows affected), the worker aborts (meaning another worker claimed it or it was cancelled).

5. **Runtime Orchestration (`AgentRuntime`)**
   - The task evaluates `job.job_type == JobType.AGENT_FEEDBACK`.
   - Fetches pure context via `TravelContextService.build_context(trip_id)`.
   - Triggers `runtime.execute_feedback_optimization(request)`.

6. **Optimization & Constraint Validation (`FeedbackProcessor`)**
   - The system calls `FeedbackProcessor.process_user_feedback` inside `ml_or`.
   - Parses the natural language feedback into structured constraints.
   - **DB Interaction**: Updates DB preferences (Must Visit/Never Visit) via `PreferenceService.add_preference`.
   - Runs the **ML Optimizer** with temporary JSON files reflecting the previous itinerary and the new constraints.
   - Validates constraints and generates a new, optimized itinerary (`optimized_itinerary.json`).

7. **Explainability Pipeline (`ExplanationService`)**
   - Generates differential explanations (DiffEngine → CausalTagger → DeltaEngine → LLM) explaining *why* the itinerary changed.
   - **DB Interaction**: `ExplanationService.save_explanations` saves these LLM-generated explanations to the PostgreSQL database.

8. **Database Commitment (`ItineraryService`)**
   - If the optimization succeeds, a new `Itinerary` version is committed to the database.
   - `TripSession` is updated with a new iteration count and new feedback history.

9. **Result Processing & Notification (`app/workers/agent_tasks.py`)**
   - `AgentJobService.complete_job` marks the job as `COMPLETED` in the database.
   - **Redis Interaction**: The worker connects synchronously to Redis and publishes a JSON payload to `booking_notifications` and `traveller_notifications` pub/sub channels.

10. **WebSocket Dispatch (`app/core/websocket.py`)**
    - The asynchronous FastAPI process running `start_redis_listener` picks up the pub/sub event.
    - **Frontend Interaction**: The message is dispatched through active WebSockets to the respective users and agents, updating their UIs in real time.
