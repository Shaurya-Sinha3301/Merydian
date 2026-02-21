from typing import Any
import uuid

from fastapi import APIRouter, HTTPException, Depends
from app.schemas.events import EventCreate, EventResponse, EventStatus
from app.services.event_service import EventService
from app.core.dependencies import get_current_user
from app.schemas.auth import TokenPayload

router = APIRouter()

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
        # Extract user and family context from token
        user_id = uuid.UUID(current_user.sub) if current_user.sub else None
        family_id = uuid.UUID(current_user.family_id) if current_user.family_id else None
        
        # Create event in database
        db_event = EventService.create_event(
            event_data=event,
            user_id=user_id,
            family_id=family_id
        )
        
        print(f"[Event API] Created event: {db_event.event_type} | ID: {db_event.id} | Family: {family_id}")
        
        # Trigger Celery task for async processing
        from app.worker import process_event_task
        process_event_task.delay(str(db_event.id))
        
        return EventResponse(event_id=db_event.id, status=db_event.status)
        
    except Exception as e:
        print(f"[Event API] Error creating event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")

