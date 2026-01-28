from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class InterestVector(BaseModel):
    history: float = Field(..., ge=0.0, le=1.0)
    architecture: float = Field(..., ge=0.0, le=1.0)
    food: float = Field(..., ge=0.0, le=1.0)
    nature: float = Field(..., ge=0.0, le=1.0)
    nightlife: float = Field(..., ge=0.0, le=1.0)
    shopping: float = Field(..., ge=0.0, le=1.0)
    religious: float = Field(..., ge=0.0, le=1.0)

class FamilyProfile(BaseModel):
    family_id: str
    members: int
    children: int
    budget_sensitivity: float = Field(..., ge=0.0, le=1.0)
    interest_vector: InterestVector
    must_visit_locations: List[str] = []
    never_visit_locations: List[str] = []

class FamilyResponse(BaseModel):
    family_id: str = Field(..., description="Unique identifier for the family")
    response: Literal["YES", "NEUTRAL", "NO"] = Field(..., description="Family's vote")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in the response")
    current_satisfaction: float = Field(..., ge=0.0, le=1.0, description="Current satisfaction score")
    delta_satisfaction: float = Field(..., description="Projected change in satisfaction")

class GroupContext(BaseModel):
    remaining_trip_hours: float = Field(..., description="Hours remaining in the trip")
    locked_booking_ratio: float = Field(..., ge=0.0, le=1.0, description="Ratio of locked bookings")
    optimizer_calls_used: int = Field(..., ge=0, description="Number of optimizer calls already used")

class PolicyEvaluationRequest(BaseModel):
    request_id: str = Field(..., description="Unique ID for this interaction")
    requested_location_id: str = Field(..., description="ID of the location being requested")
    origin_family: str = Field(..., description="ID of the family initiating the request")
    family_responses: List[FamilyResponse] = Field(..., description="List of responses from all families")
    family_profiles: List[FamilyProfile] = Field(..., description="Profiles of all families involved")
    location_features: InterestVector = Field(..., description="Features of the requested location")
    group_context: GroupContext = Field(..., description="Contextual constraints")

class PolicyDecisionResponse(BaseModel):
    request_id: str
    decision: Literal["OPTIMIZE", "MANUAL_REVIEW", "REJECT"]
    score: float
    threshold: float
    optimizer_triggered: bool
    explanation: str
