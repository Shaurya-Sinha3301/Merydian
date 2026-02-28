from typing import List, Optional, Dict, Literal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

# --- Primitives ---

class TimeWindow(BaseModel):
    start: str = Field(..., description="Start time in HH:MM format", pattern=r"^\d{2}:\d{2}$")
    end: str = Field(..., description="End time in HH:MM format", pattern=r"^\d{2}:\d{2}$")

class Assumptions(BaseModel):
    day_start_time: str
    day_end_time: str
    max_day_minutes: int
    start_end_location: str
    poi_transport_separation: bool

class OptimizationNotes(BaseModel):
    hard_pois_only: bool = True
    # Add other optimization flags here as needed

# --- Itinerary Components ---

class POI(BaseModel):
    sequence: int
    location_id: str
    role: Literal["SKELETON", "BRANCH", "ANCHOR"] # Restricted vocabulary
    planned_visit_time_min: int
    comment: Optional[str] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    # Future: Add verified_status, cost_estimate, etc.

class DayPlan(BaseModel):
    day: int
    start_location: str
    end_location: str
    pois: List[POI]
    
    @property
    def timeline_summary(self) -> str:
        """Helper for debugging/logging"""
        return f"Day {self.day}: {len(self.pois)} stops"

# --- Main Documents ---

class Itinerary(BaseModel):
    """
    The Core Document. Stored as JSONB in Postgres and cached in Redis.
    Structure mirrors 'base_itinerary_clustered.json'.
    """
    itinerary_id: str # Technical ID (e.g., 'FINAL_DELHI_GRAND_TOUR')
    city: str
    assumptions: Assumptions
    days: List[DayPlan]
    optimization_notes: Optional[OptimizationNotes] = None

class ItineraryVersion(BaseModel):
    """
    Wrapper for DB/API responses. Includes metadata not in the JSON blob.
    """
    id: UUID
    family_id: UUID
    version: int
    data: Itinerary
    created_reason: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class Family(BaseModel):
    id: UUID
    name: str
    current_itinerary_version: Optional[UUID]
    
    class Config:
        from_attributes = True
