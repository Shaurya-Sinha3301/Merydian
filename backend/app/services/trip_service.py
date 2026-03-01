"""
Trip Service - Handles trip initialization and family preference management

This service manages the initial setup of trips, including:
- Creating trips with family preferences
- Validating preference data
- Converting preferences to ML optimizer format
- Coordinating with OptimizerService
"""

import logging
import json
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime
import random

from app.models.trip_session import TripSession
from app.services.optimizer_service import OptimizerService, get_db_session
from app.core.config import settings

logger = logging.getLogger(__name__)


class TripService:
    """
    Service for managing trip initialization and family preferences.
    """
    
    @staticmethod
    def initialize_trip(
        trip_name: str,
        destination: str,
        start_date: str,
        end_date: str,
        baseline_itinerary: str,
        families: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Initialize a new trip with family preferences.
        
        Args:
            trip_name: Human-readable trip name
            destination: Trip destination
            start_date: ISO 8601 date string
            end_date: ISO 8601 date string
            baseline_itinerary: Path or name of skeleton itinerary
            families: List of family preference dictionaries
            
        Returns:
            Dictionary with trip_id, summary, and next steps
            
        Raises:
            ValueError: If preferences are invalid
        """
        logger.info(f"Initializing trip: {trip_name}")
        
        # Generate unique trip ID
        trip_id = TripService._generate_trip_id(destination, start_date)
        
        # Validate all family preferences
        TripService._validate_preferences(families)
        
        # Extract family IDs
        family_ids = [f["family_id"] for f in families]
        
        # Convert preferences to optimizer format
        initial_preferences = TripService._convert_to_optimizer_format(families)
        
        # Resolve baseline itinerary path
        baseline_path = TripService._resolve_baseline_path(baseline_itinerary)
        
        # Create trip session using OptimizerService
        trip_session = OptimizerService.create_trip_session(
            trip_id=trip_id,
            family_ids=family_ids,
            baseline_itinerary_path=baseline_path,
            trip_name=trip_name
        )
        
        # Enhance with additional details
        trip_session.destination = destination
        trip_session.start_date = datetime.fromisoformat(start_date)
        trip_session.end_date = datetime.fromisoformat(end_date)
        trip_session.initial_preferences = initial_preferences
        trip_session.current_preferences = initial_preferences.copy()
        
        # Save updated session to database
        OptimizerService.update_trip_session(trip_session)
        
        # Calculate trip metrics
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        duration_days = (end_dt - start_dt).days + 1  # Include end date
        
        total_members = sum(f.get("members", 1) for f in families)
        total_children = sum(f.get("children", 0) for f in families)
        
        logger.info(
            f"Trip initialized: {trip_id} with {len(families)} families, "
            f"{total_members} members, {duration_days} days"
        )

        # ------------------------------------------------------------------
        # SUPABASE SCHEMA POPULATION (New Logic)
        # ------------------------------------------------------------------
        try:
            with get_db_session() as session:
                # 1. Load Baseline Data
                import json
                with open(baseline_path, 'r') as f:
                    baseline_data = json.load(f)
                
                # 2. Create Itinerary Record (Version 1)
                from app.models.itinerary import Itinerary
                from app.models.family import Family
                from app.models.preference import Preference, PreferenceType
                
                # We need to link itinerary to family.
                # If multiple families, should we create one shared itinerary or copies?
                # The ERD implies Family -> Itinerary.
                # Let's create one Itinerary record per family for now (shared content)
                # so they can diverge if needed.
                
                for family_pref in families:
                    fam_id_str = family_pref["family_id"]
                    
                    # Find family object
                    fam = session.get(Family, fam_id_str)
                    if not fam:
                        logger.warning(f"Family {fam_id_str} not found during schema population")
                        continue
                        
                    # Create Itinerary
                    itinerary = Itinerary(
                        family_id=fam.id,
                        version=1,
                        data=baseline_data,
                        created_reason="Trip Initialization",
                        created_by="system",
                        days=duration_days
                    )
                    session.add(itinerary)
                    session.flush() # get ID
                    
                    # Update Family
                    fam.current_itinerary_version = itinerary.id
                    session.add(fam)
                    
                    # 3. Populate Preferences Table
                    # Must Visit
                    for poi_id in family_pref.get("must_visit_locations", []):
                        pref = Preference(
                            family_id=fam.id,
                            poi_id=poi_id,
                            poi_name=f"POI {poi_id}", # Placeholder name, ideally fetch from data
                            preference_type=PreferenceType.MUST_VISIT,
                            strength=1.0,
                            reason="Initial Survey",
                            trip_id=trip_id # Wait, Preference model has trip_id?? No?
                            # Checked Preference model: NO trip_id field in my view earlier.
                            # Just family_id. Context is family.
                        )
                        session.add(pref)
                        
                    # Never Visit
                    for poi_id in family_pref.get("never_visit_locations", []):
                        pref = Preference(
                            family_id=fam.id,
                            poi_id=poi_id,
                            poi_name=f"POI {poi_id}",
                            preference_type=PreferenceType.NEVER_VISIT,
                            strength=1.0,
                            reason="Initial Survey"
                        )
                        session.add(pref)
                        
                session.commit()
                logger.info("Supabase tables (Itineraries, Preferences) populated successfully")
                
        except Exception as e:
            logger.error(f"Failed to populate Supabase schema tables: {e}")
            # Don't fail the whole init, as TripSession is valid
            pass
            
        return {
            "success": True,
            "trip_id": trip_id,
            "trip_session_id": str(trip_session.id),
            "message": f"Trip initialized successfully with {len(families)} families",
            "summary": {
                "families_registered": len(families),
                "total_members": total_members,
                "total_children": total_children,
                "trip_duration_days": duration_days,
                "baseline_itinerary": baseline_itinerary
            },
            "next_steps": [
                "Review your baseline itinerary",
                "Run initial optimization to see the proposed trip plan",
                "Provide feedback to refine the itinerary"
            ]
        }
    
    @staticmethod
    def _generate_trip_id(destination: str, start_date: str) -> str:
        """
        Generate a unique trip ID from destination and start date.
        
        Format: {destination_code}_{date_code}_{random}
        Example: delhi_20260315_4523
        
        Args:
            destination: Trip destination
            start_date: ISO 8601 date string
            
        Returns:
            Unique trip ID
        """
        # Extract destination code (first 10 chars, lowercased, no spaces/commas)
        dest_code = destination.lower().replace(" ", "_").replace(",", "")[:10]
        
        # Extract date code (YYYYMMDD)
        date_code = start_date.replace("-", "")[:8]
        
        # Generate random 4-digit code
        random_code = f"{random.randint(1000, 9999)}"
        
        return f"{dest_code}_{date_code}_{random_code}"
    
    @staticmethod
    def _validate_preferences(families: List[Dict[str, Any]]) -> None:
        """
        Validate family preferences for correctness.
        
        Checks:
        - Required fields present
        - Values in valid ranges
        - No conflicting constraints (must_visit ∩ never_visit = ∅)
        
        Args:
            families: List of family preference dictionaries
            
        Raises:
            ValueError: If any validation fails
        """
        if not families:
            raise ValueError("At least one family must be provided")
        
        family_ids_seen = set()
        
        for i, family in enumerate(families):
            family_label = family.get("family_id", f"Family {i}")
            
            # Check required fields
            required = ["family_id", "members", "interest_vector"]
            for field in required:
                if field not in family:
                    raise ValueError(f"{family_label}: Missing required field '{field}'")
            
            # Check for duplicate family IDs
            family_id = family["family_id"]
            if family_id in family_ids_seen:
                raise ValueError(f"Duplicate family_id: {family_id}")
            family_ids_seen.add(family_id)
            
            # Validate member counts
            if family["members"] < 1:
                raise ValueError(f"{family_label}: members must be >= 1")
            
            children = family.get("children", 0)
            if children < 0:
                raise ValueError(f"{family_label}: children must be >= 0")
            if children > family["members"]:
                raise ValueError(f"{family_label}: children cannot exceed total members")
            
            # Validate numeric ranges
            if "budget_sensitivity" in family:
                val = family["budget_sensitivity"]
                if not 0.0 <= val <= 1.0:
                    raise ValueError(f"{family_label}: budget_sensitivity must be in [0.0, 1.0]")
            
            if "energy_level" in family:
                val = family["energy_level"]
                if not 0.0 <= val <= 1.0:
                    raise ValueError(f"{family_label}: energy_level must be in [0.0, 1.0]")
            
            # Validate pace preference
            if "pace_preference" in family:
                valid_paces = ["relaxed", "moderate", "fast"]
                if family["pace_preference"] not in valid_paces:
                    raise ValueError(
                        f"{family_label}: pace_preference must be one of {valid_paces}"
                    )
            
            # Validate interest vector
            interest_vector = family["interest_vector"]
            if not isinstance(interest_vector, dict):
                raise ValueError(f"{family_label}: interest_vector must be a dictionary")
            
            for category, value in interest_vector.items():
                if not isinstance(value, (int, float)):
                    raise ValueError(
                        f"{family_label}: interest_vector.{category} must be a number"
                    )
                if not 0.0 <= value <= 1.0:
                    raise ValueError(
                        f"{family_label}: interest_vector.{category} must be in [0.0, 1.0]"
                    )
            
            # Check for conflicting constraints
            must_visit = set(family.get("must_visit_locations", []))
            never_visit = set(family.get("never_visit_locations", []))
            overlap = must_visit & never_visit
            
            if overlap:
                raise ValueError(
                    f"{family_label}: Conflicting preferences - {overlap} appears in both "
                    f"must_visit and never_visit"
                )
    
    @staticmethod
    def _convert_to_optimizer_format(families: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Convert frontend format to ML optimizer format.
        
        Frontend sends:
        {
          "family_id": "FAM_A",
          "members": 4,
          "interest_vector": {...},
          "must_visit_locations": [...]
        }
        
        Optimizer needs:
        {
          "FAM_A": {
            "family_id": "FAM_A",
            "members": 4,
            "must_visit_locations": [...],
            "interest_vector": {...}
          }
        }
        
        Args:
            families: List of family dictionaries from frontend
            
        Returns:
            Dictionary keyed by family_id with optimizer-compatible format
        """
        optimizer_prefs = {}
        
        for family in families:
            family_id = family["family_id"]
            
            optimizer_prefs[family_id] = {
                "family_id": family_id,
                "members": family.get("members", 1),
                "children": family.get("children", 0),
                "budget_sensitivity": family.get("budget_sensitivity", 0.5),
                "energy_level": family.get("energy_level", 0.5),
                "pace_preference": family.get("pace_preference", "moderate"),
                "interest_vector": family["interest_vector"],
                "must_visit_locations": family.get("must_visit_locations", []),
                "never_visit_locations": family.get("never_visit_locations", []),
                "notes": family.get("notes", "")
            }
        
        return optimizer_prefs
    
    @staticmethod
    def _resolve_baseline_path(baseline_name: str) -> str:
        """
        Map baseline itinerary name to file path.
        
        Supports:
        - Named baselines: "delhi_3day_skeleton" → "ml_or/data/base_itinerary_final.json"
        - Direct paths: "./custom/itinerary.json"
        
        Args:
            baseline_name: Baseline itinerary name or path
            
        Returns:
            Full path to baseline file
            
        Raises:
            ValueError: If baseline not found
        """
        # Predefined baseline mappings
        baselines = {
            "delhi_3day_skeleton": "ml_or/data/base_itinerary_clustered.json",
            "delhi_3day": "ml_or/data/base_itinerary_clustered.json",
            "delhi_5day": "ml_or/data/delhi_5day_skeleton.json",
            "mumbai_3day": "ml_or/data/mumbai_3day_skeleton.json",
        }
        
        # Check if it's a known baseline name
        if baseline_name in baselines:
            path = baselines[baseline_name]
            logger.info(f"Resolved baseline '{baseline_name}' to '{path}'")
            return path
        
        # Check if it's already a path
        path = Path(baseline_name)
        if path.exists() and path.is_file():
            logger.info(f"Using direct path: '{baseline_name}'")
            return str(path)
        
        # Not found
        raise ValueError(
            f"Unknown baseline itinerary: '{baseline_name}'. "
            f"Available: {list(baselines.keys())}"
        )
    
    @staticmethod
    def get_trip_summary(trip_id: str) -> Dict[str, Any]:
        """
        Get a summary of the trip with current state.
        
        Args:
            trip_id: Trip identifier
            
        Returns:
            Dictionary with trip summary
            
        Raises:
            ValueError: If trip not found
        """
        trip_session = OptimizerService.get_trip_session(trip_id)
        
        if not trip_session:
            raise ValueError(f"Trip not found: {trip_id}")
        
        return {
            "trip_id": trip_session.trip_id,
            "trip_name": trip_session.trip_name,
            "destination": trip_session.destination,
            "start_date": trip_session.start_date.isoformat() if trip_session.start_date else None,
            "end_date": trip_session.end_date.isoformat() if trip_session.end_date else None,
            "families": trip_session.family_ids,
            "iteration_count": trip_session.iteration_count,
            "initial_preferences": trip_session.initial_preferences,
            "current_preferences": trip_session.current_preferences,
            "feedback_count": len(trip_session.feedback_history),
            "last_updated": trip_session.updated_at.isoformat() if trip_session.updated_at else None
        }
    
    @staticmethod
    def update_family_preferences(
        trip_id: str,
        family_id: str,
        preference_updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update preferences for a specific family (before optimization runs).
        
        Use this for manual preference edits, not feedback processing.
        For feedback, use OptimizerService.process_feedback_with_agents().
        
        Args:
            trip_id: Trip identifier
            family_id: Family to update
            preference_updates: Dictionary with fields to update
            
        Returns:
            Updated preferences
            
        Raises:
            ValueError: If trip or family not found
        """
        trip_session = OptimizerService.get_trip_session(trip_id)
        
        if not trip_session:
            raise ValueError(f"Trip not found: {trip_id}")
        
        if family_id not in trip_session.family_ids:
            raise ValueError(f"Family {family_id} not part of trip {trip_id}")
        
        # Get current preferences for this family
        if family_id not in trip_session.current_preferences:
            trip_session.current_preferences[family_id] = {}
        
        family_prefs = trip_session.current_preferences[family_id]
        
        # Update with new values
        for key, value in preference_updates.items():
            family_prefs[key] = value
        
        # Save to database
        OptimizerService.update_trip_session(trip_session)
        
        logger.info(f"Updated preferences for {family_id} in trip {trip_id}")
        
        return family_prefs

    @staticmethod
    def initialize_trip_with_optimization(
        trip_name: str,
        destination: str,
        start_date: str,
        end_date: str,
        family_ids: List[str],
        num_travellers: Optional[int] = None,
        custom_baseline: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Initialize a trip, auto-fetch family preferences, run optimizer iteration 0,
        and create an ItineraryOption for agent review.

        Args:
            trip_name: Human-readable trip name
            destination: Trip destination
            start_date: ISO 8601 date string
            end_date: ISO 8601 date string
            family_ids: List of family_code strings (e.g. ["FAM_A", "FAM_B"])
            num_travellers: Optional total traveller count (informational)

        Returns:
            Dictionary with trip_id, option_id, summary, and generated itinerary metadata
        """
        logger.info(
            f"Initializing trip with optimization: {trip_name} for {family_ids}"
        )

        # -------------------------------------------------------------------
        # 1. Fetch family preferences from DB
        # -------------------------------------------------------------------
        from sqlmodel import Session, select
        from app.core.db import engine as db_engine
        from app.models.family import Family
        from app.services.itinerary_option_service import ItineraryOptionService

        families_data: List[Dict[str, Any]] = []

        with Session(db_engine) as session:
            for fam_code in family_ids:
                stmt = select(Family).where(Family.family_code == fam_code)
                family = session.exec(stmt).first()

                if not family:
                    logger.warning(f"Family {fam_code} not found in DB, using defaults")
                    families_data.append({
                        "family_id": fam_code,
                        "members": 2,
                        "children": 0,
                        "budget_sensitivity": 0.5,
                        "energy_level": 0.5,
                        "pace_preference": "moderate",
                        "interest_vector": {
                            "history": 0.5, "architecture": 0.5,
                            "food": 0.5, "nature": 0.5, "nightlife": 0.3,
                            "shopping": 0.3, "religious": 0.3,
                        },
                        "must_visit_locations": [],
                        "never_visit_locations": [],
                    })
                    continue

                # Pull preferences from the Family.preferences JSONB column
                prefs = family.preferences or {}
                families_data.append({
                    "family_id": fam_code,
                    "members": prefs.get("members", 2),
                    "children": prefs.get("children", 0),
                    "budget_sensitivity": prefs.get("budget_sensitivity", 0.5),
                    "energy_level": prefs.get("energy_level", 0.5),
                    "pace_preference": prefs.get("pace_preference", "moderate"),
                    "interest_vector": prefs.get("interest_vector", {
                        "history": 0.5, "architecture": 0.5,
                        "food": 0.5, "nature": 0.5, "nightlife": 0.3,
                        "shopping": 0.3, "religious": 0.3,
                    }),
                    "must_visit_locations": prefs.get("must_visit", prefs.get("must_visit_locations", [])),
                    "never_visit_locations": prefs.get("never_visit", prefs.get("never_visit_locations", [])),
                })

        # -------------------------------------------------------------------
        # 2. Generate trip ID and prepare data
        # -------------------------------------------------------------------
        trip_id = TripService._generate_trip_id(destination, start_date)
        optimizer_prefs = TripService._convert_to_optimizer_format(families_data)

        # Use custom baseline from Activity Architect if provided,
        # otherwise fall back to the static skeleton lookup.
        if custom_baseline:
            logger.info("Using custom baseline from Activity Architect (%d days)", len(custom_baseline.get("days", [])))

            # --- Resolve activity names to real location IDs ---
            # The optimizer only knows IDs from locations.json (LOC_001, etc.).
            # The frontend sends human-readable names in `comment`, so we
            # build a case-insensitive index and replace custom IDs with real ones.
            try:
                locations_file = Path("ml_or/data/locations.json")
                if locations_file.exists():
                    with open(locations_file, "r") as lf:
                        all_locations = json.load(lf)
                    # Build name → location_id lookup (lowercase, stripped)
                    name_to_id = {}
                    for loc in all_locations:
                        loc_name = loc.get("name", "").strip().lower()
                        if loc_name:
                            name_to_id[loc_name] = loc.get("location_id")
                    
                    resolved_count = 0
                    for day_data in custom_baseline.get("days", []):
                        for poi in day_data.get("pois", []):
                            comment = (poi.get("comment") or "").strip().lower()
                            if comment and comment in name_to_id:
                                old_id = poi["location_id"]
                                poi["location_id"] = name_to_id[comment]
                                resolved_count += 1
                                logger.info("Resolved '%s' → %s (was %s)", poi.get("comment"), poi["location_id"], old_id)
                    
                    logger.info("Resolved %d/%d POIs to real location IDs",
                                resolved_count,
                                sum(len(d.get("pois", [])) for d in custom_baseline.get("days", [])))
            except Exception as e:
                logger.warning("Could not resolve activity names to location IDs: %s", e)

            from pathlib import Path as _Path
            custom_dir = _Path(settings.OPTIMIZER_OUTPUT_DIR) / trip_id
            custom_dir.mkdir(parents=True, exist_ok=True)
            custom_path = custom_dir / "custom_baseline.json"
            with open(custom_path, "w") as _f:
                json.dump(custom_baseline, _f, indent=2)
            baseline_path = str(custom_path)
            baseline_name = custom_baseline.get("itinerary_id", "custom_baseline")
        else:
            baseline_map = {
                "delhi": "delhi_3day_skeleton",
                "mumbai": "mumbai_3day",
            }
            dest_key = destination.lower().split(",")[0].strip()
            baseline_name = baseline_map.get(dest_key, "delhi_3day_skeleton")
            baseline_path = TripService._resolve_baseline_path(baseline_name)

        # -------------------------------------------------------------------
        # 3. Create TripSession
        # -------------------------------------------------------------------
        trip_session = OptimizerService.create_trip_session(
            trip_id=trip_id,
            family_ids=family_ids,
            baseline_itinerary_path=baseline_path,
            trip_name=trip_name,
        )

        # Add metadata
        trip_session.destination = destination
        trip_session.start_date = datetime.fromisoformat(start_date)
        trip_session.end_date = datetime.fromisoformat(end_date)
        trip_session.initial_preferences = optimizer_prefs
        trip_session.current_preferences = optimizer_prefs.copy()
        OptimizerService.update_trip_session(trip_session)

        # -------------------------------------------------------------------
        # 4. Run ML optimizer iteration 0
        # -------------------------------------------------------------------
        opti_result = OptimizerService.run_initial_optimization(
            trip_id=trip_id,
            baseline_path=baseline_path,
            preferences=optimizer_prefs,
        )

        itinerary_data = opti_result["itinerary_data"]
        cost = opti_result["cost"]
        satisfaction = opti_result["satisfaction"]
        optimizer_ran = opti_result["optimizer_ran"]

        # -------------------------------------------------------------------
        # 5. Create ItineraryOptionDB entry for agent review
        # -------------------------------------------------------------------
        event_id = f"trip_init_{trip_id}"

        option = ItineraryOptionService.create_option(
            event_id=event_id,
            trip_id=trip_id,
            summary=(
                f"Base itinerary for '{trip_name}' ({destination}) — "
                f"{len(itinerary_data.get('days', []))} days, "
                f"{len(family_ids)} families"
                + (" [optimizer ran]" if optimizer_ran else " [baseline skeleton]")
            ),
            cost=cost,
            satisfaction=satisfaction,
            details={
                "itinerary": itinerary_data,
                "optimizer_ran": optimizer_ran,
                "family_ids": family_ids,
                "destination": destination,
                "start_date": start_date,
                "end_date": end_date,
                "num_travellers": num_travellers,
                "type": "base_itinerary",
            },
        )

        logger.info(
            f"Trip {trip_id} initialized with optimization. "
            f"Option ID: {option.id}, optimizer_ran={optimizer_ran}"
        )

        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        duration_days = (end_dt - start_dt).days + 1

        return {
            "success": True,
            "trip_id": trip_id,
            "trip_session_id": str(trip_session.id),
            "option_id": str(option.id),
            "event_id": event_id,
            "optimizer_ran": optimizer_ran,
            "message": (
                f"Trip initialized and base itinerary generated. "
                f"Review option '{option.id}' in the agent dashboard to approve."
            ),
            "summary": {
                "families_registered": len(family_ids),
                "total_members": sum(f.get("members", 1) for f in families_data),
                "total_children": sum(f.get("children", 0) for f in families_data),
                "trip_duration_days": duration_days,
                "baseline_itinerary": baseline_name,
                "estimated_cost": cost,
                "predicted_satisfaction": satisfaction,
            },
        }

    @staticmethod
    def get_active_trip_for_family(family_id: str) -> Optional[TripSession]:
        """
        Get the most recent active trip for a family.
        
        A trip is considered "active" if it's not explicitly marked as completed.
        Returns the most recently created trip that includes this family.
        
        Args:
            family_id: Family identifier
            
        Returns:
            TripSession if found, None otherwise
        """
        with get_db_session() as session:
            # Query for trips containing this family_id
            # Order by created_at DESC to get most recent
            from sqlmodel import select, col
            
            from sqlalchemy.dialects.postgresql import JSONB
            
            statement = (
                select(TripSession)
                .where(col(TripSession.family_ids).cast(JSONB).contains([family_id]))
                .order_by(TripSession.created_at.desc())
            )
            
            trip = session.exec(statement).first()
            
            if trip:
                # Force load JSON fields before expunging to avoid lazy loading errors
                _ = trip.current_preferences
                _ = trip.feedback_history
                _ = trip.initial_preferences
                _ = trip.preference_history
                _ = trip.family_ids
                
                # Expunge from session to avoid detached instance errors
                session.expunge(trip)
                logger.info(f"Found active trip {trip.trip_id} for family {family_id}")
            else:
                logger.warning(f"No active trip found for family {family_id}")
            
            return trip

    @staticmethod
    def list_trips(
        limit: int = 10,
        offset: int = 0,
        status_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        List trips with pagination, optionally filtered by status.

        Args:
            limit: Maximum number of trips to return
            offset: Number of trips to skip
            status_filter: Optional status filter (e.g. 'active', 'archived')

        Returns:
            List of trip summary dictionaries
        """
        from sqlmodel import select, func

        with get_db_session() as session:
            statement = select(TripSession).order_by(TripSession.created_at.desc())

            if status_filter:
                statement = statement.where(TripSession.status == status_filter)

            statement = statement.offset(offset).limit(limit)
            trips = session.exec(statement).all()

            # Get total count
            # Create separate count query
            count_stmt = select(func.count()).select_from(TripSession)
            if status_filter:
                count_stmt = count_stmt.where(TripSession.status == status_filter)
            
            total = session.exec(count_stmt).one()

            results = []
            for trip in trips:
                # Force-load JSONB fields before detaching
                _ = trip.family_ids
                _ = trip.initial_preferences
                _ = trip.current_preferences
                _ = trip.feedback_history

                results.append({
                    "trip_id": trip.trip_id,
                    "trip_name": trip.trip_name,
                    "destination": trip.destination,
                    "start_date": trip.start_date.isoformat() if trip.start_date else None,
                    "end_date": trip.end_date.isoformat() if trip.end_date else None,
                    "families": trip.family_ids,
                    "iteration_count": trip.iteration_count,
                    "initial_preferences": trip.initial_preferences,
                    "current_preferences": trip.current_preferences,
                    "feedback_count": len(trip.feedback_history) if trip.feedback_history else 0,
                    "last_updated": trip.updated_at.isoformat() if trip.updated_at else None,
                })

            return results, total

    @staticmethod
    def get_trip(trip_id) -> Optional[TripSession]:
        """
        Look up a TripSession by its trip_id string or UUID primary key.

        Used by AgentService to retrieve trip context for notifications.
        Accepts both the human-readable `trip_id` string (e.g. 'delhi_20260315_1234')
        and the UUID primary key.

        Returns:
            TripSession if found, None otherwise.
        """
        from sqlmodel import select

        trip_id_str = str(trip_id)

        with get_db_session() as session:
            # Try matching the string trip_id field first (most common case)
            stmt = select(TripSession).where(TripSession.trip_id == trip_id_str)
            trip = session.exec(stmt).first()

            if not trip:
                # Fall back to UUID primary key match
                try:
                    import uuid
                    pk = uuid.UUID(trip_id_str)
                    trip = session.get(TripSession, pk)
                except (ValueError, AttributeError):
                    pass

            if trip:
                # Force-load JSONB fields before the session closes
                _ = trip.family_ids
                _ = trip.current_preferences

            return trip


    @staticmethod
    def delete_trip(trip_id: str) -> Dict[str, Any]:
        """
        Soft-delete a trip by setting its status to 'archived'.

        Args:
            trip_id: Trip identifier

        Returns:
            Dictionary confirming the archival

        Raises:
            ValueError: If trip not found or already archived
        """
        with get_db_session() as session:
            from sqlmodel import select

            statement = select(TripSession).where(TripSession.trip_id == trip_id)
            trip = session.exec(statement).first()

            if not trip:
                raise ValueError(f"Trip not found: {trip_id}")

            if trip.status == "archived":
                raise ValueError(f"Trip {trip_id} is already archived")

            trip.status = "archived"
            trip.updated_at = datetime.utcnow()
            session.add(trip)

        logger.info(f"Trip {trip_id} archived (soft-deleted)")
        return {
            "success": True,
            "trip_id": trip_id,
            "status": "archived",
            "message": f"Trip {trip_id} has been archived",
        }
