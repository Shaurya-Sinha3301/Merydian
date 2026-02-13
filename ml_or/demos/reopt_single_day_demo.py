"""
Demo: Single-Day Re-Optimization from Current Trip State

This demonstrates how to re-optimize a single day (e.g., Day 3) 
when the trip is already in-progress (e.g., at Day 2).

Scenario:
- Trip is at Day 2, 16:00
- User wants to add Chandni Chowk
- Geographic look-ahead suggests Day 3 is best
- Re-optimize ONLY Day 3, preserve Days 1-2
"""

def reoptimize_from_current_state(
    optimizer,
    current_solution: Dict,
    current_day_index: int,
    target_day_index: int,
    family_ids: List[str],
    lambda_divergence: float = 0.05
) -> Dict:
    """
    Re-optimize trip from current state onwards.
    
    Args:
        optimizer: ItineraryOptimizer instance
        current_solution: Existing trip solution (Days 1-N completed)
        current_day_index: Current day (0-indexed, e.g., 1 = Day 2)
        target_day_index: Day to re-optimize (0-indexed, e.g., 2 = Day 3)
        family_ids: Families to optimize for
        lambda_divergence: Divergence penalty
    
    Returns:
        Updated trip solution with re-optimized day(s)
    
    Example:
        # At Day 2, re-optimize Day 3
        new_solution = reoptimize_from_current_state(
            optimizer=optimizer,
            current_solution=existing_trip_solution,
            current_day_index=1,  # Currently at Day 2
            target_day_index=2,   # Re-optimize Day 3
            family_ids=["FAM_A", "FAM_B", "FAM_C"]
        )
    """
    print(f"\n{'='*80}")
    print(f"RE-OPTIMIZING FROM CURRENT STATE")
    print(f"  Current Day: {current_day_index + 1}")
    print(f"  Target Day: {target_day_index + 1}")
    print(f"{'='*80}\n")
    
    # Step 1: Extract visited history from completed days
    visited_history = {fid: set() for fid in family_ids}
    
    for day_idx in range(target_day_index):
        day_data = current_solution['days'][day_idx]
        for fid, fam_data in day_data['families'].items():
            for poi in fam_data['pois']:
                visited_history[fid].add(poi['location_id'])
    
    print(f"[HISTORY] Extracted visited POIs from Days 1-{target_day_index}:")
    for fid, pois in visited_history.items():
        print(f"  {fid}: {len(pois)} POIs visited")
    
    # Step 2: Re-optimize target day with history
    print(f"\n[REOPT] Re-optimizing Day {target_day_index + 1}...")
    
    day_result = optimizer.optimize_multi_family_single_day(
        family_ids=family_ids,
        day_index=target_day_index,
        max_pois=5,
        time_limit_seconds=60,
        lambda_divergence=lambda_divergence,
        visited_history=visited_history  # ← Key: preserves past days!
    )
    
    if not day_result:
        print(f"[ERROR] Re-optimization failed for Day {target_day_index + 1}")
        return current_solution
    
    print(f"[SUCCESS] Day {target_day_index + 1} re-optimized")
    
    # Step 3: Reconstruct full trip solution
    new_trip_solution = {
        "trip_id": current_solution.get("trip_id", "TRIP_REOPT"),
        "families": family_ids,
        "days": [],
        "total_trip_cost": 0,
        "total_trip_time_min": 0,
    }
    
    # Add completed days (unchanged)
    for day_idx in range(target_day_index):
        day_data = current_solution['days'][day_idx]
        new_trip_solution["days"].append(day_data)
        new_trip_solution["total_trip_cost"] += day_data["total_transport_cost"]
        new_trip_solution["total_trip_time_min"] += day_data["total_transport_time_min"]
    
    # Add re-optimized day
    new_trip_solution["days"].append(day_result)
    new_trip_solution["total_trip_cost"] += day_result["total_transport_cost"]
    new_trip_solution["total_trip_time_min"] += day_result["total_transport_time_min"]
    
    # Add future days (if any, unchanged)
    for day_idx in range(target_day_index + 1, len(current_solution['days'])):
        day_data = current_solution['days'][day_idx]
        new_trip_solution["days"].append(day_data)
        new_trip_solution["total_trip_cost"] += day_data["total_transport_cost"]
        new_trip_solution["total_trip_time_min"] += day_data["total_transport_time_min"]
    
    print(f"\n[COMPLETE] Trip solution reconstructed:")
    print(f"  Days 1-{target_day_index}: Preserved (unchanged)")
    print(f"  Day {target_day_index + 1}: Re-optimized ✓")
    if target_day_index + 1 < len(current_solution['days']):
        print(f"  Days {target_day_index + 2}-{len(current_solution['days'])}: Preserved (unchanged)")
    
    return new_trip_solution


# Example Usage
if __name__ == "__main__":
    from ml_or.itinerary_optimizer import ItineraryOptimizer
    import json
    
    # Initialize optimizer
    optimizer = ItineraryOptimizer()
    
    # Scenario: We have an existing 3-day trip solution
    # Currently at Day 2, want to add POI to Day 3
    
    # Step 1: Load existing solution (from previous optimization)
    with open("ml_or/tests/solved/3fam3day/optimized_solution.json", 'r') as f:
        existing_solution = json.load(f)
    
    print("\nExisting Solution:")
    print(json.dumps(existing_solution, indent=2)[:500])
    
    # Step 2: User adds a must-visit POI to preferences (already done via OptimizerAgent)
    # Preferences file now has the new POI
    
    # Step 3: Re-optimize Day 3 only
    new_solution = reoptimize_from_current_state(
        optimizer=optimizer,
        current_solution=existing_solution,
        current_day_index=1,  # At Day 2
        target_day_index=2,   # Re-optimize Day 3
        family_ids=["FAM_A", "FAM_B", "FAM_C"]
    )
    
    # Step 4: Save new solution
    output_path = "ml_or/tests/solved/3fam3day_reopt/optimized_solution.json"
    with open(output_path, 'w') as f:
        json.dump(new_solution, f, indent=2)
    
    print(f"\n✓ Solution saved to: {output_path}")
