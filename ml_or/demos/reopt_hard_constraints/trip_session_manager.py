"""
Trip Session Manager - Session-based state management for itinerary optimization.

This module manages trip state across multiple feedback iterations. It's designed to be
compatible with both file-based storage (demo) and database storage (production).

Usage:
    # Demo (file-based)
    session_manager = TripSessionManager(storage_dir=Path("./output/sessions"))
    session = session_manager.create_session(
        trip_id="trip_123",
        family_ids=["FAM_A", "FAM_B"],
        baseline_prefs=[...]
    )
    
    # Production (database-based)
    session_manager = DatabaseSessionManager(db=mongo_client.db)
"""

from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json


@dataclass
class TripSession:
    """Represents a single trip's state across feedback iterations."""
    trip_id: str
    family_ids: List[str]
    baseline_itinerary_path: str
    current_preferences: List[Dict[str, Any]]
    iteration_count: int = 0
    itinerary_history: List[str] = field(default_factory=list)
    feedback_history: List[Dict[str, Any]] = field(default_factory=list)
    
    def add_feedback(self, text: str, family_id: str, event_type: str):
        """Record feedback for audit trail."""
        self.feedback_history.append({
            "iteration": self.iteration_count,
            "timestamp": datetime.now().isoformat(),
            "family_id": family_id,
            "text": text,
            "event_type": event_type
        })
    
    def update_itinerary(self, itinerary_path: Path):
        """Record new itinerary version."""
        self.itinerary_history.append(str(itinerary_path))
        self.iteration_count += 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TripSession':
        """Create from dictionary."""
        return cls(**data)


class TripSessionManager:
    """
    Manages trip sessions with file-based storage.
    
    For production, subclass this and override _save_session and get_session
    to use database storage instead.
    """
    
    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True, parents=True)
    
    def create_session(
        self, 
        trip_id: str, 
        family_ids: List[str], 
        baseline_prefs: List[Dict[str, Any]],
        baseline_itinerary_path: str = "ml_or/data/base_itinerary_final.json"
    ) -> TripSession:
        """Create a new trip session."""
        session = TripSession(
            trip_id=trip_id,
            family_ids=family_ids,
            baseline_itinerary_path=baseline_itinerary_path,
            current_preferences=baseline_prefs
        )
        self._save_session(session)
        return session
    
    def get_session(self, trip_id: str) -> Optional[TripSession]:
        """Load existing session."""
        session_file = self.storage_dir / f"{trip_id}_session.json"
        if not session_file.exists():
            return None
        
        with open(session_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return TripSession.from_dict(data)
    
    def update_preferences(
        self, 
        trip_id: str, 
        family_id: str, 
        event_type: str, 
        poi_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        Apply preference change to session (cumulative).
        
        This ensures that all previous constraints are preserved.
        For example, if FAM_A adds Akshardham, and then FAM_B excludes
        Lodhi Gardens, both constraints will persist in the preferences.
        """
        session = self.get_session(trip_id)
        if not session:
            raise ValueError(f"No session found for trip_id: {trip_id}")
        
        # Find family in current preferences
        for fam in session.current_preferences:
            if fam['family_id'] == family_id:
                if event_type == "MUST_VISIT_ADDED" and poi_id:
                    if poi_id not in fam.get('must_visit_locations', []):
                        if 'must_visit_locations' not in fam:
                            fam['must_visit_locations'] = []
                        fam['must_visit_locations'].append(poi_id)
                
                elif event_type == "NEVER_VISIT_ADDED" and poi_id:
                    if poi_id not in fam.get('never_visit_locations', []):
                        if 'never_visit_locations' not in fam:
                            fam['never_visit_locations'] = []
                        fam['never_visit_locations'].append(poi_id)
                
                break
        
        self._save_session(session)
        return session.current_preferences
    
    def _save_session(self, session: TripSession):
        """Persist session to file storage."""
        session_file = self.storage_dir / f"{session.trip_id}_session.json"
        
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session.to_dict(), f, indent=2)
    
    def get_latest_itinerary(self, trip_id: str) -> Optional[Path]:
        """Get most recent itinerary for this trip."""
        session = self.get_session(trip_id)
        if not session or not session.itinerary_history:
            return None
        return Path(session.itinerary_history[-1])
    
    def save_preferences_to_file(self, trip_id: str, output_path: Path) -> Path:
        """Save current preferences to a JSON file (for optimizer input)."""
        session = self.get_session(trip_id)
        if not session:
            raise ValueError(f"No session found for trip_id: {trip_id}")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(session.current_preferences, f, indent=2)
        
        return output_path


# Production example (not implemented yet):
# class DatabaseSessionManager(TripSessionManager):
#     """Database-backed session manager for production."""
#     
#     def __init__(self, db):
#         self.db = db
#     
#     def _save_session(self, session: TripSession):
#         self.db.sessions.update_one(
#             {"trip_id": session.trip_id},
#             {"$set": session.to_dict()},
#             upsert=True
#         )
#     
#     def get_session(self, trip_id: str) -> Optional[TripSession]:
#         data = self.db.sessions.find_one({"trip_id": trip_id})
#         if not data:
#             return None
#         data.pop('_id', None)
#         return TripSession.from_dict(data)
