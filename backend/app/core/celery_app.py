from celery import Celery
from app.core.config import settings

# Celery app with Redis broker and result backend
celery_app = Celery(
    "meiliai_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
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
