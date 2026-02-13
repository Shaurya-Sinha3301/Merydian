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

from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class TransportDisruption:
    """Represents a transport disruption that marks edges as unavailable"""
    disruption_id: str
    
    # What's affected (at least one must be specified)
    affected_edges: Optional[List[str]] = None  # Specific edge IDs
    affected_modes: Optional[List[str]] = None  # e.g., ["METRO"]
    affected_locations: Optional[Tuple[str, str]] = None  # (from_loc, to_loc), "*" = wildcard
    
    # When (all optional - None means immediate/indefinite)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    start_day: Optional[int] = None  # 0-indexed
    end_day: Optional[int] = None
    
    # Metadata
    reason: str = "UNKNOWN"  # "STRIKE", "WEATHER", "MAINTENANCE", "ACCIDENT"
    severity: str = "MODERATE"  # "MINOR", "MODERATE", "SEVERE"
    active: bool = True
    reported_at: datetime = field(default_factory=datetime.now)


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
    
    # Trip State Tracking (NEW)
    current_day: Optional[int] = None  # 0-indexed, None = pre-trip
    current_time_minutes: Optional[int] = None  # Minutes since midnight, None = start of day
    trip_status: str = "PLANNING"  # "PLANNING", "IN_PROGRESS", "COMPLETED"
    total_days: int = 3  # Total trip duration
    
    # Transport Disruptions (NEW)
    active_disruptions: List[TransportDisruption] = field(default_factory=list)
    
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
    
    def get_candidate_days(
        self,
        constraint: str = "all_future",
        before_day: Optional[int] = None
    ) -> List[int]:
        """
        Calculate candidate days based on current trip state.
        
        Args:
            constraint: Type of constraint
                - "all_future": All days after current_day
                - "current_and_future": Current day + future
                - "before_day_N": All days up to before_day (exclusive)
            before_day: For "before_day_N" constraint (1-indexed)
        
        Returns:
            List of candidate day indices (0-indexed)
        
        Examples:
            # Pre-trip planning, "before Day 3"
            current_day = None, constraint = "before_day_N", before_day = 3
            → [0, 1]  # Days 1 and 2
            
            # Mid-trip, Day 2
            current_day = 1, constraint = "current_and_future"
            → [1, 2]  # Days 2 and 3
        """
        if self.trip_status == "PLANNING":
            # Pre-trip: all days are candidates
            if constraint == "before_day_N" and before_day:
                return list(range(before_day - 1))  # Convert to 0-indexed
            else:
                return list(range(self.total_days))
        
        elif self.trip_status == "IN_PROGRESS":
            # Mid-trip: only current + future days
            if self.current_day is None:
                self.current_day = 0  # Safety default
            
            if constraint == "all_future":
                return list(range(self.current_day + 1, self.total_days))
            
            elif constraint == "current_and_future":
                return list(range(self.current_day, self.total_days))
            
            elif constraint == "before_day_N" and before_day:
                # Candidate days: [current_day, before_day)
                max_day = min(before_day - 1, self.total_days)
                return list(range(self.current_day, max_day))
            
            else:
                return list(range(self.current_day, self.total_days))
        
        else:  # COMPLETED
            return []
    
    def advance_to_day(self, day_index: int, time_minutes: int = 0):
        """
        Update trip state to a specific day and time.
        
        Args:
            day_index: Day to advance to (0-indexed)
            time_minutes: Time of day in minutes since midnight (default: 0)
        
        Example:
            session.advance_to_day(1, 960)  # Day 2, 16:00
        """
        self.current_day = day_index
        self.current_time_minutes = time_minutes
        
        if self.trip_status == "PLANNING":
            self.trip_status = "IN_PROGRESS"
        
        if day_index >= self.total_days - 1:
            self.trip_status = "COMPLETED"
    
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
    
    def start_trip(self, trip_id: str, start_day: int = 0, start_time_minutes: int = 0):
        """Mark trip as started and set initial state."""
        session = self.get_session(trip_id)
        if not session:
            raise ValueError(f"No session found for trip_id: {trip_id}")
        
        session.advance_to_day(start_day, start_time_minutes)
        self._save_session(session)
    
    def update_trip_time(self, trip_id: str, day_index: int, time_minutes: int):
        """Update current trip position (called when time advances)."""
        session = self.get_session(trip_id)
        if not session:
            raise ValueError(f"No session found for trip_id: {trip_id}")
        
        session.advance_to_day(day_index, time_minutes)
        self._save_session(session)
    
    # ========================================================================
    # TRANSPORT DISRUPTION MANAGEMENT (NEW)
    # ========================================================================
    
    def add_disruption(
        self,
        trip_id: str,
        disruption: TransportDisruption
    ) -> None:
        """Record a transport disruption for this trip"""
        session = self.get_session(trip_id)
        if not session:
            raise ValueError(f"No session found for trip_id: {trip_id}")
        
        session.active_disruptions.append(disruption)
        self._save_session(session)
        
        logger.info(f"Disruption added: {disruption.disruption_id}")
        logger.info(f"  - Reason: {disruption.reason}")
        logger.info(f"  - Severity: {disruption.severity}")
    
    def get_active_disruptions(
        self,
        trip_id: str,
        current_day: Optional[int] = None,
        current_time: Optional[datetime] = None
    ) -> List[TransportDisruption]:
        """Get currently active disruptions (time-filtered)"""
        session = self.get_session(trip_id)
        if not session:
            return []
        
        active = []
        for d in session.active_disruptions:
            if not d.active:
                continue
            
            # Check time bounds
            if current_time:
                if d.start_time and current_time < d.start_time:
                    continue
                if d.end_time and current_time > d.end_time:
                    continue
            
            # Check day bounds
            if current_day is not None:
                if d.start_day is not None and current_day < d.start_day:
                    continue
                if d.end_day is not None and current_day > d.end_day:
                    continue
            
            active.append(d)
        
        return active
    
    def clear_expired_disruptions(self, trip_id: str) -> int:
        """Remove expired disruptions, return count removed"""
        session = self.get_session(trip_id)
        if not session:
            return 0
        
        now = datetime.now()
        original_count = len(session.active_disruptions)
        
        session.active_disruptions = [
            d for d in session.active_disruptions
            if d.end_time is None or d.end_time > now
        ]
        
        removed = original_count - len(session.active_disruptions)
        if removed > 0:
            self._save_session(session)
            logger.info(f"Cleared {removed} expired disruptions")
        
        return removed
    
    def update_transport_availability(
        self,
        trip_id: str,
        transport_graph_path: str,
        output_path: str
    ) -> str:
        """
        Update transport graph with availability flags based on active disruptions.
        
        In production: This would be a database UPDATE query instead of file rewrite.
        
        Returns: Path to updated transport graph
        """
        session = self.get_session(trip_id)
        if not session:
            return transport_graph_path
        
        # Get active disruptions
        disruptions = self.get_active_disruptions(
            trip_id,
            current_day=session.current_day,
            current_time=datetime.now() if session.current_time_minutes else None
        )
        
        if not disruptions:
            # No disruptions - ensure all edges are available
            return self._ensure_all_available(transport_graph_path, output_path)
        
        # Load transport graph
        with open(transport_graph_path, 'r', encoding='utf-8') as f:
            graph = json.load(f)
        
        # Update availability flags
        unavailable_count = 0
        for edge in graph:
            # Initialize 'available' field if missing (backward compatibility)
            if 'available' not in edge:
                edge['available'] = True
            
            # Check if edge is disrupted
            if self._is_edge_disrupted(edge, disruptions):
                if edge['available']:  # Only count if changing
                    unavailable_count += 1
                edge['available'] = False
            else:
                edge['available'] = True  # Restore if disruption expired
        
        # Save updated graph
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(graph, f, indent=2)
        
        logger.info(f"Updated transport availability: {unavailable_count} edges marked unavailable")
        logger.info(f"  Active disruptions: {len(disruptions)}")
        logger.info(f"  Saved to: {output_path}")
        
        return output_path
    
    def _ensure_all_available(self, input_path: str, output_path: str) -> str:
        """Set all edges to available=true (disruptions cleared)"""
        with open(input_path, 'r', encoding='utf-8') as f:
            graph = json.load(f)
        
        for edge in graph:
            edge['available'] = True
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(graph, f, indent=2)
        
        return output_path
    
    def _is_edge_disrupted(
        self,
        edge: Dict[str, Any],
        disruptions: List[TransportDisruption]
    ) -> bool:
        """Check if an edge is affected by any active disruption"""
        for d in disruptions:
            # Check by edge ID
            if d.affected_edges and edge['edge_id'] in d.affected_edges:
                return True
            
            # Check by mode
            if d.affected_modes and edge['mode'] in d.affected_modes:
                return True
            
            # Check by locations
            if d.affected_locations:
                from_loc, to_loc = d.affected_locations
                if (from_loc == "*" or from_loc == edge['from']) and \
                   (to_loc == "*" or to_loc == edge['to']):
                    return True
        
        return False


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
