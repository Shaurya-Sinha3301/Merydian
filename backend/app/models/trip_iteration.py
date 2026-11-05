"""
Trip iterations: an append-only record of every optimizer run for a trip.

Each row keeps what went into the optimizer and what came out, so a plan can be traced back to its
inputs and reproduced, and so the optimizer never needs a file on disk to know where a trip stands.
Rows are never edited. Large payloads are compressed by Postgres automatically.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Column, Field, SQLModel


class TripIteration(SQLModel, table=True):
    __tablename__ = "trip_iterations"
    __table_args__ = (
        # One iteration number per trip; a second writer that read the same "latest" is refused here.
        # The index behind this rule also serves "newest iteration for a trip" lookups.
        UniqueConstraint("trip_id", "iteration", name="uq_trip_iterations_trip_iteration"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: str = Field(max_length=255)
    iteration: int
    # initial: first plan for a new trip. replan: after feedback. seed: demo data. backfill: imported from old files.
    kind: str = Field(max_length=20)
    family_id: Optional[str] = Field(default=None, max_length=100)
    job_id: Optional[UUID] = Field(default=None)
    optimizer_ran: bool = Field(default=True)
    input_snapshot: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False))
    result: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
