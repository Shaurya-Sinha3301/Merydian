
import sys
import json
sys.path.insert(0, 'ml_or')
from itinerary_optimizer import ItineraryOptimizer

def print_trip_timeline(trip_result, optimizer):
    print(f"\n{'='*80}")
    print(f"TRIP ITINERARY: {trip_result['trip_id']}")
    print(f"Total Cost: {trip_result['total_trip_cost']}")
    print(f"{'='*80}")
    
    families = trip_result['families']
    num_days = len(trip_result['days'])
    
    for fid in families:
        print(f"\n📅 ITINERARY FOR {fid}")
        
        for day_idx, day_res in enumerate(trip_result['days']):
            print(f"\n  --- DAY {day_idx + 1} ---")
            
            if fid not in day_res['families']:
                print("  [No Itinerary for this family]")
                continue
                
            schedule = day_res['families'][fid]['pois']
            transport = day_res['families'][fid]['transport'] # New accurate transport
            
            # Print Start (Hotel Commute)
            # The first transport leg is Hotel -> First POI
            if transport:
                first_leg = transport[0]
                print(f"  🏠 Start at {first_leg['from_name']}")
                print(f"     ⬇️  Commute: {first_leg['duration_min']} min ({first_leg['mode']}) - {first_leg['cost']} INR")
            
            # Print POIs
            for i, poi in enumerate(schedule):
                role = "UNKNOWN"
                if poi['location_id'] in optimizer.locations:
                    role = getattr(optimizer.locations[poi['location_id']], 'role', 'SKELETON')
                
                print(f"  📍 {poi['location_name']} [{role}]")
                print(f"     Arrive: {poi['arrival_time']} | Depart: {poi['departure_time']}")
                
                # Print transport to next OR back to hotel
                if i < len(schedule) - 1:
                    # Inner leg
                    if i + 1 < len(transport):
                        leg = transport[i+1] # Transport index 0 was start->first
                        print(f"     ⬇️  Travel: {leg['duration_min']} min")
                else:
                    # Last POI -> Hotel
                    if len(transport) > len(schedule): # Should have N+1 legs
                        last_leg = transport[-1]
                        print(f"     ⬇️  Return: {last_leg['duration_min']} min ({last_leg['mode']}) - {last_leg['cost']} INR")
                        print(f"  🏠 End at {last_leg['to_name']}")


print("="*80)
print("TESTING STEP 10: MULTI-DAY OPTIMIZATION")
print("="*80)

# Run Optimization
opt = ItineraryOptimizer(
    base_itinerary_file='ml_or/data/base_itinerary_multiday.json',
    family_prefs_file='ml_or/data/family_preferences_3fam_strict.json'
)

# Use the tuned parameters
opt.lambda_coherence = 0.5 

# Run for 3 families!
result = opt.optimize_trip(['FAM_A', 'FAM_B', 'FAM_C'], num_days=3)

if result and result['days']:
    print_trip_timeline(result, opt)
else:
    print("\n❌ OPTIMIZATION FAILED")
