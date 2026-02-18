"""
Itinerary Database Model

Represents versioned itinerary data for families.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB


class Itinerary(SQLModel, table=True):
    """
    Itinerary model with versioning support.
    
    Each time an itinerary is modified (e.g., through optimization),
    a new version is created. The family points to the current version.
    
    The 'data' field contains the complete itinerary structure as JSON.
    """
    __tablename__ = "itineraries"
    
    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Foreign Keys
    family_id: UUID = Field(foreign_key="families.id", index=True)
    
    # Versioning
    version: int = Field(default=1, index=True)
    
    # Itinerary Data (stored as JSONB)
    # Contains: days, POIs, schedules, costs, satisfaction scores, etc.
    data: dict = Field(sa_column=Column(JSONB))
    
    # Metadata
    created_reason: str = Field(max_length=255)  # e.g., "Initial creation", "User feedback", "Event response"
    created_by: Optional[str] = Field(default=None, max_length=100)  # User ID or "system"
    
    # Statistics (denormalized for quick access)
    total_cost: Optional[float] = Field(default=None)
    total_satisfaction: Optional[float] = Field(default=None)
    duration_days: Optional[int] = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    # Relationships
    # family: Optional["Family"] = Relationship(back_populates="itineraries")
    
    class Config:
        json_schema_extra = {
            "example": {
                "family_id": "uuid-here",
                "version": 2,
                "data": {
                    "days": [
                        {
                            "day": 1,
                            "date": "2026-02-10",
                            "pois": [
                                {
                                    "poi_id": "POI001",
                                    "name": "Red Fort",
                                    "start_time": "09:00",
                                    "end_time": "11:00"
                                }
                            ]
                        }
                    ]
                },
                "created_reason": "User requested to add Akshardham",
                "total_cost": 5000.0,
                "total_satisfaction": 8.5,
                "duration_days": 3
            }
        }
