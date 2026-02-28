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
    def _get_expanded_family_preferences(family_id: str, db_prefs: Optional[dict] = None) -> dict:
        """
        Merge fallback preferences (from JSON) with dynamic DB preferences.
        Expected properties for FamilyPreference: members, children, budget_sensitivity, energy_level, interest_vector
        """
        import os
        from pathlib import Path
        import json
        
        # 1. Base default fallback
        merged = {
            "family_id": family_id,
            "members": 2,
            "children": 0,
            "budget_sensitivity": 0.5,
            "energy_level": 0.5,
            "interest_vector": {},
            "must_visit_locations": [],
            "never_visit_locations": []
        }
        
        # 2. Extract from JSON file
        try:
            fallback_path = Path(__file__).parent.parent.parent.parent / "ml_or" / "data" / "family_preferences_3fam_strict.json"
            if fallback_path.exists():
                with open(fallback_path, 'r') as f:
                    fallback_data = json.load(f)
                    for fam in fallback_data:
                        if fam.get("family_id") == family_id:
                            for key in ["members", "children", "budget_sensitivity", "energy_level", "interest_vector", "must_visit_locations", "never_visit_locations"]:
                                if key in fam:
                                    merged[key] = fam[key]
                            break
        except Exception as e:
            logger.warning(f"Could not load fallback preferences: {e}")
            
        # 3. Override with database preferences if any
        if db_prefs:
            for key in ["members", "children", "budget_sensitivity", "energy_level", "interest_vector", "must_visit_locations", "never_visit_locations"]:
                if key in db_prefs:
                    merged[key] = db_prefs[key]
                    
        return merged

    @staticmethod
    def run_initial_optimization(
        trip_id: str,
        baseline_path: str,
        preferences: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Run the ML optimizer's first iteration (iteration 0) to generate a
        base itinerary from the baseline skeleton + family preferences.

        Args:
            trip_id: Trip identifier
            baseline_path: Path to baseline itinerary JSON
            preferences: Optimizer-formatted family preferences dict

        Returns:
            Dictionary with:
            - itinerary_data: The optimized (or raw baseline) itinerary dict
            - cost: Estimated total cost
            - satisfaction: Predicted satisfaction score (0-1)
            - optimizer_ran: Whether the ML optimizer actually ran
        """
        logger.info(f"Running initial optimization for trip {trip_id}")

        # Load baseline itinerary
        baseline_data: Dict[str, Any] = {}
        try:
            with open(baseline_path, "r") as f:
                baseline_data = json.load(f)
        except FileNotFoundError:
            logger.error(f"Baseline itinerary not found: {baseline_path}")
            raise ValueError(f"Baseline itinerary file not found: {baseline_path}")

        # Try to run the ML optimizer
        try:
            import sys
            project_root = Path(__file__).parent.parent.parent.parent
            if str(project_root) not in sys.path:
                sys.path.insert(0, str(project_root))

            from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor

            # Prepare output dir for this run
            output_dir = Path(settings.OPTIMIZER_OUTPUT_DIR) / trip_id / "iteration_0"
            output_dir.mkdir(parents=True, exist_ok=True)

            # Convert preferences dict to the list format the optimizer expects
            pref_list = []
            for fam_id, fam_prefs in preferences.items():
                expanded = OptimizerService._get_expanded_family_preferences(fam_id, fam_prefs)
                
                entry = {
                    "family_id": fam_id,
                    "members": expanded.get("members", 2),
                    "children": expanded.get("children", 0),
                    "budget_sensitivity": expanded.get("budget_sensitivity", 0.5),
                    "energy_level": expanded.get("energy_level", 0.5),
                    "interest_vector": expanded.get("interest_vector", {}),
                    "must_visit_locations": fam_prefs.get("must_visit_locations", expanded.get("must_visit_locations", [])),
                    "never_visit_locations": fam_prefs.get("never_visit_locations", expanded.get("never_visit_locations", []))
                }
                pref_list.append(entry)

            # Write preferences file for the optimizer
            prefs_file = output_dir / "preferences.json"
            with open(prefs_file, "w") as f:
                json.dump(pref_list, f, indent=2)

            # Run optimizer via FeedbackProcessor
            processor = FeedbackProcessor()
            family_ids = list(preferences.keys())
            result = processor.run_optimizer(
                baseline_path=str(baseline_path),
                preferences_path=str(prefs_file),
                output_dir=str(output_dir),
                family_ids=family_ids,
            )

            optimized_path = output_dir / "optimized_itinerary.json"
            if optimized_path.exists():
                with open(optimized_path, "r") as f:
                    optimized_data = json.load(f)

                cost = optimized_data.get("total_cost", 0.0)
                satisfaction = optimized_data.get("total_satisfaction", 0.0)

                logger.info(f"ML optimizer succeeded for trip {trip_id}")
                return {
                    "itinerary_data": optimized_data,
                    "cost": cost,
                    "satisfaction": min(satisfaction, 1.0),
                    "optimizer_ran": True,
                }

            # Optimizer ran but no output file – fall through to baseline
            logger.warning("Optimizer ran but produced no output file, using baseline")

        except ImportError as e:
            logger.warning(f"ML optimizer not available ({e}), using raw baseline")
        except Exception as e:
            logger.error(f"ML optimizer failed ({e}), falling back to baseline")

        # Fallback: return the raw baseline as-is
        cost = baseline_data.get("total_cost", 0.0)
        num_pois = sum(len(day.get("pois", [])) for day in baseline_data.get("days", []))
        satisfaction = min(0.5 + num_pois * 0.02, 1.0)  # rough heuristic

        return {
            "itinerary_data": baseline_data,
            "cost": cost,
            "satisfaction": satisfaction,
            "optimizer_ran": False,
        }

    @staticmethod
    def process_feedback_with_agents(
        trip_id: str,
        family_id: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Process user feedback through the explainability pipeline.

        Flow:
          1. Load the latest + previous itinerary versions for the family from DB
          2. Run FeedbackProcessor.process_feedback() (DiffEngine → CausalTagger
             → DeltaEngine → PayloadBuilder → LLM)
          3. Persist per-POI explanations via ExplanationService
          4. Update the trip session feedback history

        Returns dict with success, action_taken, explanations, itinerary_updated.
        """
        logger.info(f"Processing feedback for trip {trip_id}, family {family_id}")

        # Get trip session
        trip_session = OptimizerService.get_trip_session(trip_id)
        if not trip_session:
            raise ValueError(f"Trip session not found: {trip_id}")

        try:
            from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor
            from app.services.itinerary_service import ItineraryService
            from app.services.explanation_service import ExplanationService
            from uuid import UUID

            # --- 1. Load latest itinerary ---
            # Resolve family UUID (trip_session stores family IDs as strings)
            family_uuid: Optional[UUID] = None
            try:
                family_uuid = UUID(family_id)
            except (ValueError, AttributeError):
                from sqlmodel import Session, select
                from app.models.family import Family
                from app.core.db import engine
                with Session(engine) as session:
                    fam = session.exec(
                        select(Family).where(Family.family_code == family_id)
                    ).first()
                    if fam:
                        family_uuid = fam.id

            old_itinerary: Dict = {}
            new_itinerary: Dict = {}
            prev_itinerary_id: Optional[UUID] = None
            new_itinerary_id: Optional[UUID] = None

            if family_uuid:
                history = ItineraryService.get_itinerary_history(family_uuid, limit=1)
                if history:
                    old_itin = history[0]
                    old_itinerary = old_itin.data or {}
                    prev_itinerary_id = old_itin.id

            processor = FeedbackProcessor()

            # --- 2. Parse natural language to constraints ---
            from pathlib import Path
            import json
            import os
            import tempfile
            from app.services.preference_service import PreferenceService
            from app.models.preference import PreferenceType
            
            locations_path = Path(__file__).parent.parent.parent / "ml_or" / "data" / "locations.json"
            available_pois = []
            if locations_path.exists():
                with open(locations_path, "r") as f:
                    locs_data = json.load(f)
                    available_pois = [(loc.get("location_id"), loc.get("name")) for loc in locs_data if "location_id" in loc]
            
            parsed_constraints = processor.parse_user_feedback(message, available_pois)

            # --- 3. Update Preferences in DB ---
            if family_uuid and (parsed_constraints.get("add") or parsed_constraints.get("remove")):
                for poi_id in parsed_constraints.get("add", []):
                    name = next((n for lid, n in available_pois if lid == poi_id), poi_id)
                    PreferenceService.add_preference(family_uuid, poi_id, name, PreferenceType.MUST_VISIT, reason=message)
                for poi_id in parsed_constraints.get("remove", []):
                    name = next((n for lid, n in available_pois if lid == poi_id), poi_id)
                    PreferenceService.add_preference(family_uuid, poi_id, name, PreferenceType.NEVER_VISIT, reason=message)

            # --- 4. Run Optimizer with Temp Files ---
            optimization_ran = False
            if family_uuid and old_itinerary:
                with tempfile.TemporaryDirectory() as temp_dir:
                    base_path = os.path.join(temp_dir, "base_itinerary.json")
                    prefs_path = os.path.join(temp_dir, "family_prefs.json")
                    
                    with open(base_path, "w") as f:
                        json.dump(old_itinerary, f)
                        
                    family_ids = trip_session.family_ids or [family_id]
                    family_prefs = []

                    from sqlmodel import Session, select
                    from app.models.family import Family
                    from app.core.db import engine

                    with Session(engine) as session:
                        for fid in family_ids:
                            # Try to get the UUID for the family code to fetch dynamic DB preferences
                            stmt = select(Family).where(Family.family_code == fid)
                            fam_rec = session.exec(stmt).first()
                            
                            fam_uuid_loop = fam_rec.id if fam_rec else None
                            db_fam_prefs = fam_rec.preferences if fam_rec and fam_rec.preferences else {}
                            
                            expanded = OptimizerService._get_expanded_family_preferences(fid, db_fam_prefs)
                            
                            must_visit = PreferenceService.get_must_visit_pois(fam_uuid_loop) if fam_uuid_loop else []
                            never_visit = PreferenceService.get_never_visit_pois(fam_uuid_loop) if fam_uuid_loop else []

                            family_prefs.append({
                                "family_id": fid,
                                "members": expanded.get("members", 2),
                                "children": expanded.get("children", 0),
                                "budget_sensitivity": expanded.get("budget_sensitivity", 0.5),
                                "energy_level": expanded.get("energy_level", 0.5),
                                "interest_vector": expanded.get("interest_vector", {}),
                                "must_visit_locations": must_visit,
                                "never_visit_locations": never_visit,
                            })

                    with open(prefs_path, "w") as f:
                        json.dump(family_prefs, f)
                    
                    family_ids = trip_session.family_ids or [family_id]
                    opt_result = processor.run_optimizer(base_path, prefs_path, temp_dir, family_ids=family_ids)
                    if opt_result.get("optimizer_ran") and opt_result.get("optimized_itinerary"):
                        new_itinerary = opt_result["optimized_itinerary"]
                        optimization_ran = True

            # --- 5. Save New Itinerary to DB ---
            if optimization_ran and new_itinerary:
                new_itin_record = ItineraryService.create_version(family_uuid, new_itinerary)
                new_itinerary_id = new_itin_record.id
                trip_session.iteration_count += 1
            else:
                new_itinerary = old_itinerary # No change

            # --- 6. Run explainability pipeline ---
            result = processor.process_feedback(
                trip_id=trip_id,
                family_id=family_id,
                old_itinerary=old_itinerary,
                new_itinerary=new_itinerary,
                user_message=message,
            )

            explanations_list = result.get("explanations", [])
            llm_sentences = [e.get("llm_explanation", "") for e in explanations_list if e.get("llm_explanation")]

            # --- 7. Save Explanations to DB ---
            if explanations_list and family_uuid and new_itinerary_id:
                ExplanationService.save_explanations(
                    trip_id=trip_id,
                    family_id=family_uuid,
                    itinerary_id=new_itinerary_id,
                    prev_itinerary_id=prev_itinerary_id,
                    explanations=explanations_list,
                    trigger_message=message,
                )

            itinerary_updated = optimization_ran and bool(result.get("diffs"))

            # --- 8. Update trip session feedback history ---
            trip_session.feedback_history.append({
                "iteration": trip_session.iteration_count,
                "timestamp": datetime.utcnow().isoformat(),
                "family_id": family_id,
                "message": message,
                "event_type": "EXPLAINABILITY_PROCESSED",
                "action": "PIPELINE_COMPLETE" if explanations_list else "NO_CHANGES_DETECTED",
                "explanations_count": len(explanations_list),
            })
            OptimizerService.update_trip_session(trip_session)

            return {
                "success": True,
                "event_type": "EXPLAINABILITY_PROCESSED",
                "action_taken": "PIPELINE_COMPLETE" if explanations_list else "NO_CHANGES_DETECTED",
                "explanations": llm_sentences or [f"Feedback acknowledged: {message}"],
                "itinerary_updated": itinerary_updated,
                "iteration": trip_session.iteration_count,
                "cost_analysis": result.get("payloads", {}).get("travel_agent", {}).get("financial_summary"),
            }

        except ImportError as e:
            logger.warning("FeedbackProcessor not importable (%s), using fallback", e)

        except Exception as e:
            logger.error("FeedbackProcessor pipeline error: %s", e, exc_info=True)

        # --- Fallback: just record the feedback message ---
        trip_session.feedback_history.append({
            "iteration": trip_session.iteration_count,
            "timestamp": datetime.utcnow().isoformat(),
            "family_id": family_id,
            "message": message,
            "event_type": "ACKNOWLEDGED",
            "action": "FALLBACK_MODE",
        })
        OptimizerService.update_trip_session(trip_session)

        return {
            "success": True,
            "event_type": "ACKNOWLEDGED",
            "action_taken": "FALLBACK_MODE",
            "explanations": [f"Feedback acknowledged: {message}"],
            "itinerary_updated": False,
            "iteration": trip_session.iteration_count,
            "cost_analysis": None,
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
