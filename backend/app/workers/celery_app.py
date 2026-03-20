from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "loan_origination",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Task behavior
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Result expiry: keep results for 24 hours
    result_expires=86400,

    # Worker concurrency
    worker_prefetch_multiplier=1,

    # Beat schedule (periodic tasks)
    beat_schedule={},
)
