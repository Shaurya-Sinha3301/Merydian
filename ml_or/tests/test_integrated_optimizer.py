import sys
import os
import json

# Add project root to path (must be first)
sys.path.append(os.getcwd())

from ml_or.itinerary_optimizer import ItineraryOptimizer

def test_integration():
    # 1. Setup paths
    base_itinerary = "ml_or/data/base_itinerary_clustered.json"
    backbone = "ml_or/data/optimized_backbone.json"
    
    if not os.path.exists(base_itinerary):
        print(f"Error: {base_itinerary} not found.")
        return
    if not os.path.exists(backbone):
        print(f"Error: {backbone} not found.")
        return

    # 2. Initialize Optimizer
    print(f"Initializing Optimizer with {base_itinerary}...")
    optimizer = ItineraryOptimizer(
        base_itinerary_file=base_itinerary,
        family_prefs_file="ml_or/data/family_preferences_3fam_strict.json",
        optimized_backbone_file=backbone
    )
    
    # 3. Check loaded backbone
    print("Hotel Assignments Loaded (Snippet):")
    # print(json.dumps(optimizer.hotel_assignments, indent=2))
    fam_a_hotels = optimizer.hotel_assignments.get("FAM_A", [])
    print(f"FAM_A Hotels: {[h.get('hotel_name') for h in fam_a_hotels]}")
    
    # 4. Run Optimization for Day 1
    print("\n------------------------------------------------")
    print("Running Optimization for Day 1 (Expect City Park)...")
    result = optimizer.optimize_multi_family_single_day(
        family_ids=["FAM_A", "FAM_B", "FAM_C"], 
        day_index=0,
        enable_trace=True
    )
    
    # 5. Run Optimization for Day 2 (South Delhi -> Oodles)
    print("\n------------------------------------------------")
    print("Running Optimization for Day 2 (Expect Oodles)...")
    result2 = optimizer.optimize_multi_family_single_day(
        family_ids=["FAM_A", "FAM_B", "FAM_C"], 
        day_index=1,
        enable_trace=True
    )
    
    print("\n------------------------------------------------")
    print("Test Complete.")

if __name__ == "__main__":
    test_integration()
