"""
Family Service

Handles family management and preferences.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlmodel import Session, select
from app.core.db import engine
from app.models.family import Family


class FamilyService:
    """Service for managing families."""
    
    @staticmethod
    def create_family(
        family_code: str,
        family_name: str,
        trip_name: Optional[str] = None,
        destination: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        preferences: Optional[dict] = None
    ) -> Family:
        """
        Create a new family.
        
        Args:
            family_code: Unique family code (e.g., "FAM_A")
            family_name: Display name
            trip_name: Optional trip description
            destination: Optional travel destination
            start_date: Optional trip start date
            end_date: Optional trip end date
            preferences: Optional preferences dict
            
        Returns:
            Created Family object
        """
        with Session(engine) as session:
            family = Family(
                family_code=family_code,
                family_name=family_name,
                trip_name=trip_name,
                destination=destination,
                start_date=start_date,
                end_date=end_date,
                preferences=preferences or {},
                is_active=True
            )
            
            session.add(family)
            session.commit()
            session.refresh(family)
            
            return family
    
    @staticmethod
    def get_family(family_id: UUID) -> Optional[Family]:
        """Get a family by ID."""
        with Session(engine) as session:
            return session.get(Family, family_id)
    
    @staticmethod
    def get_family_by_code(family_code: str) -> Optional[Family]:
        """Get a family by code."""
        with Session(engine) as session:
            statement = select(Family).where(Family.family_code == family_code)
            return session.exec(statement).first()
    
    @staticmethod
    def update_current_itinerary(family_id: UUID, itinerary_id: UUID) -> Optional[Family]:
        """Update the current itinerary version for a family."""
        with Session(engine) as session:
            family = session.get(Family, family_id)
            if not family:
                return None
            
            family.current_itinerary_version = itinerary_id
            family.updated_at = datetime.utcnow()
            
            session.add(family)
            session.commit()
            session.refresh(family)
            
            return family
    
    @staticmethod
    def update_preferences(family_id: UUID, preferences: dict) -> Optional[Family]:
        """Update family preferences."""
        with Session(engine) as session:
            family = session.get(Family, family_id)
            if not family:
                return None
            
            family.preferences = preferences
            family.updated_at = datetime.utcnow()
            
            session.add(family)
            session.commit()
            session.refresh(family)
            
            return family
    
    @staticmethod
    def get_all_families(active_only: bool = True) -> List[Family]:
        """Get all families."""
        with Session(engine) as session:
            statement = select(Family)
            if active_only:
                statement = statement.where(Family.is_active == True)
            results = session.exec(statement)
            return list(results.all())
