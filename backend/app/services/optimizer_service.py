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
    # expire_on_commit=False keeps returned objects readable after the block exits
    session = Session(engine, expire_on_commit=False)
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

        # No folders: the optimizer's working state lives in the trip_iterations table, so any worker can
        # pick up this trip. baseline_itinerary_path points at read-only reference data shipped with the code.
        trip_session = TripSession(
            trip_id=trip_id,
            family_ids=family_ids,
            baseline_itinerary_path=baseline_itinerary_path,
            trip_name=trip_name,
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

            import tempfile

            # The optimizer library works in a folder; give it a private one that disappears with this call
            scratch = tempfile.TemporaryDirectory(prefix=f"opt_{trip_id}_")
            output_dir = Path(scratch.name)

            # Convert preferences dict to the list format the optimizer expects
            pref_list = []
            for fam_id, fam_prefs in preferences.items():
                # The optimizer's FamilyPreference needs every field; accept both the
                # *_locations and the short must_visit/never_visit spellings.
                pref_list.append({
                    "family_id": fam_id,
                    "members": int(fam_prefs.get("members", 1)),
                    "children": int(fam_prefs.get("children", 0)),
                    "budget_sensitivity": float(fam_prefs.get("budget_sensitivity", 0.5)),
                    "energy_level": float(fam_prefs.get("energy_level", 0.7)),
                    "interest_vector": fam_prefs.get("interest_vector", {}),
                    "must_visit_locations": fam_prefs.get("must_visit_locations", fam_prefs.get("must_visit", [])),
                    "never_visit_locations": fam_prefs.get("never_visit_locations", fam_prefs.get("never_visit", [])),
                    "pace_preference": fam_prefs.get("pace_preference", "moderate"),
                    "notes": fam_prefs.get("notes", ""),
                })

            # Write preferences file for the optimizer
            prefs_file = output_dir / "preferences.json"
            with open(prefs_file, "w") as f:
                json.dump(pref_list, f, indent=2)

            # Run optimizer via FeedbackProcessor
            processor = FeedbackProcessor()
            result = processor.run_optimizer(
                baseline_path=str(baseline_path),
                preferences_path=str(prefs_file),
                output_dir=str(output_dir),
            )

            optimized_path = output_dir / "optimized_itinerary.json"
            if optimized_path.exists():
                with open(optimized_path, "r") as f:
                    optimized_data = json.load(f)

                from app.services.itinerary_format import normalize_itinerary

                first_family = next(iter(preferences), None)
                members = int((preferences.get(first_family) or {}).get("members", 1)) if first_family else 1
                itinerary_data = normalize_itinerary(optimized_data, first_family, members)
                cost = itinerary_data.get("total_cost", 0.0)
                satisfaction = itinerary_data.get("total_satisfaction", 0.0)

                logger.info(f"ML optimizer succeeded for trip {trip_id}")
                scratch.cleanup()
                OptimizerService._record_initial(trip_id, baseline_path, pref_list, itinerary_data, True)
                return {
                    "itinerary_data": itinerary_data,
                    "cost": cost,
                    "satisfaction": min(satisfaction / 10.0, 1.0),
                    "optimizer_ran": True,
                }

            # Optimizer ran but no output file – fall through to baseline
            scratch.cleanup()
            logger.warning("Optimizer ran but produced no output file, using baseline")

        except ImportError as e:
            logger.warning(f"ML optimizer not available ({e}), using raw baseline")
        except Exception as e:
            logger.error(f"ML optimizer failed ({e}), falling back to baseline")

        # Fallback: return the raw baseline as-is
        cost = baseline_data.get("total_cost", 0.0)
        num_pois = sum(len(day.get("pois", [])) for day in baseline_data.get("days", []))
        satisfaction = min(0.5 + num_pois * 0.02, 1.0)  # rough heuristic

        OptimizerService._record_initial(trip_id, baseline_path, preferences, baseline_data, False)
        return {
            "itinerary_data": baseline_data,
            "cost": cost,
            "satisfaction": satisfaction,
            "optimizer_ran": False,
        }

    @staticmethod
    def _record_initial(trip_id: str, baseline_path: str, preferences: Any, result: Dict[str, Any], optimizer_ran: bool) -> None:
        """Keep what went into the first plan and what came out, so the plan is reproducible."""
        from app.services import iteration_service

        try:
            iteration_service.record(
                trip_id, "initial",
                input_snapshot={"baseline_source": Path(str(baseline_path)).name, "preferences": preferences},
                result=result, optimizer_ran=optimizer_ran,
            )
        except Exception as e:  # the trip still gets its plan; the record is reported, not fatal
            logger.error(f"Could not record the initial iteration for {trip_id}: {e}")

    @staticmethod
    def process_feedback_with_agents(
        trip_id: str,
        family_id: str,
        message: str,
        simulate: bool = False
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
            if not simulate and family_uuid and (parsed_constraints.get("add") or parsed_constraints.get("remove")):
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

                    # Start from the stored family profile so the optimizer gets every field it needs
                    stored = (trip_session.current_preferences or {}).get(family_id) or next(
                        iter((trip_session.initial_preferences or {}).values()), {}) or {}
                    family_prefs = [{
                        "family_id": family_id,
                        "members": int(stored.get("members", 2)),
                        "children": int(stored.get("children", 0)),
                        "budget_sensitivity": float(stored.get("budget_sensitivity", 0.5)),
                        "energy_level": float(stored.get("energy_level", 0.7)),
                        "interest_vector": stored.get("interest_vector", {}),
                        "pace_preference": stored.get("pace_preference", "moderate"),
                        "must_visit_locations": PreferenceService.get_must_visit_pois(family_uuid),
                        "never_visit_locations": PreferenceService.get_never_visit_pois(family_uuid),
                    }]
                    with open(prefs_path, "w") as f:
                        json.dump(family_prefs, f)

                    opt_result = processor.run_optimizer(base_path, prefs_path, temp_dir)
                    if opt_result.get("optimizer_ran") and opt_result.get("optimized_itinerary"):
                        from app.services.itinerary_format import normalize_itinerary
                        new_itinerary = normalize_itinerary(
                            opt_result["optimized_itinerary"], family_id, family_prefs[0]["members"])
                        optimization_ran = True

            # --- 5. Save New Itinerary to DB ---
            if optimization_ran and new_itinerary:
                if not simulate:
                    new_itin_record = ItineraryService.create_itinerary(family_uuid, new_itinerary, created_reason="Re-optimized after feedback", created_by="agent")
                    new_itinerary_id = new_itin_record.id
                    trip_session.iteration_count += 1
                    from app.services import iteration_service

                    iteration_service.record(
                        trip_id, "replan", family_id=family_id,
                        input_snapshot={
                            "base_itinerary_id": str(prev_itinerary_id) if prev_itinerary_id else None,
                            "family_preferences": family_prefs,
                            "constraints": parsed_constraints,
                            "message": message,
                        },
                        result=new_itinerary,
                    )
                else:
                    new_itinerary_id = prev_itinerary_id # Mock ID for simulation
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
            if not simulate and explanations_list and family_uuid and new_itinerary_id:
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
            if not simulate:
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
        if not simulate:
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
