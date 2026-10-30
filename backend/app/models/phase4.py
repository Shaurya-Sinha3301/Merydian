"""
Tables for messaging, account recovery, agencies, API keys and group money.

Agency and contact details live in side tables (not columns on `users` or `trip_sessions`) so existing
databases pick them up with a plain create_all.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class Agency(SQLModel, table=True):
    __tablename__ = "agencies"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=120, unique=True, index=True)
    join_code: str = Field(max_length=40, unique=True, index=True)  # given to customers and colleagues
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserSettings(SQLModel, table=True):
    """Contact details, agency and how a person wants to hear about things."""

    __tablename__ = "user_settings"

    user_id: UUID = Field(primary_key=True)
    agency_id: Optional[UUID] = Field(default=None, index=True)
    phone: Optional[str] = Field(default=None, max_length=30)
    email_enabled: bool = Field(default=True)
    sms_enabled: bool = Field(default=False)
    email_types: List[str] = Field(default_factory=list, sa_column=Column(JSONB))  # empty means the defaults
    sms_types: List[str] = Field(default_factory=list, sa_column=Column(JSONB))


class TripMeta(SQLModel, table=True):
    """Which agency a trip belongs to. A trip with no row belongs to the shared open desk."""

    __tablename__ = "trip_meta"

    trip_id: str = Field(primary_key=True, max_length=100)
    agency_id: Optional[UUID] = Field(default=None, index=True)


class OutboundMessage(SQLModel, table=True):
    """Every email or text the platform sent, or would send when no provider is configured."""

    __tablename__ = "outbound_messages"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: Optional[UUID] = Field(default=None, index=True)
    channel: str = Field(max_length=10)  # email | sms
    to: str = Field(max_length=200)
    subject: Optional[str] = Field(default=None, max_length=200)
    body: str = Field(max_length=4000)
    kind: str = Field(default="notification", max_length=40)  # notification | reset | invite | test
    status: str = Field(default="queued", max_length=12, index=True)  # queued | sent | logged | failed
    provider: Optional[str] = Field(default=None, max_length=20)
    error: Optional[str] = Field(default=None, max_length=300)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    sent_at: Optional[datetime] = Field(default=None)


class AuthToken(SQLModel, table=True):
    """A one-time link: reset a password, or accept an invitation."""

    __tablename__ = "auth_tokens"

    token_hash: str = Field(primary_key=True, max_length=64)
    user_id: UUID = Field(index=True)
    purpose: str = Field(max_length=10)  # reset | invite
    expires_at: datetime
    used_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApiKey(SQLModel, table=True):
    """A personal key an agent can give to a script or partner instead of a password."""

    __tablename__ = "api_keys"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(index=True)
    name: str = Field(max_length=120)
    prefix: str = Field(max_length=16)
    key_hash: str = Field(max_length=64, unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = Field(default=None)
    revoked_at: Optional[datetime] = Field(default=None)


class Expense(SQLModel, table=True):
    """Something one family paid for that the group shares."""

    __tablename__ = "trip_expenses"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    trip_id: str = Field(max_length=100, index=True)
    paid_by: UUID  # family id
    title: str = Field(max_length=200)
    amount: float = Field(ge=0)
    split_among: List[str] = Field(default_factory=list, sa_column=Column(JSONB))  # family ids; empty means all
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class ChecklistItem(SQLModel, table=True):
    """A shared to-do for a group trip: documents, packing, who brings what."""

    __tablename__ = "trip_checklist"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    trip_id: str = Field(max_length=100, index=True)
    text: str = Field(max_length=300)
    done: bool = Field(default=False)
    added_by: Optional[UUID] = Field(default=None)  # family id
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
