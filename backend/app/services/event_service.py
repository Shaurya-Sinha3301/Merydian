"""
Event Service

Handles all database operations for events.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlmodel import Session, select
from app.core.db import engine
from app.models.event import Event, EventType, EventStatus
from app.schemas.events import EventCreate


class EventService:
    """Service for managing events in the database."""
    
    @staticmethod
    def create_event(event_data: EventCreate, user_id: Optional[UUID] = None, family_id: Optional[UUID] = None) -> Event:
        """
        Create a new event in the database.
        
        Args:
            event_data: Event creation data
            user_id: Optional user who created the event
            family_id: Optional family context
            
        Returns:
            Created Event object
        """
        with Session(engine) as session:
            event = Event(
                event_type=event_data.event_type,
                entity_type=event_data.entity_type,
                entity_id=event_data.entity_id,
                payload=event_data.payload if hasattr(event_data, 'payload') else {},
                status=EventStatus.QUEUED,
                source=event_data.source if hasattr(event_data, 'source') else "ui",
                user_id=user_id,
                family_id=family_id,
            )
            
            session.add(event)
            session.commit()
            session.refresh(event)
            
            return event
    
    @staticmethod
    def get_event(event_id: UUID) -> Optional[Event]:
        """Get an event by ID."""
        with Session(engine) as session:
            return session.get(Event, event_id)
    
    @staticmethod
    def update_event_status(
        event_id: UUID, 
        status: EventStatus, 
        processing_result: Optional[dict] = None,
        error_message: Optional[str] = None
    ) -> Optional[Event]:
        """
        Update event processing status.
        
        Args:
            event_id: Event ID to update
            status: New status
            processing_result: Optional processing result data
            error_message: Optional error message if failed
            
        Returns:
            Updated Event object
        """
        with Session(engine) as session:
            event = session.get(Event, event_id)
            if not event:
                return None
            
            event.status = status
            if processing_result:
                event.processing_result = processing_result
            if error_message:
                event.error_message = error_message
            if status in [EventStatus.COMPLETED, EventStatus.FAILED]:
                event.processed_at = datetime.utcnow()
            
            session.add(event)
            session.commit()
            session.refresh(event)
            
            return event
    
    @staticmethod
    def get_events_by_family(family_id: UUID, limit: int = 50) -> List[Event]:
        """Get recent events for a family."""
        with Session(engine) as session:
            statement = (
                select(Event)
                .where(Event.family_id == family_id)
                .order_by(Event.created_at.desc())
                .limit(limit)
            )
            results = session.exec(statement)
            return list(results.all())
    
    @staticmethod
    def get_pending_events(limit: int = 100) -> List[Event]:
        """Get events that are queued for processing."""
        with Session(engine) as session:
            statement = (
                select(Event)
                .where(Event.status == EventStatus.QUEUED)
                .order_by(Event.created_at.asc())
                .limit(limit)
            )
            results = session.exec(statement)
            return list(results.all())
