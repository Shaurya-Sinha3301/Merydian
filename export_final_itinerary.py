
import sys
import json
import os
sys.path.insert(0, 'ml_or')
from itinerary_optimizer import ItineraryOptimizer

def export_itinerary():
    print("="*80)
    print("EXPORTING FINAL ITINERARY TO JSON")
    print("="*80)

    # Initialize Optimizer
    opt = ItineraryOptimizer(
        base_itinerary_file='ml_or/data/base_itinerary_final.json',
        family_prefs_file='ml_or/data/family_preferences_3fam_strict.json'
    )

    # Set parameters
    opt.lambda_coherence = 0.5

    # Run Optimization
    trip_result = opt.optimize_trip(['FAM_A', 'FAM_B', 'FAM_C'], num_days=3)

    if trip_result and trip_result['days']:
        output_path = 'ml_or/data/final_optimized_trip.json'
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(trip_result, f, indent=4)
            
        print(f"\n✅ Successfully exported itinerary to: {output_path}")
        print(f"   Trip ID: {trip_result['trip_id']}")
        print(f"   Total Cost: {trip_result['total_trip_cost']}")
    else:
        print("\n❌ Optimization Failed. No file exported.")

if __name__ == "__main__":
    export_itinerary()
