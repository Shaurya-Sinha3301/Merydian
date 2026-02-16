from typing import Any
import uuid

from fastapi import APIRouter, HTTPException
from app.schemas.events import EventCreate, EventResponse, EventStatus

router = APIRouter()

@router.post("/", response_model=EventResponse)
async def create_event(event: EventCreate) -> Any:
    """
    Receive an event from UI or Agents.
    Stores it in the DB (mocked), triggers an async job (mocked), and returns immediately.
    """
    # 1. Generate Event ID
    event_id = f"evt_{uuid.uuid4().hex[:8]}"
    
    # 2. Log reception (Simulating initial processing)
    print(f"[Event API] Received event: {event.event_type} | ID: {event_id} | Entity: {event.entity_id}")

    # 3. Store in DB (Mocked)
    # TODO: Integrate with actual Database
    # db_event = EventModel(**event.dict(), id=event_id, status=EventStatus.QUEUED)
    # session.add(db_event)
    # session.commit()
    print(f"[Event API] (Mock) Stored event {event_id} in DB.")

    # 4. Trigger Celery Task (Mocked)
    # TODO: Integrate with Celery
    # handle_event.delay(event_id)
    print(f"[Event API] (Mock) Triggered Async Celery task for event {event_id}.")
    
    return EventResponse(event_id=event_id, status=EventStatus.QUEUED)
