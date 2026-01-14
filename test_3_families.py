
import sys
import json
sys.path.insert(0, 'ml_or')
from itinerary_optimizer import ItineraryOptimizer

def print_family_timeline(fam_id, schedule, optimizer):
    print(f"\n⏰ TIMELINE FOR {fam_id}")
    print("-" * 60)
    
    # Sort by arrival time
    sorted_pois = sorted(schedule, key=lambda x: x['arrival_time'])
    
    prev_poi = None
    # We know day starts at 9:00 (540 min)
    day_start_min = 540
    
    for i, poi in enumerate(sorted_pois):
        # Parse times
        h, m = map(int, poi['arrival_time'].split(':'))
        arr_min = h * 60 + m
        
        h, m = map(int, poi['departure_time'].split(':'))
        dep_min = h * 60 + m
        
        # Calculate gap from previous
        if prev_poi:
            # Parse prev departure
            ph, pm = map(int, prev_poi['departure_time'].split(':'))
            prev_dep_min = ph * 60 + pm
            
            travel_time = arr_min - prev_dep_min
            if travel_time > 0:
                print(f"   ⬇️  Travel: {travel_time} min")
            elif travel_time < 0:
                print(f"   ⚠️  TELEPORTATION WARN: Negative travel {travel_time}")
            else:
                print(f"   ⬇️  Instant/Wait")
                
        elif i == 0:
            # Time from start of day
            travel_time = arr_min - day_start_min
            if travel_time > 0:
                 print(f"   ⬇️  Travel/Wait from Start: {travel_time} min")

        role = optimizer.locations[poi['location_id']].role
        print(f"📍 {poi['location_name']} (ID: {poi['location_id']}) [{role}]")
        print(f"   Arrive: {poi['arrival_time']} | Depart: {poi['departure_time']} (Visit: {poi['visit_duration_min']} min)")
        
        prev_poi = poi
    
    print("-" * 60)

# Load POI classifications manually for print if needed? No, optimizer has them.

print("="*80)
print("TESTING 3-FAMILY SYNCHRONIZATION (Step 9E)")
print("="*80)

# Run Optimization
opt = ItineraryOptimizer(family_prefs_file='ml_or/data/family_preferences_3fam_strict.json')
# Use the tuned parameters
opt.lambda_coherence = 2 

# Run for 3 families!
result = opt.optimize_multi_family_single_day(['FAM_A', 'FAM_B', 'FAM_C'], 0, 5, 60, 0.05)

if result:
    print("\n✅ OPTIMIZATION SUCCESS")
    print(f"Objective Value: {result['objective_value']}")
    
    # Print Detailed Timelines
    for fid in ['FAM_A', 'FAM_B', 'FAM_C']:
        if fid in result['families']:
            print_family_timeline(fid, result['families'][fid]['pois'], opt)
        else:
            print(f"\n❌ FAMILY {fid} NOT IN RESULT!")
else:
    print("\n❌ OPTIMIZATION FAILED - No Solution Found")
