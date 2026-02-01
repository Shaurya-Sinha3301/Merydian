from celery import Celery
import os

# Use an environment variable for the broker URL, defaulting to local redis
BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery("meiliai_worker", broker=BROKER_URL)

celery_app.conf.task_routes = {

}
