
import json
import sys
import os

# Add root to python path
sys.path.append(os.getcwd())

from ml_or.itinerary_optimizer import ItineraryOptimizer

def test_hotel_integration():
    print("Initializing Optimizer...")
    optimizer = ItineraryOptimizer(
        locations_file="ml_or/data/locations.json",
        base_itinerary_file="ml_or/data/base_itinerary_final.json",
        family_prefs_file="ml_or/data/family_preferences_3fam_strict.json"
    )
    
    # Run optimization for Day 1
    print("\nRunning optimization for Day 1...")
    solution = optimizer.optimize_multi_family_single_day(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        day_index=0,
        time_limit_seconds=10
    )
    
    if not solution:
        print("FAIL: No solution found!")
        return
        
    print("\nSolution Found!")
    print(f"Shared POI Order: {solution['shared_poi_order']}")
    
    # Check Transport Details for Start/End
    print("\nVerifying Family Paths:")
    for fid, fam_data in solution['families'].items():
        print(f"\n[{fid}] Path:")
        path_nodes = fam_data.get('path', [])
        transport = fam_data.get('transport', [])
        
        # Merge path and transport for clear view
        # Path nodes: [LocA, LocB, LocC]
        # Transport: [Start->LocA, LocA->LocB, LocB->LocC, LocC->End]
        
        assigned_hotel = optimizer.hotel_assignments[fid]['hotel_id']
        print(f"  Hotel Assignment: {assigned_hotel}")
        
        # Print leg by leg
        for leg in transport:
             print(f"  {leg['from']} -> {leg['to']} ({leg['duration_min']} min)")

if __name__ == "__main__":
    test_hotel_integration()
