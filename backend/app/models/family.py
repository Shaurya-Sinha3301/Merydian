"""
Family Database Model

Represents family groups traveling together.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB


class Family(SQLModel, table=True):
    """
    Family model representing a traveling group.
    
    Each family has:
    - A unique identifier
    - Members (users)
    - A current itinerary version
    - Travel preferences
    """
    __tablename__ = "families"
    
    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Family Info
    family_code: str = Field(unique=True, index=True, max_length=50)  # e.g., "FAM_A", "FAM_B"
    family_name: str = Field(max_length=255)  # e.g., "Smith Family"
    
    # Itinerary Management
    current_itinerary_version: Optional[UUID] = Field(
        default=None, 
        foreign_key="itineraries.id"
    )
    
    # Trip Details
    trip_name: Optional[str] = Field(default=None, max_length=255)
    destination: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[datetime] = Field(default=None)
    end_date: Optional[datetime] = Field(default=None)
    
    # Preferences (stored as JSON)
    preferences: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    
    # Status
    is_active: bool = Field(default=True)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    # members: list["User"] = Relationship(back_populates="family")
    # itineraries: list["Itinerary"] = Relationship(back_populates="family")
    
    class Config:
        json_schema_extra = {
            "example": {
                "family_code": "FAM_A",
                "family_name": "Smith Family",
                "trip_id": "trip_abc123",
                "destination": "Delhi",
                "preferences": {
                    "must_visit": ["Akshardham"],
                    "never_visit": []
                }
            }
        }
