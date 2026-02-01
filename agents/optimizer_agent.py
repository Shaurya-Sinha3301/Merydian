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
        base_solution_path: Optional[Path] = None
    ) -> Dict[str, Path]:
        """
        Run the optimizer with updated preferences/constraints.
        
        Args:
            preferences: FeedbackEvent dictionary with user preference change
            constraints: Updated constraints (currently unused)
            base_solution_path: Path to baseline solution for comparison (optional)
        
        Returns:
            Dictionary with paths to generated files
        """
        from datetime import datetime
        
        logger.info("Running optimizer with real ItineraryOptimizer...")
        
        # Create timestamped output directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_dir = self.output_dir / f"run_{timestamp}"
        run_dir.mkdir(exist_ok=True)
        logger.info(f"Saving results to: {run_dir}")
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 1: Build Updated Family Preferences
        # ═══════════════════════════════════════════════════════════════
        
        # Load base preferences
        base_prefs = load_base_preferences(self.base_prefs_path)
        
        # Ensure all families have at least empty preferences
        all_families = ["FAM_A", "FAM_B", "FAM_C"]
        for fam_id in all_families:
            if fam_id not in base_prefs:
                base_prefs[fam_id] = {
                    "must_visit": [],
                    "never_visit": [],
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
        
        logger.info("Running optimization...")
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
            "llm_payloads": payloads_path
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
