"""
Meta-scoring logic for ranking optimization plans.
Applies weights to normalized metrics and split penalties.
"""

from typing import List, Tuple, Dict, Any

try:
    from ml_or.optimizer.schemas import OptimizationPlan, PlanLabel, TransportOption
    from ml_or.optimizer.utils import normalize_values, time_to_minutes, calculate_grouping_split_count
except ImportError:
    from schemas import OptimizationPlan, PlanLabel, TransportOption
    from utils import normalize_values, time_to_minutes, calculate_grouping_split_count


class MetaScorer:
    """
    Scores and ranks optimization plans based on meta-metrics.
    
    Combines time, cost, and split penalties into a single meta-score.
    Lower scores are better.
    """

    def __init__(self, weights: Dict[str, float]):
        """
        Initialize scorer with weights.
        
        Args:
            weights: Dict with keys 'time', 'cost', 'split_penalty'
        """
        self.w_time = weights.get('time', 0.4)
        self.w_cost = weights.get('cost', 0.4)
        self.w_split = weights.get('split_penalty', 0.2)

    def score_plan(
        self,
        grouping: List[List[str]],
        chosen_leg: str,
        transport_options: List[TransportOption],
        cost_per_person: float,
        all_durations: List[int],
        all_costs: List[float]
    ) -> float:
        """
        Calculate meta-score for a single plan.
        
        Args:
            grouping: The subgroups in this plan
            chosen_leg: The leg ID chosen
            transport_options: All available transport options
            cost_per_person: Cost for this plan
            all_durations: All durations in the problem (for normalization)
            all_costs: All costs in the problem (for normalization)
        
        Returns:
            Meta-score (lower is better)
        """
        # Get duration for chosen leg
        chosen_option = None
        for option in transport_options:
            if option.leg_id == chosen_leg:
                chosen_option = option
                break
        
        if chosen_option is None:
            raise ValueError(f"Chosen leg {chosen_leg} not found in transport options")
        
        duration = chosen_option.duration_minutes
        
        # Normalize metrics
        normalized_durations = normalize_values(all_durations)
        normalized_costs = normalize_values(all_costs)
        
        # Find indices for this plan's values
        duration_idx = all_durations.index(duration)
        cost_idx = all_costs.index(cost_per_person)
        
        normalized_duration = normalized_durations[duration_idx]
        normalized_cost = normalized_costs[cost_idx]
        
        # Calculate split penalty
        num_subgroups = calculate_grouping_split_count(grouping)
        split_penalty = num_subgroups - 1
        
        # Meta-score calculation
        meta_score = (
            self.w_time * normalized_duration +
            self.w_cost * normalized_cost +
            self.w_split * split_penalty
        )
        
        return meta_score

    def rank_plans(
        self,
        plans_data: List[Dict[str, Any]],
        transport_options: List[TransportOption]
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Rank feasible plans by meta-score.
        
        Args:
            plans_data: List of plan dicts with keys:
                - grouping, chosen_leg, cost_per_person
            transport_options: All available transport options
        
        Returns:
            List of (plan_dict, meta_score) tuples sorted by score (ascending)
        """
        if not plans_data:
            return []
        
        # Extract all durations and costs for normalization
        all_durations = []
        all_costs = []
        for plan in plans_data:
            for option in transport_options:
                if option.leg_id == plan['chosen_leg']:
                    all_durations.append(option.duration_minutes)
                    break
            all_costs.append(plan['cost_per_person'])
        
        # Score each plan
        scored_plans = []
        for plan in plans_data:
            score = self.score_plan(
                plan['grouping'],
                plan['chosen_leg'],
                transport_options,
                plan['cost_per_person'],
                all_durations,
                all_costs
            )
            scored_plans.append((plan, score))
        
        # Sort by score (ascending)
        scored_plans.sort(key=lambda x: x[1])
        
        return scored_plans

    def assign_labels(self, scored_plans: List[Tuple[Dict, float]]) -> List[str]:
        """
        Assign descriptive labels to top plans.
        
        Args:
            scored_plans: Ranked list of (plan_dict, meta_score) tuples
        
        Returns:
            List of labels corresponding to input plans
        """
        if not scored_plans:
            return []
        
        labels = ["balanced"] * len(scored_plans)
        
        if len(scored_plans) >= 1:
            # Lowest score is balanced (already assigned)
            labels[0] = "balanced"
        
        if len(scored_plans) >= 2:
            # Find cheapest plan
            min_cost_idx = 0
            min_cost = scored_plans[0][0]['cost_per_person']
            for i, (plan, _) in enumerate(scored_plans):
                if plan['cost_per_person'] < min_cost:
                    min_cost = plan['cost_per_person']
                    min_cost_idx = i
            labels[min_cost_idx] = "cheapest"
        
        if len(scored_plans) >= 3:
            # Find fastest plan
            min_duration_idx = 0
            min_duration = float('inf')
            for i, (plan, _) in enumerate(scored_plans):
                # Duration is stored in the plan
                if 'duration' not in plan:
                    continue
                if plan['duration'] < min_duration:
                    min_duration = plan['duration']
                    min_duration_idx = i
            if min_duration != float('inf'):
                labels[min_duration_idx] = "fastest"
        
        return labels

    def select_top_plans(
        self,
        scored_plans: List[Tuple[Dict, float]],
        top_k: int = 3
    ) -> List[Tuple[Dict, float, str]]:
        """
        Select top K plans and assign labels.
        
        Args:
            scored_plans: Ranked list of (plan_dict, meta_score) tuples
            top_k: Number of top plans to return
        
        Returns:
            List of (plan_dict, meta_score, label) tuples
        """
        top_plans = scored_plans[:top_k]
        labels = self.assign_labels(top_plans)
        
        return [(plan, score, label) for (plan, score), label in zip(top_plans, labels)]
