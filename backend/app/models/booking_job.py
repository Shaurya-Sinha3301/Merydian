"""
Booking Job Database Model

Represents an async booking job triggered by an agent.
Tracks the overall status of a booking request across multiple items.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL_FAILURE = "partial_failure"
    FAILED = "failed"


class BookingJob(SQLModel, table=True):
    """
    Tracks an async booking job.

    When an agent executes a booking, a job record is created here,
    and a Celery task is dispatched to process it in the background.
    """
    __tablename__ = "booking_jobs"

    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # References
    itinerary_id: str = Field(index=True, max_length=255)
    agent_id: str = Field(index=True, max_length=255)

    # Status
    status: str = Field(default=JobStatus.PENDING.value, max_length=50, index=True)

    # Booking items requested (e.g. ["hotel", "flight"])
    items_requested: list = Field(default=[], sa_column=Column(JSONB))

    # Results per item (updated as each completes)
    items_completed: dict = Field(default={}, sa_column=Column(JSONB))

    # Error tracking
    error_message: Optional[str] = Field(default=None, max_length=2000)

    # Celery task tracking
    celery_task_id: Optional[str] = Field(default=None, max_length=255)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
