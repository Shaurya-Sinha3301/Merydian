"""
Preference History Models

Tracks all changes to user preferences across optimization iterations.
Provides audit trail for preference evolution.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class PreferenceChange(BaseModel):
    """
    Single preference change record.
    
    Captures a single modification to family preferences
    with timestamp, context, and before/after values.
    """
    timestamp: datetime
    iteration: int
    family_id: str
    change_type: str  # MUST_VISIT_ADDED, NEVER_VISIT_ADDED, MUST_VISIT_REMOVED, etc.
    poi_id: Optional[str] = None
    field_name: Optional[str] = None  # For non-POI changes like budget_sensitivity
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    trigger: str  # "AGENT_FEEDBACK", "MANUAL_EDIT", "SYSTEM_INIT"
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
