"""
Preference Service

Handles POI preferences for families.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlmodel import Session, select
from app.core.db import engine
from app.models.preference import Preference, PreferenceType


class PreferenceService:
    """Service for managing family preferences."""
    
    @staticmethod
    def add_preference(
        family_id: UUID,
        poi_id: str,
        poi_name: str,
        preference_type: PreferenceType,
        strength: float = 1.0,
        reason: Optional[str] = None,
        created_by: Optional[str] = None,
        event_id: Optional[UUID] = None
    ) -> Preference:
        """
        Add a new preference for a family.
        
        Args:
            family_id: Family ID
            poi_id: POI identifier
            poi_name: POI display name
            preference_type: Type of preference (MUST_VISIT, NEVER_VISIT, etc.)
            strength: Preference strength (0.0 to 1.0)
            reason: Optional reason for this preference
            created_by: User ID or "system"
            event_id: Optional event that created this preference
            
        Returns:
            Created Preference object
        """
        with Session(engine) as session:
            preference = Preference(
                family_id=family_id,
                poi_id=poi_id,
                poi_name=poi_name,
                preference_type=preference_type,
                strength=strength,
                reason=reason,
                created_by=created_by,
                event_id=event_id,
                is_active=True
            )
            
            session.add(preference)
            session.commit()
            session.refresh(preference)
            
            return preference
    
    @staticmethod
    def get_family_preferences(family_id: UUID, active_only: bool = True) -> List[Preference]:
        """Get all preferences for a family."""
        with Session(engine) as session:
            statement = select(Preference).where(Preference.family_id == family_id)
            if active_only:
                statement = statement.where(Preference.is_active == True)
            results = session.exec(statement)
            return list(results.all())
    
    @staticmethod
    def get_must_visit_pois(family_id: UUID) -> List[str]:
        """Get list of POI IDs that must be visited."""
        with Session(engine) as session:
            statement = select(Preference).where(
                Preference.family_id == family_id,
                Preference.preference_type == PreferenceType.MUST_VISIT,
                Preference.is_active == True
            )
            results = session.exec(statement)
            return [p.poi_id for p in results.all()]
    
    @staticmethod
    def get_never_visit_pois(family_id: UUID) -> List[str]:
        """Get list of POI IDs that should never be visited."""
        with Session(engine) as session:
            statement = select(Preference).where(
                Preference.family_id == family_id,
                Preference.preference_type == PreferenceType.NEVER_VISIT,
                Preference.is_active == True
            )
            results = session.exec(statement)
            return [p.poi_id for p in results.all()]
    
    @staticmethod
    def deactivate_preference(preference_id: UUID) -> Optional[Preference]:
        """Deactivate a preference (soft delete)."""
        with Session(engine) as session:
            preference = session.get(Preference, preference_id)
            if not preference:
                return None
            
            preference.is_active = False
            session.add(preference)
            session.commit()
            session.refresh(preference)
            
            return preference
    
    @staticmethod
    def get_preferences_as_dict(family_id: UUID) -> dict:
        """
        Get family preferences as a dictionary for the optimizer.
        
        Returns dict with:
        {
            "must_visit": ["POI1", "POI2"],
            "never_visit": ["POI3"],
            "prefer_visit": {"POI4": 0.8},
            "avoid_visit": {"POI5": 0.6}
        }
        """
        preferences = PreferenceService.get_family_preferences(family_id, active_only=True)
        
        result = {
            "must_visit": [],
            "never_visit": [],
            "prefer_visit": {},
            "avoid_visit": {}
        }
        
        for pref in preferences:
            if pref.preference_type == PreferenceType.MUST_VISIT:
                result["must_visit"].append(pref.poi_id)
            elif pref.preference_type == PreferenceType.NEVER_VISIT:
                result["never_visit"].append(pref.poi_id)
            elif pref.preference_type == PreferenceType.PREFER_VISIT:
                result["prefer_visit"][pref.poi_id] = pref.strength
            elif pref.preference_type == PreferenceType.AVOID_VISIT:
                result["avoid_visit"][pref.poi_id] = pref.strength
        
        return result
