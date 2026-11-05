"""Unhandled errors grouped by type and code location (see app/core/errors.py)."""
from datetime import datetime

from sqlmodel import Field, SQLModel


class ErrorGroup(SQLModel, table=True):
    __tablename__ = "error_groups"

    fingerprint: str = Field(primary_key=True, max_length=32)
    type: str = Field(max_length=120)
    message: str = Field(default="", max_length=500)
    location: str = Field(default="", max_length=300)
    count: int = Field(default=1)
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow, index=True)
    last_request_id: str = Field(default="", max_length=64)
    last_where: str = Field(default="", max_length=200)
