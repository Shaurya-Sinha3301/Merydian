
import sys
import json
sys.path.insert(0, 'ml_or')
from itinerary_optimizer import ItineraryOptimizer

def print_final_timeline(trip_result, optimizer):
    print(f"\n{'='*80}")
    print(f"GRAND UNIFIED INTEGRATION TEST")
    print(f"Trip ID: {trip_result['trip_id']}")
    print(f"Objective Value: {trip_result['total_trip_cost']} (Cost)")
    print(f"{'='*80}")
    
    families = trip_result['families']
    
    for fid in families:
        print(f"\n📅 ITINERARY FOR {fid}")
        
        for day_idx, day_res in enumerate(trip_result['days']):
            print(f"\n  --- DAY {day_idx + 1} ---")
            
            schedule = day_res['families'][fid]['pois']
            transport = day_res['families'][fid]['transport']
            
             # Start (Hotel)
            if transport:
                first_leg = transport[0]
                print(f"  🏠 Start at {first_leg['from_name']}")
                print(f"     ⬇️  Commute: {first_leg['duration_min']} min")
            
            for poi in schedule:
                role = "UNKNOWN"
                tag = ""
                if poi['location_id'] in optimizer.locations:
                    loc = optimizer.locations[poi['location_id']]
                    role = getattr(loc, 'role', 'SKELETON')
                
                if poi['location_id'] == 'LOC_LUNCH':
                    tag = " 🍽️ [LUNCH 12:30-14:00]"
                elif role == 'BRANCH':
                    tag = " 🔀 [BRANCH]"
                
                print(f"  📍 {poi['location_name']} [{role}]{tag}")
                print(f"     Arrive: {poi['arrival_time']} | Depart: {poi['departure_time']}")
                
            # End (Hotel)
            if transport and len(transport) > len(schedule):
                last_leg = transport[-1]
                print(f"     ⬇️  Return: {last_leg['duration_min']} min")
                print(f"  🏠 End at {last_leg['to_name']}")


print("="*80)
print("TESTING FINAL INTEGRATION")
print("="*80)

# Run Optimization with FINAL Itinerary + STRICT Families
opt = ItineraryOptimizer(
    base_itinerary_file='ml_or/data/base_itinerary_final.json',
    family_prefs_file='ml_or/data/family_preferences_3fam_strict.json'
)

# Use tuned parameters
opt.lambda_coherence = 0.5  # Low cost to encourage divergence

result = opt.optimize_trip(['FAM_A', 'FAM_B', 'FAM_C'], num_days=3)

if result and result['days']:
    print_final_timeline(result, opt)
else:
    print("\n❌ OPTIMIZATION FAILED")
