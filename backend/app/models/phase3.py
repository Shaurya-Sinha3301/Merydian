"""
Tables for notifications, outbound webhooks and the agent's booking ledger.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class Notification(SQLModel, table=True):
    """One notice for one user. Shown in the bell and pushed live over the stream."""

    __tablename__ = "notifications"

    id: int = Field(default=None, primary_key=True)  # increasing, so the stream can resume after the last id
    user_id: UUID = Field(index=True)
    type: str = Field(max_length=60, index=True)
    title: str = Field(max_length=200)
    body: str = Field(default="", max_length=1000)
    link: Optional[str] = Field(default=None, max_length=300)
    data: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    read_at: Optional[datetime] = Field(default=None)


class WebhookEndpoint(SQLModel, table=True):
    """Where an agent wants events sent: any URL, signed with a shared secret."""

    __tablename__ = "webhook_endpoints"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(index=True)
    name: str = Field(max_length=120)
    url: str = Field(max_length=500)
    secret: str = Field(max_length=120)
    format: str = Field(default="json", max_length=20)  # json | slack | discord
    events: List[str] = Field(default_factory=list, sa_column=Column(JSONB))  # empty means every event
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_status: Optional[str] = Field(default=None, max_length=40)
    last_delivery_at: Optional[datetime] = Field(default=None)


class WebhookDelivery(SQLModel, table=True):
    """One attempt to deliver one event to one endpoint."""

    __tablename__ = "webhook_deliveries"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    endpoint_id: UUID = Field(index=True)
    event_type: str = Field(max_length=60)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    ok: bool = Field(default=False)
    status_code: Optional[int] = Field(default=None)
    error: Optional[str] = Field(default=None, max_length=300)
    attempts: int = Field(default=1)
    duration_ms: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class TripBooking(SQLModel, table=True):
    """What the agent actually booked with a supplier for a trip: hotels, flights, transfers, tickets."""

    __tablename__ = "trip_bookings"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    trip_id: str = Field(max_length=100, index=True)
    kind: str = Field(max_length=20)  # hotel | flight | transport | activity | other
    title: str = Field(max_length=200)
    supplier: Optional[str] = Field(default=None, max_length=120)
    reference: Optional[str] = Field(default=None, max_length=80)
    amount: float = Field(default=0.0)
    currency: str = Field(default="INR", max_length=3)
    status: str = Field(default="requested", max_length=20, index=True)  # requested | confirmed | cancelled
    starts_on: Optional[datetime] = Field(default=None)
    ends_on: Optional[datetime] = Field(default=None)
    notes: Optional[str] = Field(default=None, max_length=500)
    created_by: Optional[UUID] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TripNote(SQLModel, table=True):
    """An agent's private note or task on a trip. Never shown to travellers."""

    __tablename__ = "trip_notes"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    trip_id: str = Field(max_length=100, index=True)
    author_id: UUID = Field(index=True)
    author_name: Optional[str] = Field(default=None, max_length=120)
    kind: str = Field(default="note", max_length=10)  # note | task
    text: str = Field(max_length=1000)
    due_on: Optional[datetime] = Field(default=None)
    done: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
