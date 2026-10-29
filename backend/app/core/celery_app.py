from celery import Celery
from app.core.config import settings

# Single Celery app shared by every task module (booking/event/notification
# tasks in app.worker and the agent job tasks in app.workers.agent_tasks).
celery_app = Celery(
    "meiliai_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker", "app.workers.agent_tasks"],
)

# Task routing — booking tasks go to dedicated queue
celery_app.conf.task_routes = {
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
celery_app.conf.task_reject_on_worker_lost = True
