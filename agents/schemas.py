"""
Pydantic schemas for type-safe event and action structures.
Ensures validation across agent boundaries.
"""
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class EventType(str, Enum):
    """Types of events that can be generated from user feedback."""
    MUST_VISIT_ADDED = "MUST_VISIT_ADDED"
    NEVER_VISIT_ADDED = "NEVER_VISIT_ADDED"
    POI_RATING = "POI_RATING"
    DAY_RATING = "DAY_RATING"
    DELAY_REPORTED = "DELAY_REPORTED"  # Mocked for demo
    TRANSPORT_ISSUE = "TRANSPORT_ISSUE"  # Mocked for demo
    UNKNOWN = "UNKNOWN"


class ConfidenceLevel(str, Enum):
    """Confidence level for parsed events."""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ActionType(str, Enum):
    """Actions that can be taken by the Policy Agent."""
    RUN_OPTIMIZER = "RUN_OPTIMIZER"
    UPDATE_PREFERENCES_ONLY = "UPDATE_PREFERENCES_ONLY"
    NO_ACTION = "NO_ACTION"


class FeedbackEvent(BaseModel):
    """Structured event output from Feedback Agent."""
    agent: str = Field(default="FeedbackAgent", description="Source agent name")
    family_id: Optional[str] = Field(None, description="Family identifier (e.g., FAM_A, FAM_B)")
    event_type: EventType = Field(..., description="Type of event detected")
    poi_id: Optional[str] = Field(None, description="POI identifier if applicable (e.g., LOC_006)")
    poi_name: Optional[str] = Field(None, description="Human-readable POI name")
    rating: Optional[float] = Field(None, ge=0, le=10, description="Rating value if applicable (0-10)")
    day: Optional[int] = Field(None, ge=1, description="Day number if applicable")
    confidence: ConfidenceLevel = Field(..., description="Confidence in the parsing")
    raw_input: str = Field(..., description="Original user input")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")
    
    class Config:
        use_enum_values = True


class PolicyDecision(BaseModel):
    """Decision output from Decision/Policy Agent."""
    agent: str = Field(default="DecisionPolicyAgent", description="Source agent name")
    action: ActionType = Field(..., description="Action to take")
    reason: str = Field(..., description="Explanation for the decision")
    requires_approval: bool = Field(default=False, description="Whether user approval is needed")
    event_context: Optional[FeedbackEvent] = Field(None, description="Original event that triggered decision")
    
    class Config:
        use_enum_values = True


class ExplanationPayload(BaseModel):
    """Input to Explainability Agent (from existing pipeline)."""
    change_type: str = Field(..., description="Type of change (e.g., 'visit_added', 'visit_removed')")
    poi_name: str = Field(..., description="Name of the POI affected")
    day: int = Field(..., description="Day number")
    reason: str = Field(..., description="Reason for the change")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional details")


class AgentExplanation(BaseModel):
    """Output from Explainability Agent."""
    agent: str = Field(default="ExplainabilityAgent", description="Source agent name")
    summary: str = Field(..., description="Human-readable explanation")
    payload_source: Optional[Dict[str, Any]] = Field(None, description="Source payload data")
