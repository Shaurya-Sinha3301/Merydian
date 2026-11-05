"""
The transactional outbox: things that must happen after a change is saved, written in the same transaction.

A request that creates a job, or a worker that saves a plan, cannot also make Redis, an email provider or a
webhook endpoint commit with the database. So instead of acting directly it writes a row here in the same
transaction. If the transaction commits, the intent is durable; a dispatcher then performs it, retrying
until it succeeds. Each row has a stable event_id so a receiver can recognise a repeat.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Column, Field, SQLModel


class OutboxMessage(SQLModel, table=True):
    __tablename__ = "outbox"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4, unique=True)
    # publish_job | run_task | notify_users | notify_agents | notify_trip_travellers
    kind: str = Field(max_length=40)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False))
    # pending -> in_progress -> sent; or dead after too many failures
    status: str = Field(default="pending", max_length=12, index=True)
    attempts: int = Field(default=0)
    next_attempt_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    locked_at: Optional[datetime] = Field(default=None)
    last_error: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = Field(default=None)
