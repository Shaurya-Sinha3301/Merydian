"""
Geographic Look-Ahead Test 2
Simplified test: Chandni Chowk (LOC_015) should go to Day 3 (closer to India Gate/Parikrama)
"""
import sys
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ml_or.demos.reopt_hard_constraints.trip_session_manager import TripSessionManager
from ml_or.itinerary_optimizer import ItineraryOptimizer

def main():
    print("=" * 80)
    print("GEOGRAPHIC LOOK-AHEAD TEST")
    print("Scenario: Chandni Chowk request at Day 2")
    print("Expected: Should be placed on Day 3 (geographically closer)")
    print("=" * 80)
    
    # Step 1: Create session at Day 2
    print("\n[1] Setting up trip session at Day 2...")
    storage_dir = Path("ml_or/demos/output/geo_test_sessions")
    session_mgr = TripSessionManager(storage_dir=storage_dir)
    
    base_prefs_path = Path("ml_or/data/family_preferences_3fam_strict.json")
    with open(base_prefs_path, 'r') as f:
        base_prefs = json.load(f)
    
    trip_id = "GEO_TEST_001"
    session = session_mgr.create_session(
        trip_id=trip_id,
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        baseline_prefs=base_prefs,
        baseline_itinerary_path="ml_or/data/base_itinerary_final.json"
    )
    
    # Advance to Day 2 (Day 1 complete, can re-opt Days 2 or 3)
    session_mgr.update_trip_time(trip_id, day_index=1, time_minutes=960)  # Day 2, 16:00
    session = session_mgr.get_session(trip_id)
    
    print(f"  ✓ Trip at Day {session.current_day + 1}, 16:00")
    print(f"  Status: {session.trip_status}")
    
    # Step 2: Get candidate days (should be [1, 2] = Days 2 and 3)
    print("\n[2] Calculating candidate days...")
    candidate_days = session.get_candidate_days(constraint="current_and_future")
    print(f"  Candidate days (0-indexed): {candidate_days}")
    print(f"  Candidate days (1-indexed): Day {[d+1 for d in candidate_days]}")
    
    # Step 3: Run geographic look-ahead for Chandni Chowk
    print("\n[3] Running geographic look-ahead for Chandni Chowk (LOC_015)...")
    
    optimizer = ItineraryOptimizer(
        locations_file="ml_or/data/locations.json",
        transport_file="ml_or/data/transport_graph.json",
        base_itinerary_file="ml_or/data/base_itinerary_final.json",
        family_prefs_file="ml_or/data/family_preferences_3fam_strict.json"
    )
    
    with open("ml_or/data/base_itinerary_final.json", 'r') as f:
        base_itinerary = json.load(f)
    
    best_day, distance = optimizer.find_best_day_for_poi(
        poi_id="LOC_015",  # Chandni Chowk
        candidate_days=candidate_days,
        base_itinerary=base_itinerary
    )
    
    print(f"\n{'='*80}")
    print(f"RESULT: best_day = {best_day} (Day {best_day + 1}), avg_distance = {distance:.2f} km")
    print(f"{'='*80}")
    
    # Step 4: Verify
    if best_day == 2:  # Day 3 (0-indexed)
        print("\n✓ TEST PASSED: Chandni Chowk correctly assigned to Day 3")
        print("  Geographic look-ahead is working!")
        return True
    else:
        print(f"\n✗ TEST FAILED: Expected Day 3 (index 2), got Day {best_day + 1} (index {best_day})")
        return False

if __name__ == "__main__":
    import sys
    sys.exit(0 if main() else 1)
