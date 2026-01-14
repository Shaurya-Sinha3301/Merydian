
import sys
import json
sys.path.insert(0, 'ml_or')
from itinerary_optimizer import ItineraryOptimizer

def print_timeline(result, optimizer):
    print(f"\n{'='*80}")
    print(f"MEAL PLANNING TEST")
    print(f"Objective Value: {result['objective_value']}")
    print(f"{'='*80}")
    
    families = result['families']
    
    for fid in families:
        print(f"\n📅 ITINERARY FOR {fid}")
        schedule = families[fid]['pois']
        
        for i, poi in enumerate(schedule):
            role = "UNKNOWN"
            if poi['location_id'] in optimizer.locations:
                role = getattr(optimizer.locations[poi['location_id']], 'role', 'SKELETON')
            
            # Check constraints visually
            constraint_note = ""
            if poi['location_id'] == 'LOC_LUNCH':
                constraint_note = " <--- MUST be within 12:30 - 14:00"
            
            print(f"  📍 {poi['location_name']} [{role}]{constraint_note}")
            print(f"     Arrive: {poi['arrival_time']} | Depart: {poi['departure_time']}")


print("="*80)
print("TESTING STEP 11: MEAL PLANNING")
print("="*80)

# Run Optimization with Meal Itinerary
opt = ItineraryOptimizer(
    base_itinerary_file='ml_or/data/base_itinerary_meal.json', # <--- Meal Itinerary
    family_prefs_file='ml_or/data/family_preferences.json'      # Single family or simple usually fine
)

# Use tuned parameters
opt.lambda_coherence = 2 

# Run for 2 families
result = opt.optimize_multi_family_single_day(['FAM_001', 'FAM_002'], day_index=0)

if result:
    print_timeline(result, opt)
else:
    print("\n❌ OPTIMIZATION FAILED")
