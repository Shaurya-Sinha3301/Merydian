
import json
import os
import sys

# Ensure we can import modules from ml_or
sys.path.append('ml_or')

from trip_navigator import TripNavigator
from itinerary_optimizer import ItineraryOptimizer

def run_demo():
    print("="*60)
    print(">>> RUNNING REAL-TIME NAVIGATOR DEMO")
    print("="*60)

    
    # 1. Load Scenario
    scenario_path = "ml_or/data/simple_demo.json"
    if not os.path.exists(scenario_path):

        print(f"❌ Scenario file not found: {scenario_path}")
        print("Please run `python generate_demo_scenario.py` first.")
        return

    with open(scenario_path, 'r') as f:
        scenario = json.load(f)
        
    print("Loaded Scenario:")
    print(f"  Day Index: {scenario['day_index']}")
    print(f"  Current State: {json.dumps(scenario['current_state'], indent=2)}")
    print(f"  Requests: {json.dumps(scenario['user_requests'], indent=2)}")
    
    # 2. Initialize Navigator
    nav = TripNavigator(
        base_itinerary_path='ml_or/data/base_itinerary_final.json',
        family_prefs_path='ml_or/data/family_preferences_3fam_strict.json'
    )
    
    # 3. Load History
    nav.set_visited_history(scenario['visited_history'])
    
    # 4. Execute Re-Optimization
    print("\nStarting Re-Optimization...")
    print("-" * 40)
    
    new_plan = nav.re_optimize_day(
        day_index=scenario['day_index'],
        family_ids=list(scenario['current_state'].keys()),
        current_state=scenario['current_state'],
        user_requests=scenario['user_requests']
    )
    
    # 5. Output Result
    print("-" * 40)
    if new_plan:
        print("✅ NEW PLAN GENERATED")
        output_file = "ml_or/data/demo_result_day.json"
        
        # Save for inspection
        with open(output_file, 'w') as f:
            json.dump(new_plan, f, indent=4)
        print(f"Saved to {output_file}")
        
        # Verify FAM_C visits Lotus Temple (LOC_004)
        fam_c_pois = new_plan['families']['FAM_C']['pois']
        visited_ids = [p['location_id'] for p in fam_c_pois]
        
        if 'LOC_004' in visited_ids:
             print("\n🎉 SUCCESS: FAM_C is visiting Lotus Temple (LOC_004)!")
        else:
             print("\n⚠️  WARNING: Lotus Temple (LOC_004) NOT found in FAM_C plan.")
             print("Check constraints or feasibility.")
             
        # Print Summary
        for fid, data in new_plan['families'].items():
             print(f"\n  {fid} Path:")
             for p in data['pois']:
                 print(f"    - {p['arrival_time']}-{p['departure_time']}: {p['location_name']}")
        
    else:
        print("❌ FAILED to generate new plan.")

if __name__ == "__main__":
    run_demo()
