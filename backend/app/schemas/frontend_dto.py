from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Trip & Itinerary Summary ---

class TripSummaryDTO(BaseModel):
    trip_id: str
    trip_name: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str
    iteration_count: int

# --- Timeline ---

class TimelineActivityDTO(BaseModel):
    id: str
    title: str
    location: str
    category: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_min: int
    travel_time_min: int = 0
    travel_mode: Optional[str] = None
    reason_added: Optional[str] = None
    reason_modified: Optional[str] = None
    notes: Optional[str] = None
    warnings: Optional[List[str]] = None

class TimelineDayDTO(BaseModel):
    day: int
    activities: List[TimelineActivityDTO]

class TimelineDTO(BaseModel):
    trip_id: str
    days: List[TimelineDayDTO]

# --- Async Workflow / Jobs ---

class JobDTO(BaseModel):
    job_id: str
    status: str
    current_stage: str
    progress_percentage: int
    description: str
    created_at: str
    updated_at: str
    estimated_remaining_seconds: Optional[int] = None
    result_available: bool = False

# --- Explainability ---

class ExplanationDTO(BaseModel):
    id: str
    day: Optional[int] = None
    activity_changed: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: str
    affected_constraints: List[str] = []
    confidence: float
    human_explanation: str
    change_type: Optional[str] = None
    cost_delta: Optional[Dict[str, Any]] = None
    satisfaction_delta: Optional[Dict[str, Any]] = None
    trigger_message: Optional[str] = None
    itinerary_id: Optional[str] = None

# --- Diff API ---

class DiffItemDTO(BaseModel):
    before: Optional[Any] = None
    after: Optional[Any] = None
    reason: Optional[str] = None
    importance: str = "medium"
    affected_constraints: List[str] = []

class DiffDTO(BaseModel):
    trip_id: str
    version_a: int
    version_b: int
    added_activities: List[DiffItemDTO] = []
    removed_activities: List[DiffItemDTO] = []
    moved_activities: List[DiffItemDTO] = []
    time_changes: List[DiffItemDTO] = []
    hotel_changes: List[DiffItemDTO] = []
    transport_changes: List[DiffItemDTO] = []
    summary: Optional[str] = None
    cost_delta: Optional[float] = None
    satisfaction_delta: Optional[float] = None
