"""
Idempotency keys: the server's memory of requests it has already handled.

A client sends a random Idempotency-Key with an action and reuses it if it retries the same action. The
first request with a key does the work and its response is saved here. A repeat gets the saved response
instead of doing the work again. The unique rule lets the database decide when two copies arrive together.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Text, UniqueConstraint
from sqlmodel import Column, Field, SQLModel


class IdempotencyKey(SQLModel, table=True):
    __tablename__ = "idempotency_keys"
    __table_args__ = (UniqueConstraint("scope", "endpoint", "key", name="uq_idempotency_scope_endpoint_key"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    # A hash of the caller's credential: keys from one caller never collide with, or reveal, another's
    scope: str = Field(max_length=64)
    endpoint: str = Field(max_length=255)
    key: str = Field(max_length=255)
    # A fingerprint of the request, so a key reused for a different request is refused
    request_hash: str = Field(max_length=64)
    # in_progress while the first request runs, done once its response is saved
    status: str = Field(default="in_progress", max_length=20)
    response_status: Optional[int] = Field(default=None)
    response_type: Optional[str] = Field(default=None, max_length=100)
    response_body: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(index=True)
