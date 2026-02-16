"""
Optimizer Service - Manages ML Optimizer Integration and Trip Sessions

This service bridges the backend database with the ML optimizer and agent system.
It handles trip session management, feedback processing, and optimization orchestration.
"""

import logging
import json
from typing import Dict, Any, Optional, List
from uuid import UUID
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager

from sqlmodel import Session
from app.models.trip_session import TripSession
from app.core.db import engine
from app.core.config import settings

logger = logging.getLogger(__name__)


@contextmanager
def get_db_session():
    """Context manager for database sessions"""
    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


class OptimizerService:
    """
    Service for managing ML optimizer integration and trip sessions.
    
    Responsibilities:
    - Create and manage trip sessions
    - Process feedback through agent pipeline
    - Coordinate with ML optimizer
    - Track optimization iterations
    """
    
    @staticmethod
    def create_trip_session(
        trip_id: str,
        family_ids: List[str],
        baseline_itinerary_path: str,
        trip_name: Optional[str] = None
    ) -> TripSession:
        """
        Create a new trip session for agentic optimization.
        
        Args:
            trip_id: Unique identifier for the trip
            family_ids: List of family IDs involved in the trip
            baseline_itinerary_path: Path to the baseline itinerary skeleton
            trip_name: Optional human-readable trip name
            
        Returns:
            Created TripSession instance
        """
        logger.info(f"Creating trip session: {trip_id}")
        
        # Create session storage directory
        session_dir = Path(settings.TRIP_SESSION_STORAGE) / trip_id
        session_dir.mkdir(parents=True, exist_ok=True)
        
        # Create output directory
        output_dir = Path(settings.OPTIMIZER_OUTPUT_DIR) / trip_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create trip session
        trip_session = TripSession(
            trip_id=trip_id,
            family_ids=family_ids,
            baseline_itinerary_path=baseline_itinerary_path,
            trip_name=trip_name,
            session_storage_dir=str(session_dir),
            output_dir=str(output_dir),
            preferences={},
            feedback_history=[]
        )
        
        # Save to database
        with get_db_session() as db:
            db.add(trip_session)
            db.flush()
            db.refresh(trip_session)
            # Expunge to avoid detached instance errors
            db.expunge(trip_session)
        
        logger.info(f"Trip session created: {trip_id}")
        return trip_session
    
    @staticmethod
    def get_trip_session(trip_id: str) -> Optional[TripSession]:
        """
        Get a trip session by trip_id.
        
        Args:
            trip_id: Trip identifier
            
        Returns:
            TripSession or None if not found
        """
        with get_db_session() as db:
            session = db.query(TripSession).filter(TripSession.trip_id == trip_id).first()
            if session:
                # Force load of all JSON/deferred fields before expunging
                _ = session.current_preferences
                _ = session.feedback_history
                _ = session.initial_preferences
                _ = session.preference_history
                _ = session.family_ids
                
                # Expunge from session to avoid detached instance errors
                db.expunge(session)
            return session
    
    @staticmethod
    def update_trip_session(trip_session: TripSession) -> TripSession:
        """
        Update a trip session in the database.
        
        Args:
            trip_session: TripSession instance to update
            
        Returns:
            Updated TripSession
        """
        trip_session.updated_at = datetime.utcnow()
        
        with get_db_session() as db:
            # Use merge for detached instances to properly track changes
            # This creates a NEW attached instance with the data from trip_session
            merged_session = db.merge(trip_session)
            db.commit()
            
            # Refresh to get any DB-side changes (like timestamps)
            db.refresh(merged_session)
            
            # Expunge to return a usable detached instance
            db.expunge(merged_session)
            return merged_session
    
    @staticmethod
    def save_preferences_after_optimization(
        trip_id: str,
        updated_preferences: dict
    ) -> None:
        """
        Save updated preferences to Supabase after optimization.
        
        This is called after the agent pipeline processes feedback
        and updates preferences through the ML optimizer.
        
        Args:
            trip_id: Trip identifier
            updated_preferences: Dictionary of updated family preferences
            
        Raises:
            ValueError: If trip session not found
        """
        trip_session = OptimizerService.get_trip_session(trip_id)
        if not trip_session:
            raise ValueError(f"Trip session {trip_id} not found")
        
        # Update current preferences in Supabase
        trip_session.current_preferences = updated_preferences
        trip_session.last_optimization_at = datetime.utcnow()
        trip_session.iteration_count += 1
        
        # Save to Supabase database
        OptimizerService.update_trip_session(trip_session)
        
        logger.info(
            f"Saved preferences for trip {trip_id}, iteration {trip_session.iteration_count}"
        )

    
    @staticmethod
    def process_feedback_with_agents(
        trip_id: str,
        family_id: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Process user feedback through the agent pipeline.
        
        This is the main integration point between the backend and the agent system.
        
        Args:
            trip_id: Trip identifier
            family_id: Family providing feedback
            message: Natural language feedback message
            
        Returns:
            Dictionary with processing results:
            - success: bool
            - event_type: str
            - action_taken: str
            - explanations: List[str]
            - itinerary_updated: bool
            - iteration: int
            - cost_analysis: Dict (if available)
        """
        logger.info(f"Processing feedback for trip {trip_id}, family {family_id}")
        
        # Get trip session
        trip_session = OptimizerService.get_trip_session(trip_id)
        if not trip_session:
            raise ValueError(f"Trip session not found: {trip_id}")
        
        # Try to import and use FeedbackProcessor
        try:
            # Add project root to path for imports
            import sys
            from pathlib import Path
            project_root = Path(__file__).parent.parent.parent.parent
            if str(project_root) not in sys.path:
                sys.path.insert(0, str(project_root))
            
            from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor
            from ml_or.demos.reopt_hard_constraints.trip_session_manager import TripSessionManager
            
            # Create database-backed session manager adapter
            session_manager = DatabaseSessionManagerAdapter(trip_session)
            
            # Create feedback processor
            processor = FeedbackProcessor()
            
            # Prepare output directory
            output_dir = Path(trip_session.output_dir)
            
            # Process feedback through agent pipeline
            result = processor.process_feedback(
                trip_id=trip_id,
                family_id=family_id,
                message=message,
                session_manager=session_manager,
                output_dir=output_dir
            )
            
            # Update trip session in database
            trip_session = session_manager.get_db_session()
            OptimizerService.update_trip_session(trip_session)
            
            # Extract cost analysis if available
            cost_analysis = None
            if result.get("itinerary_updated"):
                cost_analysis = OptimizerService._extract_cost_analysis(
                    output_dir / trip_id / f"iteration_{result['iteration']}"
                )
            
            return {
                "success": result["success"],
                "event_type": result["event_type"],
                "action_taken": result["action_taken"],
                "explanations": result["explanations"],
                "itinerary_updated": result["itinerary_updated"],
                "iteration": result["iteration"],
                "cost_analysis": cost_analysis,
                "output_dir": result.get("output_dir")
            }
            
        except ImportError as e:
            logger.error(f"Failed to import agent components: {e}")
            logger.warning("Falling back to simple acknowledgment")
            
            # Fallback: Just record the feedback
            trip_session.feedback_history.append({
                "iteration": trip_session.iteration_count,
                "timestamp": datetime.utcnow().isoformat(),
                "family_id": family_id,
                "message": message,
                "event_type": "ACKNOWLEDGED",
                "action": "FALLBACK_MODE"
            })
            OptimizerService.update_trip_session(trip_session)
            
            return {
                "success": True,
                "event_type": "ACKNOWLEDGED",
                "action_taken": "FALLBACK_MODE",
                "explanations": [f"Feedback acknowledged: {message}"],
                "itinerary_updated": False,
                "iteration": trip_session.iteration_count,
                "cost_analysis": None
            }
    
    @staticmethod
    def _extract_cost_analysis(iteration_dir: Path) -> Optional[Dict[str, Any]]:
        """
        Extract cost analysis from optimization results.
        
        Args:
            iteration_dir: Path to iteration output directory
            
        Returns:
            Cost analysis dictionary or None
        """
        try:
            # Load enriched diffs if available
            diffs_path = iteration_dir / "enriched_diffs.json"
            if diffs_path.exists():
                with open(diffs_path, 'r') as f:
                    diffs = json.load(f)
                
                # Extract cost deltas
                cost_changes = []
                for diff in diffs.get("changes", []):
                    if "cost_delta" in diff:
                        cost_changes.append({
                            "poi_name": diff.get("poi_name"),
                            "day": diff.get("day"),
                            "cost_delta": diff["cost_delta"],
                            "reason": diff.get("reason")
                        })
                
                return {
                    "total_cost_change": sum(c["cost_delta"] for c in cost_changes),
                    "changes": cost_changes
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting cost analysis: {e}")
            return None


class DatabaseSessionManagerAdapter:
    """
    Adapter to make TripSession work with FeedbackProcessor.
    
    This adapter bridges the database-backed TripSession model with the
    file-based session manager expected by the FeedbackProcessor.
    """
    
    def __init__(self, trip_session: TripSession):
        self.trip_session = trip_session
    
    def get_session(self, trip_id: str):
        """Return a session-like object for the FeedbackProcessor."""
        class SessionAdapter:
            def __init__(self, db_session):
                self.db_session = db_session
                self.trip_id = db_session.trip_id
                self.baseline_itinerary_path = db_session.baseline_itinerary_path
                self.latest_itinerary_path = db_session.latest_itinerary_path
                self.iteration_count = db_session.iteration_count
                self.preferences = db_session.current_preferences
                self.feedback_history = db_session.feedback_history
            
            def add_feedback(self, text: str, family_id: str, event_type: str):
                """Add feedback to history."""
                self.db_session.feedback_history.append({
                    "iteration": self.iteration_count,
                    "timestamp": datetime.utcnow().isoformat(),
                    "family_id": family_id,
                    "message": text,
                    "event_type": event_type
                })
                self.feedback_history = self.db_session.feedback_history
            
            def update_itinerary(self, new_itinerary_path: str):
                """Update the latest itinerary path."""
                self.db_session.latest_itinerary_path = new_itinerary_path
                self.db_session.iteration_count += 1
                self.latest_itinerary_path = new_itinerary_path
                self.iteration_count = self.db_session.iteration_count
        
        return SessionAdapter(self.trip_session)
    
    def get_latest_itinerary(self, trip_id: str) -> Optional[Path]:
        """Get the path to the latest optimized itinerary."""
        if self.trip_session.latest_itinerary_path:
            return Path(self.trip_session.latest_itinerary_path)
        return Path(self.trip_session.baseline_itinerary_path)
    
    def save_preferences_to_file(self, trip_id: str, file_path: Path):
        """Save current preferences to a file for the optimizer."""
        with open(file_path, 'w') as f:
            json.dump(self.trip_session.current_preferences, f, indent=2)
    
    def update_preferences(self, trip_id: str, family_id: str, event_type: str, poi_id: Optional[str]):
        """Update preferences based on event and track history in Supabase."""
        if family_id not in self.trip_session.current_preferences:
            self.trip_session.current_preferences[family_id] = {
                "must_visit": [],
                "never_visit": [],
                "ratings": {}
            }
        
        family_prefs = self.trip_session.current_preferences[family_id]
        
        # Capture old state for history tracking
        old_must_visit = family_prefs.get("must_visit", []).copy()
        old_never_visit = family_prefs.get("never_visit", []).copy()
        change_recorded = False
        
        if event_type == "MUST_VISIT_ADDED" and poi_id:
            if poi_id not in family_prefs["must_visit"]:
                family_prefs["must_visit"].append(poi_id)
                change_recorded = True
        elif event_type == "NEVER_VISIT_ADDED" and poi_id:
            if poi_id not in family_prefs["never_visit"]:
                family_prefs["never_visit"].append(poi_id)
                change_recorded = True
        
        # Track preference history in Supabase
        if change_recorded:
            history_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "iteration": self.trip_session.iteration_count,
                "family_id": family_id,
                "change_type": event_type,
                "poi_id": poi_id,
                "old_value": {"must_visit": old_must_visit, "never_visit": old_never_visit},
                "new_value": {"must_visit": family_prefs["must_visit"], "never_visit": family_prefs["never_visit"]},
                "trigger": "AGENT_FEEDBACK"
            }
            
            if not hasattr(self.trip_session, 'preference_history') or self.trip_session.preference_history is None:
                self.trip_session.preference_history = []
            
            self.trip_session.preference_history.append(history_entry)
    
    def _save_session(self, session):
        """Called by FeedbackProcessor - we handle this through the trip_session reference."""
        pass  # Changes are already in self.trip_session
    
    def get_db_session(self) -> TripSession:
        """Get the underlying database session for saving."""
        return self.trip_session
