"""
Optimizer Agent - Wrapper around the existing optimizer system.
Thin adapter layer that calls your existing optimizer code.
"""
import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional

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
        
        # For demo purposes, we'll use the existing test data
        # In production, this would call your actual optimizer code
        
        # TODO: Integrate with actual optimizer
        # For now, return paths to existing demo files
        result = {
            "optimized_solution": self.test_data_dir / "optimized_solution.json",
            "decision_traces": self.test_data_dir / "decision_traces.json",
            "enriched_diffs": self.test_data_dir / "enriched_diffs.json"
        }
        
        # Verify files exist
        for key, path in result.items():
            if not path.exists():
                logger.warning(f"{key} not found at {path}")
        
        logger.info("Optimizer completed successfully")
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
