
import sys
import logging
from ml_or.itinerary_optimizer import ItineraryOptimizer

# Configure logging
logging.basicConfig(level=logging.INFO)

try:
    print("Initializing Optimizer...")
    optimizer = ItineraryOptimizer(
        locations_file="ml_or/data/locations.json",
        transport_file="ml_or/data/transport_graph.json",
        base_itinerary_file="ml_or/data/base_itinerary_clustered.json",
        family_prefs_file="agents/tests/run_20260218_232757/family_preferences_updated.json",
        optimized_backbone_file="agents/tests/run_20260218_232757/optimized_backbone.json"
    )
    
    print("Running optimize_trip...")
    solution = optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        num_days=3
    )
    
    if solution:
        print("Success! Solution generated.")
        print(f"Days: {len(solution.get('days', []))}")
    else:
        print("Failure. No solution returned (but no crash).")

except Exception as e:
    print(f"\nCRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
