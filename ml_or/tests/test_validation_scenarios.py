"""
Validation Test Scenarios for Multi-Family Optimization
========================================================

This module contains adversarial test scenarios designed to validate
the behavior of the multi-family optimizer under stress conditions.

Philosophy:
- Test behavior BEFORE tuning parameters
- Force divergence through extreme preferences
- Validate constraint handling
- Measure divergence patterns

Test Scenarios:
1. Scenario A: Forced Divergence (Nightlife vs Religious families)
2. Scenario B: Must-Visit Conflict (Hard constraint precedence)
3. Scenario C: Budget vs Time Sensitivity (Transport choice)
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from itinerary_optimizer import ItineraryOptimizer


@dataclass
class ValidationMetrics:
    """Metrics for validation analysis"""
    scenario_name: str
    poi_overlap_percent: float
    divergence_penalty: float
    order_deviation_count: int
    objective_value: float
    solve_time_seconds: float
    families_diverged: bool
    families_rejoined: bool
    transport_choices_differ: bool
    constraints_satisfied: bool


class ValidationScenarioRunner:
    """Runner for validation test scenarios"""
    
    def __init__(self, optimizer: ItineraryOptimizer):
        self.optimizer = optimizer
        self.results = []
    
    def calculate_poi_overlap(self, solution: Dict) -> float:
        """Calculate POI overlap percentage between families"""
        families_data = solution['families']
        family_ids = list(families_data.keys())
        
        if len(family_ids) < 2:
            return 100.0
        
        # Get POI sets for each family
        poi_sets = []
        for fid in family_ids:
            pois = [p['location_id'] for p in families_data[fid]['pois']]
            poi_sets.append(set(pois))
        
        # Calculate pairwise overlap
        overlaps = []
        for i in range(len(poi_sets)):
            for j in range(i + 1, len(poi_sets)):
                intersection = poi_sets[i] & poi_sets[j]
                union = poi_sets[i] | poi_sets[j]
                if len(union) > 0:
                    overlap = len(intersection) / len(union) * 100
                    overlaps.append(overlap)
        
        return sum(overlaps) / len(overlaps) if overlaps else 100.0
    
    def check_families_rejoined(self, solution: Dict) -> bool:
        """Check if families that diverged later rejoined"""
        families_data = solution['families']
        family_ids = list(families_data.keys())
        
        if len(family_ids) < 2:
            return True
        
        # Get POI sequences
        sequences = {}
        for fid in family_ids:
            sequences[fid] = [p['location_id'] for p in families_data[fid]['pois']]
        
        # Check if there's a divergence followed by convergence
        fid1, fid2 = family_ids[0], family_ids[1]
        seq1, seq2 = sequences[fid1], sequences[fid2]
        
        # Find common POIs
        common_pois = set(seq1) & set(seq2)
        
        if len(common_pois) == 0:
            return False  # Never rejoined
        
        # Check if they rejoin after diverging
        # This is a simplified check - families rejoin if they share any POI
        return len(common_pois) > 0
    
    def check_transport_differs(self, solution: Dict) -> bool:
        """Check if families chose different transport modes (for Scenario C)"""
        # This would require family-specific transport tracking
        # For now, return False as current implementation uses shared transport
        return False
    
    def validate_constraints(self, solution: Dict, scenario_config: Dict) -> bool:
        """Validate that all hard constraints are satisfied"""
        families_data = solution['families']
        
        for fid, fdata in families_data.items():
            visited_pois = [p['location_id'] for p in fdata['pois']]
            
            # Check must-visit constraints
            if 'must_visit' in scenario_config.get(fid, {}):
                must_visit = scenario_config[fid]['must_visit']
                for poi in must_visit:
                    if poi not in visited_pois:
                        print(f"[X] CONSTRAINT VIOLATION: {fid} did not visit must-visit POI {poi}")
                        return False
            
            # Check never-visit constraints
            if 'never_visit' in scenario_config.get(fid, {}):
                never_visit = scenario_config[fid]['never_visit']
                for poi in never_visit:
                    if poi in visited_pois:
                        print(f"[X] CONSTRAINT VIOLATION: {fid} visited never-visit POI {poi}")
                        return False
        
        return True
    
    def run_scenario(
        self,
        scenario_name: str,
        family_ids: List[str],
        day_index: int = 0,
        max_pois: int = 3,
        scenario_config: Dict = None
    ) -> Tuple[Dict, ValidationMetrics]:
        """
        Run a validation scenario and return solution + metrics
        
        Args:
            scenario_name: Name of the scenario
            family_ids: List of family IDs to optimize
            day_index: Day index from base itinerary
            max_pois: Maximum POIs to consider
            scenario_config: Additional configuration (must-visit, never-visit, etc.)
        
        Returns:
            Tuple of (solution_dict, validation_metrics)
        """
        print(f"\n{'='*80}")
        print(f"VALIDATION SCENARIO: {scenario_name}")
        print(f"{'='*80}")
        print(f"Families: {family_ids}")
        print(f"Day: {day_index + 1}")
        print(f"Max POIs: {max_pois}")
        print()
        
        # Run optimizer (using default lambda_divergence=0.3)
        solution = self.optimizer.optimize_multi_family_single_day(
            family_ids=family_ids,
            day_index=day_index,
            max_pois=max_pois,
            time_limit_seconds=60
        )
        
        if not solution:
            print(f"[X] SCENARIO FAILED: No feasible solution found")
            return None, None
        
        # Calculate metrics
        poi_overlap = self.calculate_poi_overlap(solution)
        families_diverged = poi_overlap < 100.0
        families_rejoined = self.check_families_rejoined(solution)
        transport_differs = self.check_transport_differs(solution)
        constraints_ok = self.validate_constraints(solution, scenario_config or {})
        
        # Extract divergence penalty (would need to be added to solution output)
        # For now, estimate from objective value
        divergence_penalty = 0.0  # Placeholder
        order_deviation = 0  # Placeholder
        
        metrics = ValidationMetrics(
            scenario_name=scenario_name,
            poi_overlap_percent=poi_overlap,
            divergence_penalty=divergence_penalty,
            order_deviation_count=order_deviation,
            objective_value=solution['objective_value'],
            solve_time_seconds=solution['solve_time_seconds'],
            families_diverged=families_diverged,
            families_rejoined=families_rejoined,
            transport_choices_differ=transport_differs,
            constraints_satisfied=constraints_ok
        )
        
        # Print results
        print(f"\n{'='*80}")
        print(f"SCENARIO RESULTS: {scenario_name}")
        print(f"{'='*80}")
        print(f"[*] POI Overlap: {poi_overlap:.1f}%")
        print(f"[*] Families Diverged: {'YES' if families_diverged else 'NO'}")
        print(f"[*] Families Rejoined: {'YES' if families_rejoined else 'NO'}")
        print(f"[*] Constraints Satisfied: {'YES' if constraints_ok else 'NO'}")
        print(f"[*] Objective Value: {solution['objective_value']:.2f}")
        print(f"[*] Solve Time: {solution['solve_time_seconds']:.3f}s")
        print()
        
        # Print family details
        for fid, fdata in solution['families'].items():
            poi_names = [p['location_name'] for p in fdata['pois']]
            print(f"{fid}:")
            print(f"  - POIs: {' -> '.join(poi_names)}")
            print(f"  - Satisfaction: {fdata['total_satisfaction']:.2f}")
        
        self.results.append(metrics)
        return solution, metrics


def scenario_a_forced_divergence():
    """
    Scenario A: Forced Divergence (Nightlife vs Religious)
    
    Goal: Force families to skip different POIs based on extreme preferences
    
    Expected:
    - One family skips nightlife POI
    - One family skips religious POI
    - Both visit neutral POI
    - Divergence is local
    """
    print("\n" + "="*80)
    print("SCENARIO A: FORCED DIVERGENCE (Nightlife vs Religious)")
    print("="*80)
    
    # Create temporary family preferences
    # Note: This requires modifying family_preferences.json or creating test families
    
    optimizer = ItineraryOptimizer()
    runner = ValidationScenarioRunner(optimizer)
    
    # For now, use existing families with different preferences
    # FAM_001: High history/architecture, low nightlife
    # FAM_002: High nightlife/food, low religious
    
    solution, metrics = runner.run_scenario(
        scenario_name="Forced Divergence",
        family_ids=["FAM_001", "FAM_002"],
        day_index=0,
        max_pois=3
    )
    
    # Save results
    if solution:
        output_file = "ml_or/tests/results_scenario_a.json"
        with open(output_file, 'w') as f:
            json.dump(solution, f, indent=2)
        print(f"\n[OK] Results saved to: {output_file}")
    
    return solution, metrics


def scenario_b_must_visit_conflict():
    """
    Scenario B: Must-Visit Conflict
    
    Goal: Test hard constraint precedence when families have conflicting constraints
    
    Expected:
    - One family visits must-visit POI
    - Other family skips it (never-visit)
    - Families rejoin after conflict
    """
    print("\n" + "="*80)
    print("SCENARIO B: MUST-VISIT CONFLICT")
    print("="*80)
    
    optimizer = ItineraryOptimizer()
    runner = ValidationScenarioRunner(optimizer)
    
    # FAM_001: must_visit = [LOC_001, LOC_002]
    # FAM_002: must_visit = [LOC_003], never_visit = [LOC_004]
    
    scenario_config = {
        "FAM_001": {
            "must_visit": ["LOC_001", "LOC_002"],
            "never_visit": ["LOC_005"]
        },
        "FAM_002": {
            "must_visit": ["LOC_003"],
            "never_visit": ["LOC_004"]
        }
    }
    
    solution, metrics = runner.run_scenario(
        scenario_name="Must-Visit Conflict",
        family_ids=["FAM_001", "FAM_002"],
        day_index=0,
        max_pois=3,
        scenario_config=scenario_config
    )
    
    # Save results
    if solution:
        output_file = "ml_or/tests/results_scenario_b.json"
        with open(output_file, 'w') as f:
            json.dump(solution, f, indent=2)
        print(f"\n[OK] Results saved to: {output_file}")
    
    return solution, metrics


def scenario_c_budget_vs_time():
    """
    Scenario C: Budget vs Time Sensitivity
    
    Goal: Validate transport choice under shared ordering
    
    Expected:
    - Same POIs visited
    - Different transport modes (if implemented)
    - Budget family chooses cheaper transport
    - Time-sensitive family chooses faster transport
    """
    print("\n" + "="*80)
    print("SCENARIO C: BUDGET VS TIME SENSITIVITY")
    print("="*80)
    print("[!] NOTE: Current implementation uses shared transport")
    print("    This scenario will validate shared ordering with different preferences")
    print()
    
    optimizer = ItineraryOptimizer()
    runner = ValidationScenarioRunner(optimizer)
    
    # FAM_001: budget_sensitivity = 0.7
    # FAM_002: budget_sensitivity = 0.4 (less sensitive, prefers speed)
    
    solution, metrics = runner.run_scenario(
        scenario_name="Budget vs Time",
        family_ids=["FAM_001", "FAM_002"],
        day_index=0,
        max_pois=3
    )
    
    # Save results
    if solution:
        output_file = "ml_or/tests/results_scenario_c.json"
        with open(output_file, 'w') as f:
            json.dump(solution, f, indent=2)
        print(f"\n[OK] Results saved to: {output_file}")
    
    return solution, metrics


def main():
    """Run all validation scenarios"""
    print("\n" + "="*80)
    print("MULTI-FAMILY OPTIMIZATION - VALIDATION TEST SUITE")
    print("="*80)
    print()
    print("Goal: Validate solver behavior under adversarial conditions")
    print("Approach: Force divergence through extreme preferences")
    print()
    print("TUNED PARAMETERS (updated for better divergence):")
    print("  - lambda_coherence: 10 (reduced from 30)")
    print("  - lambda_divergence: 0.3 (reduced from 0.5)")
    print("  - Expected: Families can diverge when preferences justify it")
    print()
    
    results = []
    
    # Run Scenario A
    print("\n" + "-"*80)
    sol_a, metrics_a = scenario_a_forced_divergence()
    if metrics_a:
        results.append(metrics_a)
    
    # Run Scenario B
    print("\n" + "-"*80)
    sol_b, metrics_b = scenario_b_must_visit_conflict()
    if metrics_b:
        results.append(metrics_b)
    
    # Run Scenario C
    print("\n" + "-"*80)
    sol_c, metrics_c = scenario_c_budget_vs_time()
    if metrics_c:
        results.append(metrics_c)
    
    # Summary
    print("\n" + "="*80)
    print("VALIDATION SUMMARY")
    print("="*80)
    print()
    
    for metrics in results:
        print(f"Scenario: {metrics.scenario_name}")
        print(f"  - POI Overlap: {metrics.poi_overlap_percent:.1f}%")
        print(f"  - Diverged: {'YES' if metrics.families_diverged else 'NO'}")
        print(f"  - Rejoined: {'YES' if metrics.families_rejoined else 'NO'}")
        print(f"  - Constraints OK: {'YES' if metrics.constraints_satisfied else 'NO'}")
        print(f"  - Objective: {metrics.objective_value:.2f}")
        print()
    
    # Analysis
    print("="*80)
    print("ANALYSIS")
    print("="*80)
    
    any_divergence = any(m.families_diverged for m in results)
    
    if not any_divergence:
        print("[!] NO DIVERGENCE OBSERVED IN ANY SCENARIO")
        print()
        print("This suggests coherence penalties are too strong.")
        print("Recommendation: Proceed to parameter tuning phase")
        print("  - Reduce lambda_coherence from 30 to 15-20")
        print("  - Reduce lambda_divergence from 0.5 to 0.3")
    else:
        print("[OK] DIVERGENCE OBSERVED")
        print()
        print("Families are able to diverge when preferences justify it.")
        print("Next: Analyze if divergence is local vs global")
        print("      Check if families rejoin naturally")
    
    print()
    print("="*80)
    print("VALIDATION TESTING COMPLETE")
    print("="*80)


if __name__ == "__main__":
    main()
