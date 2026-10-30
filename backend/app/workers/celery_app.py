# Agent tasks share the single Celery app defined in app.core.celery_app so one
# worker process consumes every queue.
from app.core.celery_app import celery_app  # noqa: F401
