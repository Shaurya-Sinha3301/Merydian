"""
Transport Disruption Demo: Metro Strike Scenario
=================================================

This demo showcases the transport disruption handling feature by simulating
a metro strike on Day 2 of a trip. It demonstrates:

1. Session creation with trip state
2. Adding a transport disruption
3. Updating transport graph availability
4. Running optimizer with filtered graph
5. Comparing routes before/after disruption

Usage:
    conda activate agent_env
    python ml_or/demos/transport_disruption_demo.py
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import json

# Setup paths
script_dir = Path(__file__).parent
ml_or_dir = script_dir.parent
root_dir = ml_or_dir.parent
sys.path.insert(0, str(root_dir))

from ml_or.itinerary_optimizer import ItineraryOptimizer
from ml_or.demos.reopt_hard_constraints.trip_session_manager import (
    TripSessionManager,
    TransportDisruption
)


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def count_transport_modes(itinerary_data, day_index):
    """Count transport modes used in a day"""
    mode_counts = {}
    
    if 'days' in itinerary_data:
        # Multi-day format
        day = itinerary_data['days'][day_index]
        for family_id, family_data in day.get('families', {}).items():
            for transport in family_data.get('transport', []):
                mode = transport.get('mode', 'UNKNOWN')
                mode_counts[mode] = mode_counts.get(mode, 0) + 1
    
    return mode_counts


def main():
    print_section("TRANSPORT DISRUPTION DEMO: Metro Strike Scenario")
    
    # Setup
    output_dir = ml_or_dir / "demos" / "transport_disruption_output"
    output_dir.mkdir(exist_ok=True, parents=True)
    
    data_dir = ml_or_dir / "data"
    
    print("\n[SETUP] Initializing demo environment...")
    print(f"  Output directory: {output_dir}")
    print(f"  Data directory: {data_dir}")
    
    # ========================================================================
    # STEP 1: Create baseline itinerary (NO disruption)
    # ========================================================================
    
    print_section("STEP 1: Baseline Optimization (No Disruption)")
    
    print("\n[1.1] Running optimizer with full transport graph...")
    baseline_optimizer = ItineraryOptimizer(
        locations_file=str(data_dir / "locations.json"),
        transport_file=str(data_dir / "transport_graph.json"),
        base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
        family_prefs_file=str(data_dir / "family_preferences_3fam_strict.json")
    )
    
    baseline_solution = baseline_optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],  # Match preferences file
        num_days=3,
        lambda_divergence=0.05
    )
    
    if not baseline_solution:
        print("  [ERROR] Baseline optimization failed!")
        return
    
    # Save baseline
    baseline_path = output_dir / "baseline_solution.json"
    with open(baseline_path, 'w') as f:
        json.dump(baseline_solution, f, indent=2)
    
    print(f"  [OK] Baseline solution saved: {baseline_path}")
    
    # Analyze Day 2 baseline transport
    print("\n[1.2] Day 2 transport breakdown (baseline):")
    day2_baseline_modes = count_transport_modes(baseline_solution, 1)  # Day 2 = index 1
    for mode, count in sorted(day2_baseline_modes.items()):
        print(f"    {mode}: {count} trips")
    
    # ========================================================================
    # STEP 2: Simulate metro strike
    # ========================================================================
    
    print_section("STEP 2: Simulate Metro Strike")
    
    print("\n[2.1] Creating trip session...")
    session_manager = TripSessionManager(storage_dir=output_dir / "sessions")
    
    session = session_manager.create_session(
        trip_id="DEMO_TRIP_001",
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        baseline_prefs=[]  # Using default prefs from file
    )
    
    # Set trip to Day 2, morning
    session.current_day = 1  # Day 2 (0-indexed)
    session.current_time_minutes = 540  # 09:00
    session.trip_status = "IN_PROGRESS"
    session_manager._save_session(session)
    
    print(f"  [OK] Session created: {session.trip_id}")
    print(f"    Current position: Day {session.current_day + 1}, 09:00")
    print(f"    Status: {session.trip_status}")
    
    print("\n[2.2] Adding metro strike disruption...")
    
    # Metro strike: All day on Day 2
    disruption = TransportDisruption(
        disruption_id="METRO_STRIKE_20260214",
        affected_modes=["METRO"],
        start_day=1,  # Day 2
        end_day=1,    # Day 2 only
        start_time=datetime.now(),
        end_time=datetime.now() + timedelta(hours=12),
        reason="STRIKE",
        severity="SEVERE"
    )
    
    session_manager.add_disruption("DEMO_TRIP_001", disruption)
    
    print(f"  [OK] Disruption added: {disruption.disruption_id}")
    print(f"    Affected modes: {disruption.affected_modes}")
    print(f"    Duration: {disruption.start_day + 1} to Day {disruption.end_day + 1}")
    print(f"    Reason: {disruption.reason}")
    
    # ========================================================================
    # STEP 3: Update transport availability
    # ========================================================================
    
    print_section("STEP 3: Update Transport Graph Availability")
    
    print("\n[3.1] Generating filtered transport graph...")
    
    filtered_graph_path = session_manager.update_transport_availability(
        trip_id="DEMO_TRIP_001",
        transport_graph_path=str(data_dir / "transport_graph.json"),
        output_path=str(output_dir / "transport_graph_filtered.json")
    )
    
    print(f"  [OK] Filtered graph generated: {filtered_graph_path}")
    
    # Count unavailable edges
    with open(filtered_graph_path, 'r') as f:
        filtered_graph = json.load(f)
    
    unavailable_count = sum(1 for edge in filtered_graph if not edge.get('available', True))
    
    print(f"\n[3.2] Transport graph statistics:")
    print(f"    Total edges: {len(filtered_graph)}")
    print(f"    Unavailable: {unavailable_count}")
    print(f"    Available: {len(filtered_graph) - unavailable_count}")
    
    # ========================================================================
    # STEP 4: Re-optimize with disruption
    # ========================================================================
    
    print_section("STEP 4: Re-optimize with Disrupted Transport")
    
    print("\n[4.1] Running optimizer with filtered transport graph...")
    
    disrupted_optimizer = ItineraryOptimizer(
        locations_file=str(data_dir / "locations.json"),
        transport_file=filtered_graph_path,  # ← Using filtered graph
        base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
        family_prefs_file=str(data_dir / "family_preferences_3fam_strict.json")
    )
    
    disrupted_solution = disrupted_optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        num_days=3,
        lambda_divergence=0.05
    )
    
    if not disrupted_solution:
        print("  [ERROR] Disrupted optimization failed!")
        return
    
    # Save disrupted solution
    disrupted_path = output_dir / "disrupted_solution.json"
    with open(disrupted_path, 'w') as f:
        json.dump(disrupted_solution, f, indent=2)
    
    print(f"  [OK] Disrupted solution saved: {disrupted_path}")
    
    # Analyze Day 2 disrupted transport
    print("\n[4.2] Day 2 transport breakdown (with metro strike):")
    day2_disrupted_modes = count_transport_modes(disrupted_solution, 1)
    for mode, count in sorted(day2_disrupted_modes.items()):
        print(f"    {mode}: {count} trips")
    
    # ========================================================================
    # STEP 5: Compare results
    # ========================================================================
    
    print_section("STEP 5: Impact Analysis")
    
    print("\n[5.1] Day 2 Transport Mode Changes:")
    print(f"\n  {'Mode':<10} {'Baseline':<12} {'Disrupted':<12} {'Change':<10}")
    print("  " + "-" * 50)
    
    all_modes = set(list(day2_baseline_modes.keys()) + list(day2_disrupted_modes.keys()))
    
    for mode in sorted(all_modes):
        baseline_count = day2_baseline_modes.get(mode, 0)
        disrupted_count = day2_disrupted_modes.get(mode, 0)
        change = disrupted_count - baseline_count
        change_str = f"+{change}" if change > 0 else str(change)
        
        print(f"  {mode:<10} {baseline_count:<12} {disrupted_count:<12} {change_str:<10}")
    
    # Cost comparison
    baseline_cost = baseline_solution.get('total_trip_cost', 0)
    disrupted_cost = disrupted_solution.get('total_trip_cost', 0)
    cost_increase = disrupted_cost - baseline_cost
    
    print(f"\n[5.2] Cost Impact:")
    print(f"  Baseline total cost:   Rs {baseline_cost:.2f}")
    print(f"  Disrupted total cost:  Rs {disrupted_cost:.2f}")
    print(f"  Cost increase:         Rs {cost_increase:.2f} ({(cost_increase/baseline_cost*100):.1f}%)")
    
    # ========================================================================
    # Summary
    # ========================================================================
    
    print_section("DEMO COMPLETE")
    
    print("\n[SUMMARY]")
    print(f"  Metro strike successfully simulated on Day 2")
    print(f"  {unavailable_count} METRO edges filtered from transport graph")
    print(f"  Optimizer automatically rerouted using alternative transport")
    print(f"  Cost impact: +Rs {cost_increase:.2f}")
    
    print("\n[OUTPUT FILES]")
    print(f"  Baseline solution:    {baseline_path}")
    print(f"  Disrupted solution:   {disrupted_path}")
    print(f"  Filtered graph:       {filtered_graph_path}")
    print(f"  Session data:         {output_dir / 'sessions'}")
    
    print("\n" + "=" * 70)
    print(" Demo completed successfully!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
