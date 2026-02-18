"""
Preference Database Model

Represents family preferences for POIs and activities.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from enum import Enum

from sqlmodel import Field, SQLModel


class PreferenceType(str, Enum):
    """Types of preferences"""
    MUST_VISIT = "MUST_VISIT"
    NEVER_VISIT = "NEVER_VISIT"
    PREFER_VISIT = "PREFER_VISIT"
    AVOID_VISIT = "AVOID_VISIT"


class Preference(SQLModel, table=True):
    """
    Preference model for tracking family POI preferences.
    
    Preferences can be:
    - MUST_VISIT: Hard constraint, must be included
    - NEVER_VISIT: Hard constraint, must be excluded
    - PREFER_VISIT: Soft preference, nice to have
    - AVOID_VISIT: Soft preference, prefer not to have
    """
    __tablename__ = "preferences"
    
    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Foreign Keys
    family_id: UUID = Field(foreign_key="families.id", index=True)
    
    # POI Reference
    poi_id: str = Field(max_length=100, index=True)
    poi_name: str = Field(max_length=255)
    
    # Preference Details
    preference_type: PreferenceType = Field(index=True)
    
    # Strength (for soft preferences)
    strength: Optional[float] = Field(default=1.0)  # 0.0 to 1.0
    
    # Metadata
    reason: Optional[str] = Field(default=None)  # Why this preference exists
    created_by: Optional[str] = Field(default=None, max_length=100)  # User ID or "system"
    
    # Context
    event_id: Optional[UUID] = Field(default=None, foreign_key="events.id")
    
    # Status
    is_active: bool = Field(default=True, index=True)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    expires_at: Optional[datetime] = Field(default=None)  # For temporary preferences
    
    class Config:
        json_schema_extra = {
            "example": {
                "family_id": "uuid-here",
                "poi_id": "POI123",
                "poi_name": "Akshardham",
                "preference_type": "MUST_VISIT",
                "strength": 1.0,
                "reason": "User requested via feedback",
                "trip_id": "trip_abc123",
                "is_active": True
            }
        }
