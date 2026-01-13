"""
Main CLI entry point for the Optimization Agent.
Orchestrates schema validation, per-grouping optimization, meta-scoring, and ranking.
"""

import json
import sys
from typing import List, Dict, Any, Optional, Union
from pathlib import Path

try:
    from ml_or.optimizer.schemas import (
        OptimizationRequest,
        OptimizationResponse,
        OptimizationPlan,
        NoFeasiblePlanResponse,
        PlanLabel,
        TransportOption
    )
    from ml_or.optimizer.model import TransportOptimizer
    from ml_or.optimizer.scorer import MetaScorer
    from ml_or.optimizer.utils import time_to_minutes, calculate_grouping_split_count
except ImportError:
    # Fallback for direct script execution
    from schemas import (
        OptimizationRequest,
        OptimizationResponse,
        OptimizationPlan,
        NoFeasiblePlanResponse,
        PlanLabel,
        TransportOption
    )
    from model import TransportOptimizer
    from scorer import MetaScorer
    from utils import time_to_minutes, calculate_grouping_split_count


class OptimizationAgent:
    """
    Stateless optimization agent for group travel itinerary planning.
    
    Workflow:
    1. Validate input payload
    2. For each candidate grouping:
       - Solve transport selection via OR-Tools
       - Extract solution metrics
    3. Meta-score all feasible solutions
    4. Rank and label top plans
    5. Return ranked plans
    """

    def __init__(self, verbose: bool = False):
        """
        Initialize the agent.
        
        Args:
            verbose: Whether to print progress information
        """
        self.verbose = verbose
        self.optimizer = TransportOptimizer(verbose=verbose)

    def optimize(self, payload: Dict[str, Any]) -> Union[OptimizationResponse, NoFeasiblePlanResponse, Dict]:
        """
        Main optimization workflow.
        
        Args:
            payload: Input payload dict (must match OptimizationRequest schema)
        
        Returns:
            OptimizationResponse (success) or NoFeasiblePlanResponse (no solution)
        """
        # Validate input
        try:
            request = OptimizationRequest(**payload)
        except Exception as e:
            return {
                "error": f"Invalid input payload: {str(e)}",
                "status": "VALIDATION_ERROR"
            }
        
        # Parse constraints
        try:
            latest_arrival_minutes = time_to_minutes(request.constraints.latest_arrival_time)
            max_cost = request.constraints.max_cost_per_person
        except ValueError as e:
            return {
                "error": f"Invalid constraint format: {str(e)}",
                "status": "CONSTRAINT_ERROR"
            }
        
        # Prepare weights
        weights_dict = request.weights.dict()
        
        # Solve each candidate grouping
        feasible_plans = []
        
        for grouping in request.candidate_groupings:
            solution = self.optimizer.solve_grouping(
                grouping,
                request.transport_options,
                max_cost,
                latest_arrival_minutes,
                time_weight=weights_dict['time'],
                cost_weight=weights_dict['cost']
            )
            
            if solution:
                feasible_plans.append(solution)
        
        if not feasible_plans:
            return NoFeasiblePlanResponse(
                optimization_id=request.optimization_id
            ).dict()
        
        # Meta-score and rank
        scorer = MetaScorer(weights_dict)
        scored_plans = scorer.rank_plans(feasible_plans, request.transport_options)
        
        # Select top plans with labels
        top_plans = scorer.select_top_plans(scored_plans, top_k=3)
        
        # Convert to response format
        response_plans = []
        for i, (plan_data, meta_score, label) in enumerate(top_plans):
            response_plan = OptimizationPlan(
                plan_id=f"PLAN_{chr(65 + i)}",  # PLAN_A, PLAN_B, etc.
                label=PlanLabel(label),
                grouping=plan_data['grouping'],
                chosen_legs=plan_data['chosen_legs'],
                arrival_time=plan_data['arrival_time'],
                total_cost_per_person=plan_data['cost_per_person'],
                meta_score=round(meta_score, 4)
            )
            response_plans.append(response_plan)
        
        return OptimizationResponse(
            plans=response_plans,
            optimization_id=request.optimization_id
        ).dict()

    def optimize_from_file(self, filepath: str) -> Union[Dict, str]:
        """
        Load JSON file and run optimization.
        
        Args:
            filepath: Path to JSON file with optimization request
        
        Returns:
            Optimization result as dict
        """
        try:
            with open(filepath, 'r') as f:
                payload = json.load(f)
        except FileNotFoundError:
            return f"Error: File not found: {filepath}"
        except json.JSONDecodeError as e:
            return f"Error: Invalid JSON in file: {str(e)}"
        
        return self.optimize(payload)


def main():
    """
    CLI entry point.
    
    Usage:
        python optimizer.py <input_json_file>
    """
    if len(sys.argv) < 2:
        print("Usage: python optimizer.py <input_json_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    agent = OptimizationAgent(verbose=True)
    result = agent.optimize_from_file(input_file)
    
    if isinstance(result, str):
        print(result, file=sys.stderr)
        sys.exit(1)
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
