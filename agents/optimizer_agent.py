"""
Optimizer Agent - Wrapper around the existing optimizer system.
Thin adapter layer that calls your existing optimizer code.
"""
import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

from .config import Config

logger = logging.getLogger(__name__)


class OptimizerAgent:
    """
    Agent responsible for running the optimizer.
    This is a wrapper around your existing optimizer implementation.
    """
    
    def __init__(self):
        """Initialize the Optimizer Agent."""
        self.ml_or_dir = Config.ML_OR_DIR
        self.test_data_dir = Config.TEST_DATA_DIR
        self.agents_dir = Config.AGENTS_DIR
        self.output_dir = self.agents_dir / "tests"
        self.output_dir.mkdir(exist_ok=True)
        logger.info("OptimizerAgent initialized")
    
    def run(
        self,
        preferences: Optional[Dict[str, Any]] = None,
        constraints: Optional[Dict[str, Any]] = None,
        base_solution_path: Optional[Path] = None
    ) -> Dict[str, Path]:
        """
        Run the optimizer with updated preferences/constraints.
        
        Args:
            preferences: Updated family preferences
            constraints: Updated constraints (must-visit, never-visit)
            base_solution_path: Path to base itinerary (if updating existing)
        
        Returns:
            Dictionary with paths to generated files:
            - optimized_solution: Path to optimized_solution.json
            - decision_traces: Path to decision_traces.json
            - enriched_diffs: Path to enriched_diffs.json (if available)
        """
        logger.info("Running optimizer...")
        logger.warning("⚠️  OPTIMIZER STUB MODE: Using static demo data, not processing actual constraints")
        logger.warning("⚠️  All runs will produce identical results (Akshardham scenario)")
        logger.warning("⚠️  TODO: Integrate with ml_or.itinerary_optimizer.ItineraryOptimizer")
        
        # Create timestamped output directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_dir = self.output_dir / f"run_{timestamp}"
        run_dir.mkdir(exist_ok=True)
        logger.info(f"Saving results to: {run_dir}")
        
        # ═══════════════════════════════════════════════════════════════════════
        # CRITICAL: This is a STUB implementation for demonstration purposes
        # ═══════════════════════════════════════════════════════════════════════
        # The optimizer currently ignores the `preferences` and `constraints` 
        # parameters and always copies the same demo files from:
        #   ml_or/tests/solved/3fam3daypref/
        # 
        # This means:
        # - MUST_VISIT_ADDED events don't add the requested POI
        # - NEVER_VISIT_ADDED events don't exclude the requested POI  
        # - All optimizer runs produce identical results
        #
        # TO INTEGRATE THE REAL OPTIMIZER:
        # 1. Import: from ml_or.itinerary_optimizer import ItineraryOptimizer
        # 2. Load locations, transport, base itinerary
        # 3. Build family_preferences dict from `preferences` parameter
        # 4. Call optimizer.optimize_trip() with updated preferences
        # 5. Run the explainability pipeline (diff_engine, causal_tagger, etc.)
        # 6. Save all outputs to run_dir
        #
        # See ml_or/tests/solved/3fam3daypref/run_preference_scenario.py 
        # for a complete example of the integration workflow.
        # ═══════════════════════════════════════════════════════════════════════
        
        # Copy demo files to output directory for demonstration of the pipeline
        import shutil
        result = {
            "optimized_solution": run_dir / "optimized_solution.json",
            "decision_traces": run_dir / "decision_traces.json",
            "enriched_diffs": run_dir / "enriched_diffs.json",
            "llm_payloads": run_dir / "llm_payloads.json"
        }
        
        # Copy files from demo data
        for key, dest_path in result.items():
            src_path = self.test_data_dir / f"{dest_path.name}"
            if src_path.exists():
                shutil.copy(src_path, dest_path)
                logger.info(f"Copied {key} to {dest_path}")
        
        logger.info("Optimizer completed successfully (DEMO MODE)")
        return result
    
    def load_solution(self, solution_path: Path) -> Dict[str, Any]:
        """
        Load an optimized solution from file.
        
        Args:
            solution_path: Path to optimized_solution.json
        
        Returns:
            Parsed solution data
        """
        try:
            with open(solution_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading solution from {solution_path}: {e}")
            return {}
    
    def load_decision_traces(self, traces_path: Path) -> Dict[str, Any]:
        """
        Load decision traces from file.
        
        Args:
            traces_path: Path to decision_traces.json
        
        Returns:
            Parsed decision traces data
        """
        try:
            with open(traces_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading decision traces from {traces_path}: {e}")
            return {}
    
    def load_enriched_diffs(self, diffs_path: Path) -> Dict[str, Any]:
        """
        Load enriched diffs from file.
        
        Args:
            diffs_path: Path to enriched_diffs.json
        
        Returns:
            Parsed enriched diffs data
        """
        try:
            with open(diffs_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading enriched diffs from {diffs_path}: {e}")
            return {}


# Test function for standalone execution
if __name__ == "__main__":
    print("=" * 80)
    print("OPTIMIZER AGENT TEST")
    print("=" * 80)
    
    agent = OptimizerAgent()
    
    # Test running optimizer
    print("\nRunning optimizer...")
    result = agent.run()
    
    print("\nGenerated files:")
    for key, path in result.items():
        exists = "✓" if path.exists() else "✗"
        print(f"  {exists} {key}: {path}")
    
    # Test loading files
    if result["optimized_solution"].exists():
        print("\nLoading optimized solution...")
        solution = agent.load_solution(result["optimized_solution"])
        print(f"  Loaded {len(solution)} top-level keys")
    
    if result["decision_traces"].exists():
        print("\nLoading decision traces...")
        traces = agent.load_decision_traces(result["decision_traces"])
        print(f"  Loaded decision traces")
    
    print("\n" + "=" * 80)
