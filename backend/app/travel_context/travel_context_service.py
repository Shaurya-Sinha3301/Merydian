import logging
from typing import Dict, Any, List

from app.services.trip_service import TripService
from app.services.family_service import FamilyService
from app.services.preference_service import PreferenceService
from app.services.itinerary_service import ItineraryService
from app.travel_context.schemas import TravelContext

logger = logging.getLogger(__name__)

class TravelContextService:
    @staticmethod
    def build_context(trip_id: str) -> TravelContext:
        """
        Build complete travel context for agents.
        
        Sources:
        - TripSession: trip metadata, family list
        - Family + PreferenceService: per-family preferences (DB SSOT)
        - ItineraryService: current itinerary from DB (via current_itinerary_id)
        - TripSession.feedback_history: audit trail
        """
        # Fetch Trip Session
        trip_session = TripService.get_trip(trip_id)
        if not trip_session:
            raise ValueError(f"Trip not found: {trip_id}")

        # Extract Session data safely
        trip_data = {
            "trip_id": trip_session.trip_id,
            "destination": getattr(trip_session, "destination", ""),
            "start_date": trip_session.start_date.isoformat() if trip_session.start_date else None,
            "end_date": trip_session.end_date.isoformat() if trip_session.end_date else None,
            "iteration_count": trip_session.iteration_count,
        }

        # Fetch Families and their DB-sourced preferences in bulk
        families_data = []
        preferences_data = []
        
        families = FamilyService.get_families_by_codes(trip_session.family_ids)
        family_ids = [fam.id for fam in families]
        
        all_preferences = PreferenceService.get_families_preferences(family_ids)
        # Group preferences by family ID
        prefs_by_family = {}
        for pref in all_preferences:
            prefs_by_family.setdefault(pref.family_id, []).append(pref)
            
        for fam in families:
            families_data.append({
                "family_code": fam.family_code,
                "family_id": str(fam.id),
                "members": fam.preferences.get("members", 1) if fam.preferences else 1,
                "children": fam.preferences.get("children", 0) if fam.preferences else 0,
            })
            
            fam_prefs = prefs_by_family.get(fam.id, [])
            for pref in fam_prefs:
                preferences_data.append({
                    "family_code": fam.family_code,
                    "preference_type": pref.preference_type,
                    "poi_id": pref.poi_id,
                    "poi_name": pref.poi_name,
                    "category": pref.category,
                    "key": pref.key,
                    "value": pref.value,
                    "confidence": pref.confidence,
                    "source": pref.source,
                })

        # Fetch feedback history (audit trail)
        feedback_history = trip_session.feedback_history or []

        # ─── Load current itinerary from DB (not filesystem) ───
        current_itinerary = {}
        if trip_session.current_itinerary_id:
            itin = ItineraryService.get_itinerary(trip_session.current_itinerary_id)
            if itin and itin.data:
                current_itinerary = itin.data
                logger.info(f"Loaded current itinerary v{itin.version} from DB for trip {trip_id}")

        return TravelContext(
            trip_id=trip_id,
            trip_session=trip_data,
            families=families_data,
            preferences=preferences_data,
            feedback_history=feedback_history,
            current_itinerary=current_itinerary,
            constraints=None,
        )
