"""
Optimizer Agent - Integrates with ml_or.itinerary_optimizer.ItineraryOptimizer
Handles re-optimization based on user preference changes.
"""
import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional

from .config import Config
from .poi_mapper import load_locations_map, get_poi_id
from .preference_builder import load_base_preferences, apply_event_to_preferences, save_preferences

logger = logging.getLogger(__name__)


class OptimizerAgent:
    """
    Agent responsible for running the optimizer and explainability pipeline.
    Integrates with ml_or.itinerary_optimizer.ItineraryOptimizer.
    """
    
    def __init__(self):
        """Initialize the Optimizer Agent."""
        self.ml_or_dir = Config.ML_OR_DIR
        self.test_data_dir = Config.TEST_DATA_DIR
        self.agents_dir = Config.AGENTS_DIR
        self.output_dir = self.agents_dir / "tests"
        self.output_dir.mkdir(exist_ok=True)
        
        # Data paths
        self.data_dir = self.ml_or_dir / "data"
        self.locations_path = self.data_dir / "locations.json"
        self.transport_path = self.data_dir / "transport_graph.json"
        self.base_itinerary_path = self.data_dir / "base_itinerary_final.json"
        self.base_prefs_path = self.data_dir / "family_preferences_3fam_strict.json"
        
        # Load locations map once
        self.locations_map = load_locations_map(self.locations_path)
        
        logger.info("OptimizerAgent initialized with real optimizer")
    
    def run(
        self,
        preferences: Optional[Dict[str, Any]] = None,
        constraints: Optional[Dict[str, Any]] = None,
        base_solution_path: Optional[Path] = None,
        output_dir: Optional[Path] = None,
        current_prefs_path: Optional[Path] = None,
        session_manager: Optional[Any] = None,  # TripSessionManager
        trip_id: Optional[str] = None,
        current_solution: Optional[Dict] = None  # Existing trip solution for re-opt
    ) -> Dict[str, Path]:
        """
        Run the optimizer with updated preferences/constraints.
        
        Args:
            preferences: FeedbackEvent dictionary with user preference change
            constraints: Updated constraints (currently unused)
            base_solution_path: Path to baseline solution for comparison (optional)
            output_dir: Directory to save outputs (optional, defaults to agents/tests/run_*)
        
        Returns:
            Dictionary with paths to generated files
        """
        from datetime import datetime
        
        logger.info("Running optimizer with real ItineraryOptimizer...")
        
        # Determine output directory
        if output_dir:
            run_dir = Path(output_dir)
            run_dir.mkdir(parents=True, exist_ok=True)
        else:
            # Default: Create timestamped output directory in agents/tests
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            run_dir = self.output_dir / f"run_{timestamp}"
            run_dir.mkdir(exist_ok=True)
        
        logger.info(f"Saving results to: {run_dir}")
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 1: Build Updated Family Preferences
        # ═══════════════════════════════════════════════════════════════
        
        # Load current preferences (cumulative) or fall back to base
        prefs_file = current_prefs_path if current_prefs_path else self.base_prefs_path
        logger.info(f"Loading preferences from: {prefs_file}")
        base_prefs = load_base_preferences(prefs_file)
        
        # Ensure all families have at least empty preferences
        all_families = ["FAM_A", "FAM_B", "FAM_C"]
        for fam_id in all_families:
            if fam_id not in base_prefs:
                base_prefs[fam_id] = {
                    "must_visit_locations": [],
                    "never_visit_locations": [],
                    "interests": []
                }
        
        # Map POI name to ID
        poi_id = None
        if preferences and preferences.get("poi_name"):
            poi_id = get_poi_id(preferences["poi_name"], self.locations_map)
            if not poi_id:
                logger.error(f"Could not find POI ID for: {preferences['poi_name']}")
        
        # Apply event to preferences
        updated_prefs = apply_event_to_preferences(
            preferences=base_prefs.copy(),
            event=preferences or {},
            poi_id=poi_id
        )
        
        # Save updated preferences
        updated_prefs_path = run_dir / "family_preferences_updated.json"
        save_preferences(updated_prefs, updated_prefs_path)
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 1.5: GEOGRAPHIC LOOK-AHEAD (NEW!)
        # ═══════════════════════════════════════════════════════════════
        
        target_day = None
        if session_manager and trip_id and preferences:
            event_type = preferences.get('event_type')
            before_day = preferences.get('before_day')  # From FeedbackEvent
            
            if event_type == 'MUST_VISIT_ADDED' and poi_id:
                logger.info("[LOOK-AHEAD] Analyzing candidate days...")
                
                # Get current session
                session = session_manager.get_session(trip_id)
                
                # Calculate candidate days
                if before_day:
                    candidate_days = session.get_candidate_days(
                        constraint="before_day_N",
                        before_day=before_day
                    )
                else:
                    candidate_days = session.get_candidate_days(
                        constraint="current_and_future"
                    )
                
                logger.info(f"  Candidate days: {[d+1 for d in candidate_days]}")
                
                # Geographic look-ahead if multiple candidates
                if len(candidate_days) > 1:
                    # Load base itinerary
                    with open(self.base_itinerary_path, 'r') as f:
                        base_itinerary = json.load(f)
                    
                    # Create temporary optimizer just for look-ahead
                    from ml_or.itinerary_optimizer import ItineraryOptimizer
                    temp_optimizer = ItineraryOptimizer(
                        locations_file=str(self.locations_path),
                        transport_file=str(self.transport_path),
                        base_itinerary_file=str(self.base_itinerary_path),
                        family_prefs_file=str(self.base_prefs_path)
                    )
                    
                    # Run geographic look-ahead
                    best_day, distance = temp_optimizer.find_best_day_for_poi(
                        poi_id=poi_id,
                        candidate_days=candidate_days,
                        base_itinerary=base_itinerary
                    )
                    
                    logger.info(f"  [✓] Best day: Day {best_day + 1} (avg distance: {distance:.2f} km)")
                    target_day = best_day
                elif len(candidate_days) == 1:
                    target_day = candidate_days[0]
                    logger.info(f"  [✓] Single candidate day: Day {target_day + 1}")
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 2: Initialize and Run Optimizer
        # ═══════════════════════════════════════════════════════════════
        
        from ml_or.itinerary_optimizer import ItineraryOptimizer
        
        logger.info("Initializing ItineraryOptimizer...")
        optimizer = ItineraryOptimizer(
            locations_file=str(self.locations_path),
            transport_file=str(self.transport_path),
            base_itinerary_file=str(self.base_itinerary_path),
            family_prefs_file=str(updated_prefs_path)
        )
        
        # Decide: Single-day re-opt or full trip?
        if target_day is not None and current_solution:
            # Single-day re-optimization (faster, preserves completed days)
            logger.info(f"Running single-day re-optimization for Day {target_day + 1}...")
            new_solution = optimizer.reoptimize_from_current_state(
                current_solution=current_solution,
                target_day_index=target_day,
                family_ids=["FAM_A", "FAM_B", "FAM_C"],
                lambda_divergence=0.05
            )
        else:
            # Full trip optimization (default, original behavior)
            logger.info("Running full trip optimization...")
            new_solution = optimizer.optimize_trip(
                family_ids=["FAM_A", "FAM_B", "FAM_C"],
                num_days=3,
                lambda_divergence=0.05
            )
        
        if not new_solution:
            logger.error("Optimizer failed to find a solution")
            return {}
        
        logger.info("Optimization completed successfully")
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 3: Load Baseline for Comparison
        # ═══════════════════════════════════════════════════════════════
        
        baseline_solution = None
        if base_solution_path and Path(base_solution_path).exists():
            with open(base_solution_path, 'r') as f:
                baseline_solution = json.load(f)
            logger.info(f"Loaded baseline solution from: {base_solution_path}")
        else:
            # Use demo baseline
            demo_baseline = self.test_data_dir / "optimized_solution.json"
            if demo_baseline.exists():
                with open(demo_baseline, 'r') as f:
                    baseline_solution = json.load(f)
                logger.info("Using demo baseline solution for comparison")
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 4: Run Explainability Pipeline
        # ═══════════════════════════════════════════════════════════════
        
        from ml_or.explainability.diff_engine import ItineraryDiffEngine
        from ml_or.explainability.causal_tagger import CausalTagger
        from ml_or.explainability.delta_engine import DeltaEngine
        from ml_or.explainability.payload_builder import ExplanationPayloadBuilder
        
        logger.info("Running explainability pipeline...")
        
        # Compare solutions
        diff_engine = ItineraryDiffEngine()
        if baseline_solution:
            diffs = diff_engine.compare_optimized_solutions(
                baseline_optimized=baseline_solution,
                new_optimized=new_solution,
                days_to_compare=None
            )
        else:
            # First run - no baseline
            logger.warning("No baseline solution, diffs may be incomplete")
            diffs = {}
        
        # Tag changes with causal reasoning
        tagger = CausalTagger()
        decision_traces = optimizer.decision_traces
        tagged_diffs = tagger.tag_changes(diffs, decision_traces)
        
        # Calculate cost/satisfaction deltas
        delta_engine = DeltaEngine()
        enriched_diffs = delta_engine.compute_deltas(
            tagged_diffs,
            decision_traces,
            optimizer.locations,
            baseline_solution=baseline_solution,
            new_solution=new_solution
        )
        
        # Build LLM payloads
        builder = ExplanationPayloadBuilder()
        payloads = builder.build_payloads(
            enriched_diffs,
            optimizer.locations,
            audience="TRAVEL_AGENT"
        )
        
        logger.info(f"Generated {len(payloads)} explanation payload(s)")
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 5: Save All Outputs
        # ═══════════════════════════════════════════════════════════════
        
        # Save optimized solution
        solution_path = run_dir / "optimized_solution.json"
        with open(solution_path, 'w') as f:
            json.dump(new_solution, f, indent=2)
        
        # Save decision traces
        traces_path = run_dir / "decision_traces.json"
        with open(traces_path, 'w') as f:
            json.dump({str(k): v for k, v in decision_traces.items()}, f, indent=2)
        
        # Save enriched diffs
        diffs_path = run_dir / "enriched_diffs.json"
        with open(diffs_path, 'w') as f:
            output = {}
            for fid, day_map in enriched_diffs.items():
                output[fid] = {str(d): changes for d, changes in day_map.items()}
            json.dump(output, f, indent=2)
        
        # Save LLM payloads
        payloads_path = run_dir / "llm_payloads.json"
        with open(payloads_path, 'w') as f:
            json.dump(payloads, f, indent=2)
        
        logger.info("All outputs saved successfully")
        
        return {
            "optimized_solution": solution_path,
            "decision_traces": traces_path,
            "enriched_diffs": diffs_path,
            "llm_payloads": payloads_path,
            "family_preferences": updated_prefs_path  # Source of truth for preferences
        }
    
    def load_solution(self, solution_path: Path) -> Dict[str, Any]:
        """Load an optimized solution from file."""
        try:
            with open(solution_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading solution from {solution_path}: {e}")
            return {}
    
    def load_decision_traces(self, traces_path: Path) -> Dict[str, Any]:
        """Load decision traces from file."""
        try:
            with open(traces_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading decision traces from {traces_path}: {e}")
            return {}
    
    def load_enriched_diffs(self, diffs_path: Path) -> Dict[str, Any]:
        """Load enriched diffs from file."""
        try:
            with open(diffs_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading enriched diffs from {diffs_path}: {e}")
            return {}


# Test function for standalone execution
if __name__ == "__main__":
    print("=" * 80)
    print("OPTIMIZER AGENT TEST - REAL OPTIMIZER")
    print("=" * 80)
    
    agent = OptimizerAgent()
    
    # Test with a preference change
    print("\nRunning optimizer with MUST_VISIT_ADDED event...")
    test_event = {
        "event_type": "MUST_VISIT_ADDED",
        "poi_name": "Akshardham",
        "family_id": "FAM_B"
    }
    
    result = agent.run(preferences=test_event)
    
    print("\nGenerated files:")
    for key, path in result.items():
        exists = "✓" if path.exists() else "✗"
        print(f"  {exists} {key}: {path}")
    
    print("\n" + "=" * 80)
