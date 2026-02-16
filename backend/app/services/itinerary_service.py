"""
Itinerary Service

Handles itinerary versioning and retrieval with real database operations.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlmodel import Session, select
from app.core.db import engine
from app.models.itinerary import Itinerary
from app.models.family import Family
from app.schemas.itinerary import Itinerary as ItinerarySchema


class ItineraryService:
    """Service for managing itineraries with versioning."""
    
    @staticmethod
    def get_current_itinerary(family_id: UUID) -> Optional[dict]:
        """
        Get the current itinerary for a family.
        
        Returns the itinerary data as a dictionary.
        """
        with Session(engine) as session:
            # Get the family
            family = session.get(Family, family_id)
            if not family or not family.current_itinerary_version:
                return None
            
            # Get the current itinerary version
            itinerary = session.get(Itinerary, family.current_itinerary_version)
            if not itinerary:
                return None
            
            return itinerary.data
    
    @staticmethod
    def get_itinerary(itinerary_id: UUID) -> Optional[Itinerary]:
        """Get a specific itinerary by ID."""
        with Session(engine) as session:
            return session.get(Itinerary, itinerary_id)
    
    @staticmethod
    def create_itinerary(
        family_id: UUID,
        itinerary_data: dict,
        created_reason: str = "Initial creation",
        created_by: Optional[str] = None,
        set_as_current: bool = True
    ) -> Itinerary:
        """
        Create a new itinerary version.
        
        Args:
            family_id: Family this itinerary belongs to
            itinerary_data: Complete itinerary data as dict
            created_reason: Reason for creation
            created_by: User ID or "system"
            set_as_current: Whether to set this as the current version
            
        Returns:
            Created Itinerary object
        """
        with Session(engine) as session:
            # Get the current max version for this family
            statement = (
                select(Itinerary)
                .where(Itinerary.family_id == family_id)
                .order_by(Itinerary.version.desc())
                .limit(1)
            )
            latest = session.exec(statement).first()
            new_version = (latest.version + 1) if latest else 1
            
            # Calculate statistics from data
            total_cost = itinerary_data.get('total_cost', 0.0)
            total_satisfaction = itinerary_data.get('total_satisfaction', 0.0)
            duration_days = len(itinerary_data.get('days', []))
            
            # Create new itinerary
            itinerary = Itinerary(
                family_id=family_id,
                version=new_version,
                data=itinerary_data,
                created_reason=created_reason,
                created_by=created_by,
                total_cost=total_cost,
                total_satisfaction=total_satisfaction,
                duration_days=duration_days
            )
            
            session.add(itinerary)
            session.commit()
            session.refresh(itinerary)
            
            # Update family's current itinerary if requested
            if set_as_current:
                family = session.get(Family, family_id)
                if family:
                    family.current_itinerary_version = itinerary.id
                    family.updated_at = datetime.utcnow()
                    session.add(family)
                    session.commit()
            
            return itinerary
    
    @staticmethod
    def get_itinerary_history(family_id: UUID, limit: int = 10) -> List[Itinerary]:
        """Get itinerary version history for a family."""
        with Session(engine) as session:
            statement = (
                select(Itinerary)
                .where(Itinerary.family_id == family_id)
                .order_by(Itinerary.version.desc())
                .limit(limit)
            )
            results = session.exec(statement)
            return list(results.all())
    
    @staticmethod
    def get_latest_version(family_id: UUID) -> Optional[Itinerary]:
        """Get the latest itinerary version for a family."""
        with Session(engine) as session:
            statement = (
                select(Itinerary)
                .where(Itinerary.family_id == family_id)
                .order_by(Itinerary.version.desc())
                .limit(1)
            )
            return session.exec(statement).first()
