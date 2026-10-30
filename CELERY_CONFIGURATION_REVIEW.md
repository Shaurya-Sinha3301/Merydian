# Celery Configuration Review

This document reviews the current Celery setup found in `app/core/celery_app.py`.

## Current Configuration
```python
celery_app = Celery("meiliai_worker", broker=REDIS, backend=REDIS)

celery_app.conf.task_routes = {
    "app.worker.process_hotel_booking": {"queue": "booking_queue"},
    'app.worker.process_event_task': {'queue': 'event_queue'},
    'app.worker.process_notification_task': {'queue': 'notification_queue'},
}

celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.task_default_queue = "default"
celery_app.conf.result_expires = 3600
```

## Review & Audit
1. **Queues & Routing**: Excellent separation of concerns. Long-running API calls (TBO) are isolated in `booking_queue` from ML optimization `event_queue` and fast `notification_queue`.
2. **Worker Concurrency**: Not explicitly defined in code (relies on CLI args e.g. `-c`). Default is CPU core count. Given TBO APIs and OpenAI/LLM calls are highly I/O bound, concurrency should explicitly utilize Eventlet/Gevent or have a much higher `-c` parameter.
3. **Prefetch Multiplier**: Missing. By default, Celery prefetches `4 * concurrency` tasks. For long-running ML/Booking tasks, this can cause "worker hoarding" where one worker locks up tasks while others sit idle.
4. **Retries**: `max_retries` is set on individual tasks (e.g., `2` for bookings, `3` for agents), but `retry_backoff` and `retry_jitter` are missing in standard configurations. There is a manual exponential backoff implemented in `process_event_task`.
5. **Acknowledgements (ACKs)**: `task_acks_late` is NOT configured. By default, Celery acknowledges the task right *before* execution. If a worker crashes mid-booking or mid-optimization, the task is lost forever.
6. **Visibility Timeout**: Not explicitly set. Relying on Redis defaults.
7. **Dead Letter Queues (DLQ)**: Not implemented. Failed jobs stay in the database as `FAILED` but are dropped from Celery entirely.

## Production Readiness
**Status: Not Production Ready.**
The lack of late acknowledgements (`task_acks_late = True`) and proper prefetch tuning (`worker_prefetch_multiplier = 1`) makes the system highly susceptible to task loss during worker OOMs or deployments.
