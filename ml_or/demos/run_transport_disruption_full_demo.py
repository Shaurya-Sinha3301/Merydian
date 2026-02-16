"""
Comprehensive Transport Disruption Demo with Explainability
Demonstrates:
1. BUS disruption scenario with preference updates
2. Full explainability integration with LLM payloads
3. Must-visit and never-visit preference handling
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
import json

# Add project root and parent to path
script_dir = Path(__file__).parent
ml_or_root = script_dir.parent
project_root = ml_or_root.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(ml_or_root))

from itinerary_optimizer import ItineraryOptimizer
from demos.reopt_hard_constraints.trip_session_manager import (
    TripSessionManager,
    TransportDisruption
)
from explainability.diff_engine import ItineraryDiffEngine
from explainability.causal_tagger import CausalTagger
from explainability.delta_engine import DeltaEngine
from explainability.payload_builder import ExplanationPayloadBuilder
from agents.explainability_agent import ExplainabilityAgent




def count_transport_modes(solution: dict, day_num: int) -> dict:
    """Count transport mode usage for a specific day"""
    mode_counts = {}
    
    for day in solution.get("days", []):
        if day["day"] != day_num:
            continue
            
        for family_id, family_data in day["families"].items():
            for poi in family_data["pois"]:
                transport = poi.get("transport_to_next", {})
                mode = transport.get("mode")
                if mode:
                    mode_counts[mode] = mode_counts.get(mode, 0) + 1
    
    return mode_counts


def main():
    """Run comprehensive transport disruption demo with explainability"""
    
    print("\n" + "="*80)
    print("COMPREHENSIVE TRANSPORT DISRUPTION DEMO WITH EXPLAINABILITY")
    print("="*80 + "\n")
    
    # Setup paths
    data_dir = ml_or_root / "data"
    output_dir = script_dir / "transport_disruption_full_output"
    output_dir.mkdir(parents=True, exist_ok=True)
    session_dir = output_dir / "sessions"
    session_dir.mkdir(exist_ok=True)
    
    print(f"[SETUP] Output directory: {output_dir}")
    print(f"[SETUP] Data directory: {data_dir}\n")
    
    # Initialize components
    session_manager = TripSessionManager(session_dir)
    exp_agent = ExplainabilityAgent()
    diff_engine = ItineraryDiffEngine()
    causal_tagger = CausalTagger()
    delta_engine = DeltaEngine()
    payload_builder = ExplanationPayloadBuilder()
    
    # =========================================================================
    # SCENARIO 1: Baseline with Preference Changes
    # =========================================================================
    print("="*80)
    print("SCENARIO 1: Baseline Optimization + Preference Changes")
    print("="*80 + "\n")
    
    print("[1.1] Running baseline optimization...")
    baseline_optimizer = ItineraryOptimizer(
        locations_file=str(data_dir / "locations.json"),
        transport_file=str(data_dir / "transport_graph.json"),
        base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
        family_prefs_file=str(data_dir / "family_preferences_3fam_strict.json")
    )
    
    baseline_solution = baseline_optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        num_days=3,
        lambda_divergence=0.05
    )
    
    # Save baseline
    baseline_file = output_dir / "baseline_solution.json"
    with open(baseline_file, 'w') as f:
        json.dump(baseline_solution, f, indent=2, default=str)
    print(f"  [OK] Baseline saved: {baseline_file}\n")
    
    # Analyze Day 2 transport
    day2_baseline_transport = count_transport_modes(baseline_solution, 2)
    print(f"[1.2] Day 2 transport (baseline):")
    for mode, count in sorted(day2_baseline_transport.items()):
        print(f"    {mode}: {count} trips")
    print()
    
    # =========================================================================
    # SCENARIO 2: Add Preference Changes (Must/Never Visit)
    # =========================================================================
    print("="*80)
    print("SCENARIO 2: Preference Updates (Must Visit + Never Visit)")
    print("="*80 + "\n")
    
    # Create session
    print("[2.1] Creating trip session...")
    session = session_manager.create_session(
        trip_id="FULL_DEMO_001",
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        baseline_prefs=[]
    )
    session_manager.start_trip("FULL_DEMO_001", start_day=1, start_time_minutes=540)
    session_manager.advance_to_day("FULL_DEMO_001", 2, 540)
    print(f"  [OK] Session created and advanced to Day 2\n")
    
    # FAM_A: Must visit Akshardham (LOC_008)
    print("[2.2] FAM_A requests must visit: Akshardham")
    session_manager.update_preferences(
        trip_id="FULL_DEMO_001",
        family_id="FAM_A",
        event_type="MUST_VISIT",
        poi_id="LOC_008"
    )
    
    # FAM_B: Never visit Red Fort (LOC_001)
    print("[2.3] FAM_B requests never visit: Red Fort")
    session_manager.update_preferences(
        trip_id="FULL_DEMO_001",
        family_id="FAM_B",
        event_type="NEVER_VISIT",
        poi_id="LOC_001"
    )
    print()
    
    # Re-optimize with preferences
    print("[2.4] Re-optimizing with updated preferences...")
    prefs_file = output_dir / "updated_preferences.json"
    session_manager.save_preferences_to_file("FULL_DEMO_001", prefs_file)
    
    prefs_optimizer = ItineraryOptimizer(
        locations_file=str(data_dir / "locations.json"),
        transport_file=str(data_dir / "transport_graph.json"),
        base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
        family_prefs_file=str(prefs_file)
    )
    
    prefs_solution = prefs_optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        num_days=3,
        lambda_divergence=0.05
    )
    
    prefs_solution_file = output_dir / "prefs_updated_solution.json"
    with open(prefs_solution_file, 'w') as f:
        json.dump(prefs_solution, f, indent=2, default=str)
    print(f"  [OK] Preference-updated solution saved\n")
    
    # Generate explainability for preference changes
    print("[2.5] Generating explanations for preference changes...")
    prefs_diffs = diff_engine.compare_optimized_solutions(
        baseline_solution, 
        prefs_solution,
        days_to_compare=[2, 3]
    )
    
    # Mock decision traces (in production, optimizer would provide these)
    decision_traces = {
        1: {"candidates": [], "constraints": [
            {"type": "MUST_VISIT_ENFORCED", "applies_to": {"poi": "LOC_008", "family": "FAM_A"}},
            {"type": "NEVER_VISIT_ENFORCED", "applies_to": {"poi": "LOC_001", "family": "FAM_B"}}
        ]}
    }
    
    enriched_diffs = causal_tagger.tag_changes(prefs_diffs, decision_traces)
    
    # Load locations for payload builder
    with open(data_dir / "locations.json", 'r') as f:
        locations = json.load(f)
    
    llm_payloads_prefs = payload_builder.build_payloads(enriched_diffs, locations)
    
    # Save payloads
    prefs_payloads_file = output_dir / "prefs_llm_payloads.json"
    with open(prefs_payloads_file, 'w', encoding='utf-8') as f:
        json.dump(llm_payloads_prefs, f, indent=2)
    
    print(f"  [OK] Generated {len(llm_payloads_prefs)} explanation payload(s)")
    
    # Generate human explanations
    explanations_prefs = []
    for payload in llm_payloads_prefs:
        explanation = exp_agent.explain(payload)
        explanations_prefs.append({
            "family": payload.get("family"),
            "poi": payload.get("poi", {}).get("name"),
            "change": payload.get("change_type"),
            "explanation": explanation.summary
        })
        print(f"    - {payload.get('family')}: {explanation.summary}")
    print()
    
    # =========================================================================
    # SCENARIO 3: BUS Disruption (Strike)
    # =========================================================================
    print("="*80)
    print("SCENARIO 3: BUS Disruption (All BUS Services Unavailable)")
    print("="*80 + "\n")
    
    print("[3.1] Adding BUS strike disruption for Day 2...")
    disruption = TransportDisruption(
        disruption_id="BUS_STRIKE_20260215",
        affected_modes=["BUS"],
        start_day=2,
        end_day=2,
        reason="STRIKE",
        severity="SEVERE",
        active=True,
        reported_at=datetime.now()
    )
    
    session_manager.add_disruption("FULL_DEMO_001", disruption)
    print(f"  [OK] Disruption added: {disruption.disruption_id}")
    print(f"    Affected modes: {disruption.affected_modes}")
    print(f"    Active on: Day {disruption.start_day}")
    print(f"    Reason: {disruption.reason}\n")
    
    # Update transport graph
    print("[3.2] Filtering transport graph (marking BUS edges unavailable)...")
    filtered_graph_path = session_manager.update_transport_availability(
        trip_id="FULL_DEMO_001",
        transport_graph_path=str(data_dir / "transport_graph.json"),
        output_path=str(output_dir / "transport_graph_bus_disrupted.json")
    )
    print(f"  [OK] Filtered graph saved\n")
    
    # Re-optimize with disruption
    print("[3.3] Re-optimizing with BUS disruption...")
    disrupted_optimizer = ItineraryOptimizer(
        locations_file=str(data_dir / "locations.json"),
        transport_file=filtered_graph_path,
        base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
        family_prefs_file=str(prefs_file)  # Keep preferences from scenario 2
    )
    
    disrupted_solution = disrupted_optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        num_days=3,
        lambda_divergence=0.05
    )
    
    disrupted_file = output_dir / "bus_disrupted_solution.json"
    with open(disrupted_file, 'w') as f:
        json.dump(disrupted_solution, f, indent=2, default=str)
    print(f"  [OK] Disrupted solution saved\n")
    
    # Analyze Day 2 transport after disruption
    day2_disrupted_transport = count_transport_modes(disrupted_solution, 2)
    print(f"[3.4] Day 2 transport (after BUS disruption):")
    for mode, count in sorted(day2_disrupted_transport.items()):
        print(f"    {mode}: {count} trips")
    print()
    
    # =========================================================================
    # SCENARIO 4: Explainability for Transport Disruption
    # =========================================================================
    print("="*80)
    print("SCENARIO 4: Generating Transport Disruption Explanations")
    print("="*80 + "\n")
    
    print("[4.1] Computing route diffs...")
    route_diffs = diff_engine.compare_optimized_solutions(
        prefs_solution,  # Compare to preference-updated solution (not baseline)
        disrupted_solution,
        days_to_compare=[2]
    )
    
    # Provide decision traces with disruption info
    disruption_traces = {
        1: {  # Day 2 is index 1
            "candidates": [],
            "constraints": [],
            "active_disruptions": [
                {
                    "disruption_id": "BUS_STRIKE_20260215",
                    "affected_modes": ["BUS"],
                    "reason": "STRIKE",
                    "severity": "SEVERE"
                }
            ]
        }
    }
    
    enriched_route_diffs = causal_tagger.tag_changes(route_diffs, disruption_traces)
    
    llm_payloads_disruption = payload_builder.build_payloads(enriched_route_diffs, locations)
    
    disruption_payloads_file = output_dir / "disruption_llm_payloads.json"
    with open(disruption_payloads_file, 'w', encoding='utf-8') as f:
        json.dump(llm_payloads_disruption, f, indent=2)
    
    print(f"  [OK] Generated {len(llm_payloads_disruption)} disruption explanation payload(s)\n")
    
    # Generate human explanations
    print("[4.2] Generating human-readable explanations...")
    explanations_disruption = []
    for payload in llm_payloads_disruption:
        explanation = exp_agent.explain(payload)
        explanations_disruption.append({
            "family": payload.get("family"),
            "change_type": payload.get("change_type"),
            "causal_tags": payload.get("causal_tags", []),
            "explanation": explanation.summary
        })
        if payload.get("change_type") == "ROUTE_CHANGED":
            print(f"    - {payload.get('family')}: Route changed from {payload.get('from_mode')} to {payload.get('to_mode')}")
        print(f"      Explanation: {explanation.summary}")
    print()
    
    # =========================================================================
    # FINAL SUMMARY
    # =========================================================================
    print("="*80)
    print("DEMO SUMMARY")
    print("="*80 + "\n")
    
    print("[TRANSPORT IMPACT]")
    print(f"  Day 2 Baseline:  BUS={day2_baseline_transport.get('BUS', 0)}, "
          f"METRO={day2_baseline_transport.get('METRO', 0)}")
    print(f"  Day 2 Disrupted: BUS={day2_disrupted_transport.get('BUS', 0)}, "
          f"METRO={day2_disrupted_transport.get('METRO', 0)}")
    
    bus_change = day2_disrupted_transport.get('BUS', 0) - day2_baseline_transport.get('BUS', 0)
    metro_change = day2_disrupted_transport.get('METRO', 0) - day2_baseline_transport.get('METRO', 0)
    print(f"  Change: BUS {bus_change:+d}, METRO {metro_change:+d}\n")
    
    print("[COST IMPACT]")
    baseline_cost = sum(day["total_cost"] for day in baseline_solution["days"])
    disrupted_cost = sum(day["total_cost"] for day in disrupted_solution["days"])
    cost_delta = disrupted_cost - baseline_cost
    cost_delta_pct = (cost_delta / baseline_cost * 100) if baseline_cost > 0 else 0
    print(f"  Baseline cost:   Rs {baseline_cost:.2f}")
    print(f"  Disrupted cost:  Rs {disrupted_cost:.2f}")
    print(f"  Cost increase:   Rs {cost_delta:.2f} ({cost_delta_pct:+.1f}%)\n")
    
    print("[EXPLAINABILITY]")
    print(f"  Preference change explanations: {len(explanations_prefs)}")
    print(f"  Transport disruption explanations: {len(explanations_disruption)}\n")
    
    print("[OUTPUT FILES]")
    print(f"  Baseline solution:      {baseline_file}")
    print(f"  Prefs updated solution: {prefs_solution_file}")
    print(f"  Disrupted solution:     {disrupted_file}")
    print(f"  Filtered graph:         {filtered_graph_path}")
    print(f"  Session data:           {session_dir}")
    print(f"  LLM payloads (prefs):   {prefs_payloads_file}")
    print(f"  LLM payloads (disrupt): {disruption_payloads_file}\n")
    
    # Save consolidated summary
    summary = {
        "timestamp": datetime.now().isoformat(),
        "scenarios": [
            {
                "name": "Baseline Optimization",
                "solution_file": str(baseline_file),
                "day_2_transport": day2_baseline_transport
            },
            {
                "name": "Preference Updates",
                "changes": [
                    "FAM_A: Must visit Akshardham",
                    "FAM_B: Never visit Red Fort"
                ],
                "solution_file": str(prefs_solution_file),
                "explanations": explanations_prefs
            },
            {
                "name": "BUS Disruption",
                "disruption": {
                    "type": "BUS_STRIKE",
                    "affected_modes": ["BUS"],
                    "reason": "STRIKE"
                },
                "solution_file": str(disrupted_file),
                "day_2_transport": day2_disrupted_transport,
                "explanations": explanations_disruption
            }
        ],
        "impact": {
            "transport_changes": {
                "BUS": bus_change,
                "METRO": metro_change
            },
            "cost_delta": cost_delta,
            "cost_delta_percent": cost_delta_pct
        }
    }
    
    summary_file = output_dir / "demo_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, default=str)
    
    print("="*80)
    print("DEMO COMPLETED SUCCESSFULLY!")
    print("="*80)
    print(f"\n✅ All outputs saved to: {output_dir}\n")


if __name__ == "__main__":
    main()
