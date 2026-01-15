
import sys
import json
import os
sys.path.insert(0, 'ml_or')
from itinerary_optimizer import ItineraryOptimizer

def test_branch_expansion():
    print("="*80)
    print("TESTING BRANCH POI EXPANSION (STEP 15)")
    print("="*80)

    # 1. Setup specific test data
    # Create a base itinerary with NO branch POIs, just 1 Skeleton
    base_itinerary = {
        "itinerary_id": "TEST_EXPANSION",
        "assumptions": {
            "day_start_time": "09:00",
            "day_end_time": "18:00",
            "start_end_location": "LOC_HOTEL"
        },
        "days": [
            {
                "day": 1,
                "start_location": "LOC_HOTEL",
                "end_location": "LOC_HOTEL",
                "pois": [
                    {
                        "sequence": 1,
                        "location_id": "LOC_001", # Red Fort
                        "role": "SKELETON",
                        "planned_visit_time_min": 60
                    }
                ]
            }
        ]
    }
    
    # Save temp base
    with open('ml_or/data/temp_base_expansion.json', 'w') as f:
        json.dump(base_itinerary, f)
        
    # Check locations.json for a suitable candidate
    # LOC_003 (India Gate) is usually close to Red Fort? Or Jama Masjid (LOC_002)?
    # Let's rely on the real locations.json
    
    # Initialize Optimizer
    opt = ItineraryOptimizer(
        base_itinerary_file='ml_or/data/temp_base_expansion.json',
        family_prefs_file='ml_or/data/family_preferences_3fam_strict.json'
    )
    
    print("\n[SETUP] Base Itinerary has ONLY LOC_001 (Red Fort).")
    print("[SETUP] Running expansion for Day 1...")
    
    # Run optimization for 1 day
    # This triggers expand_branch_pois_for_day internal call
    result = opt.optimize_multi_family_single_day(
        family_ids=['FAM_A', 'FAM_B'],
        day_index=0,
        max_pois=10, # Allow room for expansion
        lambda_divergence=0.5
    )
    
    if result:
        print("\n[RESULT] Optimization Successful")
        print(f"Total Transport Cost: {result['total_transport_cost']}")
        
        # Check if any non-base POIs were visited
        all_visited = result['shared_poi_order']
        # Also check family specific paths
        for fid, data in result['families'].items():
            for p in data['pois']:
                if p['location_id'] not in all_visited:
                    all_visited.append(p['location_id'])
        
        # Base POIs were just LOC_001
        extras = [p for p in all_visited if p != 'LOC_001' and p != 'LOC_HOTEL' and p != 'START_DAY_1' and p != 'END_DAY_1']
        
        if extras:
            print(f"✅ SUCCESS: Automatically discovered and visited: {extras}")
        else:
            print("⚠️ WARNING: No extra POIs visited. (Might be due to time/cost constraints)")
            
            # Check logs to see if they were at least CANDIDATES
            print("Check console output above for '[EXPANSION]' logs.")
            
    else:
        print("❌ FAILED: Optimization failed.")

    # Cleanup
    if os.path.exists('ml_or/data/temp_base_expansion.json'):
         os.remove('ml_or/data/temp_base_expansion.json')

if __name__ == "__main__":
    test_branch_expansion()
