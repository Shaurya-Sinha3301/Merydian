
"""
Test script for Partial Trip Optimization.

Scenario:
1. Simulate a 3-day trip.
2. Assume Day 1 is already completed (history exists).
3. Request optimization for Days 2-3 only.
4. Verify:
    - Optimization starts at Day 2.
    - Day 1 history is respected (e.g., non-repeatable POIs from Day 1 are not visited).
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from ml_or.itinerary_optimizer import ItineraryOptimizer

def test_partial_optimization():
    print("\n[TEST] Starting Partial Optimization Verification...")
    
    # Initialize Optimizer
    optimizer = ItineraryOptimizer(
        locations_file="ml_or/data/locations.json",
        transport_file="ml_or/data/transport_graph.json",
        base_itinerary_file="ml_or/data/base_itinerary_final.json",
        family_prefs_file="ml_or/data/family_preferences_3fam_strict.json"
    )
    
    # 1. Define Fake History for Day 1
    # Assume FAM_A visited "Red Fort" (LOC_001) which is non-repeatable.
    initial_history = {
        "FAM_A": {"LOC_001"},
        "FAM_B": set(),
        "FAM_C": set()
    }
    
    print(f"\n[SETUP] Initial History (Day 1 Executed):")
    print(f"  FAM_A visited: {initial_history['FAM_A']}")
    
    # 2. Run Partial Optimization (Start Day 2 => index 1)
    print("\n[ACTION] Running optimize_trip(start_day_index=1)...")
    partial_solution = optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        num_days=3,
        start_day_index=1,  # <--- KEY PARAMETER
        initial_visited_history=initial_history
    )
    
    # 3. Verify Results
    print("\n[VERIFICATION] Analyzing Result:")
    
    # Check number of days returned
    num_days_optimized = len(partial_solution["days"])
    print(f"  Days returned: {num_days_optimized} (Expected: 2 -> Day 2 and Day 3)")
    
    if num_days_optimized != 2:
        print("  [FAIL] Incorrect number of days returned.")
        return
        
    day_2 = partial_solution["days"][0] # First returned day is Day 2
    day_3 = partial_solution["days"][1] # Second returned day is Day 3
    
    print(f"  First day index: {day_2['day']} (Expected: 2)")
    
    # Check for Red Fort (LOC_001) in FAM_A's itinerary on Day 2 or 3
    # It should be BANNED because it was in history
    loc_001_found = False
    
    for day_res in [day_2, day_3]:
        fam_a_pois = [p['location_id'] for p in day_res['families']['FAM_A']['pois']]
        if "LOC_001" in fam_a_pois:
            loc_001_found = True
            print(f"  [FAIL] LOC_001 found in Day {day_res['day']}! History was ignored.")
            
    if not loc_001_found:
        print("  [PASS] LOC_001 correctly excluded (respected history).")
    
    print("\n[TEST] Verification Complete.")

if __name__ == "__main__":
    test_partial_optimization()
