from celery import Celery
from app.core.config import settings
from app.core.redis import queue_url as _queue_url

# Single Celery app shared by every task module (booking/event/notification
# tasks in app.worker and the agent job tasks in app.workers.agent_tasks).
celery_app = Celery(
    "meiliai_worker",
    # The broker is on the queue Redis. No result backend: job state is in Postgres, and storing results in
    # Redis only added keys to expire and a second place for the two to disagree.
    broker=settings.CELERY_BROKER_URL or _queue_url(),
    backend=None,
    include=["app.worker", "app.workers.agent_tasks"],
)

# Task routing — booking tasks go to dedicated queue
celery_app.conf.task_routes = {
    # Solver and language-model work: the optimizer worker only. Everything else stays off this queue,
    # so a burst of replans never delays a notification or an email.
    "app.workers.agent_tasks.execute_agent_job_task": {"queue": "optimizer"},
    "app.worker.process_hotel_booking": {"queue": "booking_queue"},
    'app.worker.process_event_task': {'queue': 'event_queue'},
    'app.worker.process_notification_task': {'queue': 'notification_queue'},
}

# Serialization
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]

# Task discovery
celery_app.conf.task_default_queue = "default"

# Result expiry (1 hour)
celery_app.conf.result_expires = 3600

# Long-running agent tasks: one at a time, kill runaway jobs
celery_app.conf.timezone = "UTC"
celery_app.conf.enable_utc = True
celery_app.conf.task_track_started = True
celery_app.conf.worker_prefetch_multiplier = 1
celery_app.conf.task_soft_time_limit = 120
celery_app.conf.task_time_limit = 150
celery_app.conf.task_acks_late = True
celery_app.conf.task_ignore_result = True
# Redis re-delivers a task its worker never acknowledged after this long. The default is one hour,
# so a job lost to a crash would sit idle. Keep it above task_time_limit so live tasks are not repeated.
celery_app.conf.broker_transport_options = {"visibility_timeout": 200}
celery_app.conf.task_reject_on_worker_lost = True


# The outbox dispatcher runs inside the worker: it publishes jobs and delivers announcements that were
# recorded in the database but not delivered straight away (see app/services/outbox_service.py).
from celery.signals import worker_ready, worker_shutdown  # noqa: E402


@worker_ready.connect
def _start_outbox_dispatcher(**_kwargs):
    import os

    if os.getenv("OUTBOX_DISPATCHER", "true").lower() != "false":
        from app.services import outbox_service

        outbox_service.start_dispatcher(float(os.getenv("OUTBOX_POLL_SECONDS", "1")))


@worker_ready.connect
def _start_worker_heartbeat(sender=None, **_kwargs):
    """Tell the API this worker is alive and which queues it serves (app/workers/worker_heartbeat.py)."""
    from app.workers import worker_heartbeat

    try:
        queues = sorted(sender.app.amqp.queues.consume_from.keys()) if sender is not None else []
    except Exception:
        queues = []
    worker_heartbeat.start(getattr(sender, "hostname", None) or "worker", queues)


@worker_shutdown.connect
def _stop_worker_heartbeat(**_kwargs):
    from app.workers import worker_heartbeat

    worker_heartbeat.stop()
