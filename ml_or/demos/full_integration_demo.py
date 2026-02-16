"""
Full Integration Demo: TripState + Geographic Look-Ahead + Single-Day Re-Optimization

This demonstrates the complete workflow:
1. Create trip session with state tracking
2. User adds POI request
3. Geographic look-ahead finds best day
4. Single-day re-optimization updates only target day
"""

import sys
from pathlib import Path
import json

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ml_or.demos.reopt_hard_constraints.trip_session_manager import TripSessionManager
from agents.optimizer_agent import OptimizerAgent
from agents.feedback_agent import FeedbackAgent


def demo_full_integration():
    """
    Scenario: Chandni Chowk Request Mid-Trip
    - Trip is at Day 2, 16:00
    - FAM_B wants to add Chandni Chowk "before Day 3"
    - System finds Day 3 is best (near Red Fort)
    - Re-optimizes ONLY Day 3, preserves Days 1-2
    """
    print("=" * 80)
    print("FULL INTEGRATION DEMO")
    print("Scenario: Add Chandni Chowk mid-trip using geographic look-ahead")
    print("=" * 80)
    
    # =====================================================================
    # STEP 1: Initialize Session Manager
    # =====================================================================
    print("\n[STEP 1] Initializing Session Manager...")
    
    storage_dir = Path("ml_or/demos/output/sessions")
    session_manager = TripSessionManager(storage_dir=storage_dir)
    
    # Load base preferences
    base_prefs_path = Path("ml_or/data/family_preferences_3fam_strict.json")
    with open(base_prefs_path, 'r') as f:
        base_prefs = json.load(f)
    
    # Create trip session
    trip_id = "CHANDNI_DEMO_001"
    session = session_manager.create_session(
        trip_id=trip_id,
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        baseline_prefs=base_prefs,
        baseline_itinerary_path="ml_or/data/base_itinerary_final.json"
    )
    
    print(f"  ✓ Session created: {trip_id}")
    print(f"    Trip status: {session.trip_status}")
    print(f"    Total days: {session.total_days}")
    
    # =====================================================================
    # STEP 2: Simulate Trip In Progress (Day 2, 16:00)
    # =====================================================================
    print("\n[STEP 2] Advancing trip to Day 2, 16:00...")
    
    session_manager.update_trip_time(
        trip_id=trip_id,
        day_index=1,  # Day 2 (0-indexed)
        time_minutes=960  # 16:00 (960 minutes since midnight)
    )
    
    session = session_manager.get_session(trip_id)
    print(f"  ✓ Trip advanced")
    print(f"    Current day: Day {session.current_day + 1}")
    print(f"    Current time: {session.current_time_minutes // 60:02d}:{session.current_time_minutes % 60:02d}")
    print(f"    Trip status: {session.trip_status}")
    
    # =====================================================================
    # STEP 3: Load Existing Trip Solution (Days 1-2 completed)
    # =====================================================================
    print("\n[STEP 3] Loading existing trip solution...")
    
    existing_solution_path = Path("ml_or/tests/solved/3fam3day/optimized_solution.json")
    with open(existing_solution_path, 'r') as f:
        current_solution = json.load(f)
    
    print(f"  ✓ Loaded solution with {len(current_solution['days'])} days")
    
    # =====================================================================
    # STEP 4: User Feedback - Add Chandni Chowk
    # =====================================================================
    print("\n[STEP 4] Processing user feedback...")
    
    feedback_agent = FeedbackAgent()
    user_input = "We want to visit Chandni Chowk before Day 3"
    
    event = feedback_agent.parse(user_input, context={"family_id": "FAM_B"})
    print(f"  Input: '{user_input}'")
    print(f"  ✓ Parsed event type: {event.event_type}")
    
    # Manually construct event for demo (since parsing may not extract POI ID)
    preferences_update = {
        "event_type": "MUST_VISIT_ADDED",
        "family_id": "FAM_B",
        "poi_name": "Chandni Chowk",
        "before_day": 3  # Before Day 3 → candidates: Days 2, 3
    }
    
    # Update session preferences
    session_manager.update_preferences(
        trip_id=trip_id,
        family_id="FAM_B",
        event_type="MUST_VISIT_ADDED",
        poi_id="LOC_CHANDNI_CHOWK"  # Assuming this ID exists
    )
    
    # Save updated preferences for optimizer
    output_dir = Path("ml_or/demos/output/chandni_demo")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    updated_prefs_path = output_dir / "family_preferences_updated.json"
    session_manager.save_preferences_to_file(trip_id, updated_prefs_path)
    
    print(f"  ✓ Preferences updated for FAM_B")
    
    # =====================================================================
    # STEP 5: Run OptimizerAgent with Geographic Look-Ahead
    # =====================================================================
    print("\n[STEP 5] Running optimizer with look-ahead + single-day re-opt...")
    print("  (This will calculate candidate days, find best day, re-optimize)")
    
    optimizer_agent = OptimizerAgent()
    
    result = optimizer_agent.run(
        preferences=preferences_update,
        output_dir=output_dir,
        current_prefs_path=updated_prefs_path,
        session_manager=session_manager,  # Enable look-ahead
        trip_id=trip_id,  # Enable look-ahead
        current_solution=current_solution  # Enable single-day re-opt
    )
    
    print(f"\n  ✓ Optimization complete!")
    
    # =====================================================================
    # STEP 6: Review Results
    # =====================================================================
    print("\n[STEP 6] Results:")
    print(f"  Output directory: {output_dir}")
    print("\n  Generated files:")
    for key, path in result.items():
        exists = "✓" if path.exists() else "✗"
        print(f"    {exists} {key}: {path}")
    
    # Load new solution
    with open(result['optimized_solution'], 'r') as f:
        new_solution = json.load(f)
    
    print(f"\n  Trip solution summary:")
    print(f"    Total days: {len(new_solution['days'])}")
    print(f"    Total cost: Rs.{new_solution['total_trip_cost']}")
    
    # Check if Chandni Chowk was added
    for day_idx, day in enumerate(new_solution['days']):
        for fid, fam_data in day['families'].items():
            poi_names = [p['location_name'] for p in fam_data['pois']]
            if 'Chandni Chowk' in poi_names:
                print(f"\n  🎉 Chandni Chowk added to Day {day_idx + 1} for {fid}!")
                print(f"     POIs on this day: {', '.join(poi_names)}")
    
    print("\n" + "=" * 80)
    print("DEMO COMPLETE!")
    print("=" * 80)


if __name__ == "__main__":
    demo_full_integration()
