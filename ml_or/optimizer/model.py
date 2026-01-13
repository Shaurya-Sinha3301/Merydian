"""
OR-Tools CP-SAT model builder for per-grouping optimization.
Solves transport selection for a single subgroup configuration.
"""

from typing import List, Dict, Optional, Tuple
from ortools.sat.python import cp_model

try:
    from ml_or.optimizer.schemas import TransportOption
    from ml_or.optimizer.utils import time_to_minutes
except ImportError:
    from schemas import TransportOption
    from utils import time_to_minutes


class TransportOptimizer:
    """
    Builds and solves OR-Tools CP-SAT model for transport selection.
    Optimizes for a single grouping configuration.
    """

    def __init__(self, verbose: bool = False):
        """
        Initialize the optimizer.
        
        Args:
            verbose: Whether to print solver progress
        """
        self.verbose = verbose
        self.model = None
        self.solver = None

    def build_model(
        self,
        transport_options: List[TransportOption],
        max_cost: float,
        latest_arrival_minutes: int,
        time_weight: float = 0.4,
        cost_weight: float = 0.4
    ) -> Optional[Dict]:
        """
        Build and solve the CP-SAT model for transport selection.
        
        Args:
            transport_options: Available transport options
            max_cost: Maximum allowed cost per person
            latest_arrival_minutes: Latest allowed arrival time (minutes since midnight)
            time_weight: Weight for time in objective
            cost_weight: Weight for cost in objective
        
        Returns:
            Solution dict if feasible, None if infeasible
        """
        model = cp_model.CpModel()
        
        # Decision variables: one binary variable per transport option
        option_vars = []
        for i, option in enumerate(transport_options):
            var = model.NewBoolVar(f'option_{i}')
            option_vars.append(var)
        
        # Constraint: exactly one option must be selected
        model.AddExactlyOne(option_vars)
        
        # Constraint: cost must be within budget
        cost_terms = []
        for i, option in enumerate(transport_options):
            if option.cost_per_person <= max_cost:
                cost_terms.append((option_vars[i], int(option.cost_per_person * 100)))
        
        if cost_terms:
            model.Add(cp_model.LinearExpr.WeightedSum(
                [term[0] for term in cost_terms],
                [term[1] for term in cost_terms]
            ) <= int(max_cost * 100))
        else:
            # No options within budget - immediately infeasible
            return None
        
        # Constraint: arrival time must be before latest arrival
        arrival_terms = []
        for i, option in enumerate(transport_options):
            arrival_minutes = time_to_minutes(option.arrival_time)
            if arrival_minutes <= latest_arrival_minutes:
                arrival_terms.append((option_vars[i], arrival_minutes))
        
        if arrival_terms:
            model.Add(cp_model.LinearExpr.WeightedSum(
                [term[0] for term in arrival_terms],
                [term[1] for term in arrival_terms]
            ) <= latest_arrival_minutes)
        else:
            # No options meet arrival constraint - immediately infeasible
            return None
        
        # Objective: minimize weighted duration + cost
        objective_terms = []
        objective_weights = []
        
        for i, option in enumerate(transport_options):
            # Duration term
            if time_weight > 0:
                objective_terms.append(option_vars[i])
                objective_weights.append(int(option.duration_minutes * time_weight))
            
            # Cost term
            if cost_weight > 0:
                objective_terms.append(option_vars[i])
                objective_weights.append(int(option.cost_per_person * cost_weight))
        
        if objective_terms:
            model.Minimize(
                cp_model.LinearExpr.WeightedSum(objective_terms, objective_weights)
            )
        
        # Solve
        solver = cp_model.CpSolver()
        status = solver.Solve(model)
        
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return None
        
        # Extract solution
        chosen_idx = None
        for i, var in enumerate(option_vars):
            if solver.Value(var) == 1:
                chosen_idx = i
                break
        
        if chosen_idx is None:
            return None
        
        chosen_option = transport_options[chosen_idx]
        
        return {
            'chosen_leg': chosen_option.leg_id,
            'cost_per_person': chosen_option.cost_per_person,
            'arrival_time': chosen_option.arrival_time,
            'duration': chosen_option.duration_minutes,
            'objective_value': solver.ObjectiveValue()
        }

    def solve_grouping(
        self,
        grouping: List[List[str]],
        transport_options: List[TransportOption],
        max_cost: float,
        latest_arrival_minutes: int,
        time_weight: float = 0.4,
        cost_weight: float = 0.4
    ) -> Optional[Dict]:
        """
        Solve optimization for a single grouping.
        
        For simplicity, we assume all subgroups in a grouping take the same transport leg.
        This is a reasonable assumption for group travel where coordination matters.
        
        Args:
            grouping: List of subgroups
            transport_options: Available transport options
            max_cost: Maximum cost per person
            latest_arrival_minutes: Latest arrival time
            time_weight: Weight for time
            cost_weight: Weight for cost
        
        Returns:
            Solution dict with chosen_legs (one per subgroup) or None if infeasible
        """
        solution = self.build_model(
            transport_options,
            max_cost,
            latest_arrival_minutes,
            time_weight,
            cost_weight
        )
        
        if solution is None:
            return None
        
        # For all subgroups, use the same chosen leg (group stays together)
        chosen_legs = [solution['chosen_leg'] for _ in grouping]
        
        return {
            'grouping': grouping,
            'chosen_legs': chosen_legs,
            'chosen_leg': solution['chosen_leg'],  # For consistency
            'cost_per_person': solution['cost_per_person'],
            'arrival_time': solution['arrival_time'],
            'duration': solution['duration']
        }
