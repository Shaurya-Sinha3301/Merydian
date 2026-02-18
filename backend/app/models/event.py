"""
Event Database Model

Represents events in the system (incidents, feedback, requests).
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from enum import Enum

from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB


class EventType(str, Enum):
    """Types of events that can occur in the system"""
    FLIGHT_DELAY = "FLIGHT_DELAY"
    FLIGHT_CANCELLATION = "FLIGHT_CANCELLATION"
    WEATHER_ALERT = "WEATHER_ALERT"
    POI_REQUEST = "POI_REQUEST"
    FEEDBACK = "FEEDBACK"
    MUST_VISIT_ADDED = "MUST_VISIT_ADDED"
    NEVER_VISIT_ADDED = "NEVER_VISIT_ADDED"
    RATING_PROVIDED = "RATING_PROVIDED"
    ITINERARY_MODIFIED = "ITINERARY_MODIFIED"


class EventStatus(str, Enum):
    """Processing status of an event"""
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Event(SQLModel, table=True):
    """
    Event model for tracking all system events.
    
    Events are created by:
    - External systems (flight delays, weather)
    - Users (feedback, POI requests)
    - Agents (manual interventions)
    - System (automated processes)
    
    Events trigger the agentic pipeline for processing.
    """
    __tablename__ = "events"
    
    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Event Classification
    event_type: EventType = Field(index=True)
    
    # Entity Reference
    entity_type: str = Field(max_length=50)  # e.g., "family", "poi", "booking"
    entity_id: str = Field(max_length=255, index=True)  # UUID or external ID
    
    # Event Data (flexible JSONB storage)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    
    # Processing Status
    status: EventStatus = Field(default=EventStatus.QUEUED, index=True)
    
    # Processing Results
    processing_result: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    error_message: Optional[str] = Field(default=None)
    
    # Source Information
    source: str = Field(max_length=100)  # e.g., "ui", "external_api", "system"
    user_id: Optional[UUID] = Field(default=None, index=True)
    
    # Family Context (if applicable)
    family_id: Optional[UUID] = Field(default=None, foreign_key="families.id", index=True)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    processed_at: Optional[datetime] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "event_type": "POI_REQUEST",
                "entity_type": "poi",
                "entity_id": "POI123",
                "payload": {
                    "poi_name": "Akshardham",
                    "urgency": "high",
                    "message": "We'd love to visit Akshardham!"
                },
                "status": "QUEUED",
                "source": "ui",
                "family_id": "uuid-here",
                "trip_id": "trip_abc123"
            }
        }
