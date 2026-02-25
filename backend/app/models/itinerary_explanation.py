"""
ItineraryExplanation — DB Model

Stores per-POI LLM-generated explanations produced by the explainability pipeline
whenever an itinerary is updated (optimized or feedback-driven).

Each row answers: "Why was this POI added/removed/rerouted for this family on this day?"
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB


class ItineraryExplanation(SQLModel, table=True):
    """
    Per-POI change explanation produced by the explainability pipeline.

    One row per (trip, family, itinerary version, POI, change_type).
    """
    __tablename__ = "itinerary_explanations"

    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Context
    trip_id: str = Field(index=True, max_length=100)
    family_id: UUID = Field(foreign_key="families.id", index=True)

    # Itinerary versions compared
    itinerary_id: UUID = Field(
        foreign_key="itineraries.id", index=True,
        description="The NEW (post-change) itinerary version"
    )
    prev_itinerary_id: Optional[UUID] = Field(
        default=None,
        description="The OLD itinerary version it was compared against"
    )

    # Change details
    day_number: int = Field(description="Trip day (1-based)")
    poi_id: Optional[str] = Field(
        default=None, max_length=100,
        description="Location ID of the changed POI (null for route-only changes)"
    )
    poi_name: Optional[str] = Field(default=None, max_length=255)
    change_type: str = Field(
        max_length=30,
        description="POI_ADDED | POI_REMOVED | ROUTE_CHANGED"
    )

    # Explainability data (from pipeline)
    causal_tags: Optional[list] = Field(
        default=None, sa_column=Column(JSONB),
        description='e.g. ["INTEREST_VECTOR_DOMINANCE", "SHARED_ANCHOR_REQUIRED"]'
    )
    cost_delta: Optional[dict] = Field(
        default=None, sa_column=Column(JSONB),
        description='e.g. {"extra_cost": 250, "currency": "INR"}'
    )
    satisfaction_delta: Optional[dict] = Field(
        default=None, sa_column=Column(JSONB),
        description='e.g. {"gain": 0.8}'
    )

    # LLM output
    llm_explanation: Optional[str] = Field(
        default=None,
        description="Human-readable 1-2 sentence explanation from Gemini/Groq"
    )

    # Raw payload (for debugging / re-generation)
    raw_payload: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    # Trigger context
    trigger_message: Optional[str] = Field(
        default=None, max_length=1000,
        description="The user feedback message that triggered this optimization"
    )

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
