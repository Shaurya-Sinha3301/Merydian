from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, field_validator


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
    reported_by: str = Field(default="ui", description="Who reported this event (e.g., traveller, agent)")
    entity_type: str = Field(default="poi", description="Kind of entity the event is about")
    source: str = Field(default="ui", description="Where the event came from")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Time the event occurred")


class EventStatus(str, Enum):
    QUEUED = "queued"
    PROCESSED = "processed"
    FAILED = "failed"


class EventResponse(BaseModel):
    event_id: str
    status: EventStatus

    @field_validator("event_id", mode="before")
    @classmethod
    def _id_to_str(cls, v: Any) -> Any:
        return str(v)

    @field_validator("status", mode="before")
    @classmethod
    def _status_value(cls, v: Any) -> Any:
        # The database stores QUEUED / COMPLETED; the API exposes lowercase names
        # and maps COMPLETED to "processed".
        raw = getattr(v, "value", v)
        raw = str(raw).lower()
        return {"completed": "processed", "processing": "queued"}.get(raw, raw)
