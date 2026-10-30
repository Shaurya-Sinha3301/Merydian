from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class IntentScope(str, Enum):
    GLOBAL_TRIP = "GLOBAL_TRIP"
    SPECIFIC_DAY = "SPECIFIC_DAY"
    SPECIFIC_LOCATION = "SPECIFIC_LOCATION"


class IntentType(str, Enum):
    PACE_CHANGE = "PACE_CHANGE"
    BUDGET_CHANGE = "BUDGET_CHANGE"
    HOTEL_CHANGE = "HOTEL_CHANGE"
    LOCATION_CHANGE = "LOCATION_CHANGE"
    ACTIVITY_CHANGE = "ACTIVITY_CHANGE"
    ACCESSIBILITY_CHANGE = "ACCESSIBILITY_CHANGE"
    TIME_CHANGE = "TIME_CHANGE"


class TravelIntent(BaseModel):
    intent_type: IntentType
    target: Optional[str] = None
    strength: float = 1.0
    family_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    scope: IntentScope = IntentScope.GLOBAL_TRIP
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TravelConstraint(BaseModel):
    hard_constraints: Dict[str, Any] = Field(default_factory=dict, description="e.g., must_visit, never_visit, maximum_budget")
    soft_constraints: Dict[str, Any] = Field(default_factory=dict, description="e.g., hotel_quality, activity_style, pace")


class TravelContext(BaseModel):
    trip_id: str
    trip_session: Dict[str, Any] = Field(default_factory=dict)
    families: List[Dict[str, Any]] = Field(default_factory=list)
    preferences: List[Dict[str, Any]] = Field(default_factory=list)
    feedback_history: List[Dict[str, Any]] = Field(default_factory=list)
    current_itinerary: Dict[str, Any] = Field(default_factory=dict)
    constraints: Optional[TravelConstraint] = None
