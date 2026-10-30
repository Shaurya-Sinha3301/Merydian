"""
Trip Session Database Model

Manages state for agentic itinerary optimization sessions.
Tracks preferences, feedback history, and optimization iterations.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB


class TripSession(SQLModel, table=True):
    """
    Trip session model for managing agentic optimization state.
    
    Each trip session tracks:
    - Cumulative user preferences
    - Feedback history across iterations
    - Current and baseline itineraries
    - Optimization metadata
    """
    __tablename__ = "trip_sessions"
    
    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Trip Identifier (unique)
    trip_id: str = Field(unique=True, index=True, max_length=100)
    
    # Trip Details
    destination: Optional[str] = Field(default=None, max_length=200)
    start_date: Optional[datetime] = Field(default=None)
    end_date: Optional[datetime] = Field(default=None)
    
    # Related family/families
    family_ids: list = Field(sa_column=Column(JSONB))  # List of family UUIDs
    
    # ─── Current Itinerary (DB-based, replaces filesystem paths) ───
    current_itinerary_id: Optional[UUID] = Field(
        default=None,
        foreign_key="itineraries.id",
        description="FK to the current active Itinerary for this trip"
    )
    
    # ─── DEPRECATED: Filesystem paths (kept for migration, will be removed) ───
    # These fields are superseded by current_itinerary_id and Itinerary.data JSONB.
    baseline_itinerary_path: Optional[str] = Field(default=None, max_length=500)  # DEPRECATED
    latest_itinerary_path: Optional[str] = Field(default=None, max_length=500)  # DEPRECATED
    
    # Optimization State
    iteration_count: int = Field(default=0)
    last_optimization_at: Optional[datetime] = Field(default=None)
    
    # ─── DEPRECATED: Preference JSONB columns ───
    # The Preference table (via PreferenceService) is now the single source of truth.
    # These fields are retained temporarily for backward compatibility.
    initial_preferences: dict = Field(default_factory=dict, sa_column=Column(JSONB))  # DEPRECATED
    current_preferences: dict = Field(default_factory=dict, sa_column=Column(JSONB))  # DEPRECATED
    
    # Feedback History (JSON) — retained as audit trail
    # Format: [{iteration, timestamp, family_id, message, event_type, action}]
    feedback_history: list = Field(default_factory=list, sa_column=Column(JSONB))
    
    # Preference History (JSON) - Tracks all preference changes — retained as audit trail
    # Format: [{timestamp, iteration, family_id, change_type, poi_id, old_value, new_value, trigger}]
    preference_history: list = Field(default_factory=list, sa_column=Column(JSONB))
    
    # Metadata
    trip_name: Optional[str] = Field(default=None, max_length=200)
    status: str = Field(default="active", max_length=50)  # active, completed, archived
    
    # ─── DEPRECATED: Storage Paths ───
    session_storage_dir: Optional[str] = Field(default=None, max_length=500)  # DEPRECATED
    output_dir: Optional[str] = Field(default=None, max_length=500)  # DEPRECATED
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "trip_id": "delhi_3day_fam123",
                "family_ids": ["uuid1", "uuid2"],
                "baseline_itinerary_path": "ml_or/data/delhi_3day_skeleton.json",
                "latest_itinerary_path": "trip_sessions/delhi_3day_fam123/iteration_2/optimized_solution.json",
                "iteration_count": 2,
                "preferences": {
                    "FAM_A": {
                        "must_visit": ["LOC_006"],
                        "never_visit": ["LOC_013"],
                        "ratings": {"DAY_1": 4}
                    }
                },
                "feedback_history": [
                    {
                        "iteration": 1,
                        "timestamp": "2026-02-03T01:00:00Z",
                        "family_id": "FAM_A",
                        "message": "We loved Akshardham!",
                        "event_type": "MUST_VISIT_ADDED",
                        "action": "RUN_OPTIMIZER"
                    }
                ],
                "trip_name": "Delhi Family Tour",
                "status": "active"
            }
        }
