
"""
Test script for Partial Trip Optimization with Transport Disruption.

Scenario:
1. Trip Plan: 3 Days.
2. State: Start of Day 2.
    - Day 1 is COMPLETE.
    - History: FAM_A visited LOC_001 (Red Fort).
3. Event: "All bus routes are disrupted" (Family B).
4. Action: Re-optimize Days 2-3.
5. Verification:
    - Optimization starts from Day 2.
    - No BUS edges are used in the new plan.
    - Day 1 history is respected.
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from ml_or.itinerary_optimizer import ItineraryOptimizer

OUTPUT_DIR = Path("agents/tests")
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

def test_disruption_partial_opt():
    print("\n[TEST] Scenario: Day 2 Start - Bus Strike")
    
    # 1. Setup Disrupted Transport Graph
    # We load the original, filter out BUS, and save to temp file
    original_transport_path = "ml_or/data/transport_graph.json"
    temp_transport_path = OUTPUT_DIR / "temp_transport_no_bus.json"
    
    with open(original_transport_path, 'r') as f:
        edges = json.load(f)
    
    # Filter out BUS edges
    disrupted_edges = [
        e for e in edges 
        if e.get("mode") != "BUS" 
        # Keep edges that are explicitly NOT bus
    ]
    print(f"\n[SETUP] Disabling BUS routes...")
    print(f"  Original edges: {len(edges)}")
    print(f"  Active edges: {len(disrupted_edges)}")
    
    with open(temp_transport_path, 'w') as f:
        json.dump(disrupted_edges, f)
        
    # 2. Initialize Optimizer with DISRUPTED graph
    optimizer = ItineraryOptimizer(
        locations_file="ml_or/data/locations.json",
        transport_file=str(temp_transport_path),
        base_itinerary_file="ml_or/data/base_itinerary_final.json",
        family_prefs_file="ml_or/data/family_preferences_3fam_strict.json"
    )
    
    # 3. Simulate Day 1 History
    initial_history = {
        "FAM_A": {"LOC_001"}, # Red Fort visited
        "FAM_B": set(),
        "FAM_C": set()
    }
    print(f"\n[STATE] Day 1 Complete. FAM_A visited LOC_001.")
    
    # 4. Run Partial Optimization (Start Day 2 => index 1)
    print("\n[ACTION] Running optimize_trip(start_day_index=1)...")
    start_time = datetime.now()
    partial_solution = optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        num_days=3,
        start_day_index=1,
        initial_visited_history=initial_history
    )
    end_time = datetime.now()
    
    # 5. Verify & Save Results
    output_file = OUTPUT_DIR / "partial_opt_disruption_result.json"
    with open(output_file, 'w') as f:
        json.dump(partial_solution, f, indent=2, default=str)
        
    print(f"\n[RESULT] Saved to {output_file}")
    
    # Analysis
    print("\n[VERIFICATION]")
    
    # Check 1: Start Day
    first_day_idx = partial_solution["days"][0]["day"]
    print(f"  Start Day: {first_day_idx} (Expected: 2) -> {'PASS' if first_day_idx == 2 else 'FAIL'}")
    
    # Check 2: Bus Usage
    bus_found = False
    for day in partial_solution["days"]:
        for fam_id, fam_data in day["families"].items():
            for leg in fam_data.get("transport", []):
                if leg["mode"] == "BUS":
                    bus_found = True
                    print(f"  [FAIL] Bus found in {fam_id}, Day {day['day']}!")
    
    if not bus_found:
        print("  Bus Usage: None (Expected) -> PASS")
        
    # Check 3: History (LOC_001 should not appear)
    loc_001_found = False
    for day in partial_solution["days"]:
        fam_a = day["families"]["FAM_A"]
        for poi in fam_a["pois"]:
            if poi["location_id"] == "LOC_001":
                loc_001_found = True
                
    if not loc_001_found:
        print("  History Respect: LOC_001 excluded -> PASS")
    else:
        print("  [FAIL] LOC_001 re-visited!")

    # Cleanup
    if temp_transport_path.exists():
        os.remove(temp_transport_path)

if __name__ == "__main__":
    test_disruption_partial_opt()
