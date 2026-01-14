from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class EventType(str, Enum):
    TRANSPORT_CANCELLED = "TRANSPORT_CANCELLED"
    FLIGHT_DELAY = "FLIGHT_DELAY"
    GATE_CHANGE = "GATE_CHANGE"
    FEEDBACK = "FEEDBACK"
    POI_REQUEST = "POI_REQUEST"
    # Add other event types as needed


class EventCreate(BaseModel):
    event_type: EventType
    entity_id: str = Field(..., description="ID of the entity related to the event (e.g., FLIGHT_123)")
    reported_by: str = Field(..., description="Who reported this event (e.g., traveller, agent)")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Time the event occurred")


class EventStatus(str, Enum):
    QUEUED = "queued"
    PROCESSED = "processed"
    FAILED = "failed"


class EventResponse(BaseModel):
    event_id: str
    status: EventStatus
