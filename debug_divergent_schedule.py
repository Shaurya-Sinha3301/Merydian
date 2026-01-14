
import sys
sys.path.insert(0, 'ml_or')
from itinerary_optimizer import ItineraryOptimizer

def print_family_timeline(fam_id, schedule, optimizer):
    print(f"\n⏰ TIMELINE FOR {fam_id}")
    print("-" * 60)
    
    # Sort by arrival time
    sorted_pois = sorted(schedule, key=lambda x: x['arrival_time'])
    
    prev_poi = None
    prev_dep_min = 0 # Assuming 9:00 AM start = 0 relative or check day_start
    
    # We know day starts at 9:00 (540 min)
    day_start_min = 540
    
    for i, poi in enumerate(sorted_pois):
        # Parse times
        # arrival_time is string "HH:MM", convert to min
        h, m = map(int, poi['arrival_time'].split(':'))
        arr_min = h * 60 + m
        
        h, m = map(int, poi['departure_time'].split(':'))
        dep_min = h * 60 + m
        
        # Calculate gap from previous
        if prev_poi:
            travel_time = arr_min - prev_dep_min
            print(f"   ⬇️  Travel: {travel_time} min")
        elif i == 0:
            # Time from start of day
            travel_time = arr_min - day_start_min
            if travel_time > 0:
                 print(f"   ⬇️  Travel from Start: {travel_time} min")

        role = optimizer.locations[poi['location_id']].role
        print(f"📍 {poi['location_name']} ({role})")
        print(f"   Arrive: {poi['arrival_time']} | Depart: {poi['departure_time']} (Visit: {poi['visit_duration_min']} min)")
        
        prev_poi = poi
        prev_dep_min = dep_min
    
    print("-" * 60)

# Run Optimization
opt = ItineraryOptimizer(family_prefs_file='ml_or/data/family_preferences_divergence_test.json')
# Use the tuned parameters
opt.lambda_coherence = 2 
result = opt.optimize_multi_family_single_day(['FAM_001', 'FAM_002'], 0, 5, 60, 0.05)

# Print Detailed Timelines
for fid in ['FAM_001', 'FAM_002']:
    if fid in result['families']:
        print_family_timeline(fid, result['families'][fid]['pois'], opt)
