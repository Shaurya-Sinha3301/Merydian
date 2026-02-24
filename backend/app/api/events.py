from typing import Any, List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from app.schemas.events import EventCreate, EventResponse, EventStatus
from app.services.event_service import EventService
from app.core.dependencies import get_current_user, get_current_agent
from app.schemas.auth import TokenPayload

router = APIRouter()


class EventDetail(BaseModel):
    event_id: str
    event_type: str
    status: str
    payload: dict
    created_at: str
    family_id: Optional[str] = None


@router.post("/", response_model=EventResponse)
async def create_event(
    event: EventCreate,
    current_user: TokenPayload = Depends(get_current_user)
) -> Any:
    """
    Receive an event from UI or Agents.
    Stores it in the DB and triggers async processing.
    """
    try:
        user_id = uuid.UUID(current_user.sub) if current_user.sub else None
        family_id = uuid.UUID(current_user.family_id) if current_user.family_id else None

        db_event = EventService.create_event(
            event_data=event,
            user_id=user_id,
            family_id=family_id
        )

        print(f"[Event API] Created event: {db_event.event_type} | ID: {db_event.id} | Family: {family_id}")

        from app.worker import process_event_task
        process_event_task.delay(str(db_event.id))

        return EventResponse(event_id=db_event.id, status=db_event.status)

    except Exception as e:
        print(f"[Event API] Error creating event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")


@router.get("/", response_model=List[EventDetail])
async def list_family_events(
    family_id: str = Query(..., description="Family UUID to filter events"),
    limit: int = Query(default=50, ge=1, le=200),
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    List recent events for a family (agent view only).

    Used by the agent dashboard CustomerSuggestionsPanel to display
    customer feedback without relying on localStorage.
    """
    try:
        fam_uuid = uuid.UUID(family_id)
        events = EventService.get_events_by_family(fam_uuid, limit=limit)
        return [
            EventDetail(
                event_id=str(e.id),
                event_type=e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type),
                status=e.status.value if hasattr(e.status, "value") else str(e.status),
                payload=e.payload or {},
                created_at=e.created_at.isoformat() if e.created_at else "",
                family_id=str(e.family_id) if e.family_id else None,
            )
            for e in events
        ]
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid family_id UUID: {family_id}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list events: {str(e)}")
