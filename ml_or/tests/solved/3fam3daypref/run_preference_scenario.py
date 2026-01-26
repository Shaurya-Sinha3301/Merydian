"""
Preference Change Scenario: FAM_B Now Wants to Visit LOC_006
==============================================================

This script simulates a mid-trip scenario where FAM_B changes their preference
and now wants to visit LOC_006 (Akshardham) which was previously in their
never-visit list.

Workflow:
1. Load the original optimized solution from 3fam3day/
2. Re-run optimizer with FAM_B's new preferences
3. Compare the two optimized solutions using enhanced diff engine
4. Calculate cost deltas between baseline and new optimized itineraries
5. Generate explainability outputs
"""

import json
import sys
from pathlib import Path

# Fix import path - go up to root (Voyageur_Studio)
script_dir = Path(__file__).parent  # 3fam3daypref
tests_solved_dir = script_dir.parent  # solved
tests_dir = tests_solved_dir.parent  # tests
ml_or_dir = tests_dir.parent  # ml_or
root_dir = ml_or_dir.parent  # Voyageur_Studio

sys.path.insert(0, str(root_dir))

from ml_or.itinerary_optimizer import ItineraryOptimizer
from ml_or.explainability.diff_engine import ItineraryDiffEngine
from ml_or.explainability.causal_tagger import CausalTagger
from ml_or.explainability.delta_engine import DeltaEngine
from ml_or.explainability.payload_builder import ExplanationPayloadBuilder


def main():
    print("=" * 80)
    print("PREFERENCE CHANGE SCENARIO: FAM_B Requests LOC_006")
    print("=" * 80)
    
    # Define paths
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent.parent.parent
    data_dir = root_dir / "data"
    baseline_dir = root_dir / "tests" / "solved" / "3fam3day"
    output_dir = script_dir
    
    # --- 1. Load Baseline Optimized Solution ---
    print("\n[STEP 1] Loading baseline optimized solution...")
    baseline_solution_path = baseline_dir / "optimized_solution.json"
    with open(baseline_solution_path, "r") as f:
        baseline_solution = json.load(f)
    print(f"   Loaded baseline from: {baseline_solution_path}")
    print(f"   Baseline has {len(baseline_solution['days'])} days")
    
    # --- 2. Run Optimizer with FAM_B Preference ---
    print("\n[STEP 2] Re-running optimizer with FAM_B's new preference...")
    print("   FAM_B now MUST visit LOC_006 (Akshardham)")
    
    optimizer = ItineraryOptimizer(
        locations_file=str(data_dir / "locations.json"),
        transport_file=str(data_dir / "transport_graph.json"),
        base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
        family_prefs_file=str(output_dir / "family_preferences_fam_b_pref.json")
    )
    
    # Run for 3 days, 3 families (full trip with new preferences)
    new_solution = optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        num_days=3,
        lambda_divergence=0.05
    )
    
    if not new_solution:
        print("ERROR: Optimizer failed to find a solution with new preferences.")
        return
    
    print(f"   New solution generated with {len(new_solution['days'])} days")
    
    # --- 3. Compare Two Optimized Solutions ---
    print("\n[STEP 3] Comparing baseline vs new optimized solutions...")
    diff_engine = ItineraryDiffEngine()
    diffs = diff_engine.compare_optimized_solutions(
        baseline_optimized=baseline_solution,
        new_optimized=new_solution,
        days_to_compare=None  # Compare all days
    )
    print(f"   Diffs computed for {len(diffs)} family(s)")
    
    # Display summary of changes
    print("\n   CHANGE SUMMARY:")
    for family_id, day_diffs in diffs.items():
        for day, changes in day_diffs.items():
            print(f"     {family_id} Day {day}: {len(changes)} change(s)")
            for change in changes:
                print(f"       - {change['type']}: {change['poi']}")
    
    # --- 4. Get Decision Traces ---
    decision_traces = optimizer.decision_traces
    print(f"\n[STEP 4] Decision traces collected for {len(decision_traces)} day(s)")
    
    # --- 5. Run Causal Tagger ---
    print("\n[STEP 5] Running Causal Tagger...")
    tagger = CausalTagger()
    tagged_diffs = tagger.tag_changes(diffs, decision_traces)
    
    # --- 6. Run Delta Engine ---
    print("\n[STEP 6] Running Delta Engine...")
    delta_engine = DeltaEngine()
    
    # NOTE: We need to enhance delta engine to work with two optimized solutions
    # For now, we'll pass the decision traces and locations
    # The delta engine will need to be modified to accept baseline_solution
    enriched_diffs = delta_engine.compute_deltas(
        tagged_diffs, 
        decision_traces, 
        optimizer.locations
    )
    
    # --- 7. Run Payload Builder ---
    print("\n[STEP 7] Running Payload Builder...")
    builder = ExplanationPayloadBuilder()
    payloads = builder.build_payloads(
        enriched_diffs, 
        optimizer.locations, 
        audience="TRAVEL_AGENT"
    )
    print(f"   Generated {len(payloads)} explanation payload(s)")
    
    # --- 8. Save Outputs ---
    print("\n[STEP 8] Saving outputs...")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save New Optimized Solution
    solution_path = output_dir / "optimized_solution.json"
    with open(solution_path, "w") as f:
        json.dump(new_solution, f, indent=2)
    print(f"   [OK] Saved new optimized solution to: {solution_path}")
    
    # Save Decision Traces
    traces_path = output_dir / "decision_traces.json"
    with open(traces_path, "w") as f:
        json.dump({str(k): v for k, v in decision_traces.items()}, f, indent=2)
    print(f"   [OK] Saved decision traces to: {traces_path}")
    
    # Save Enriched Diffs
    diffs_path = output_dir / "enriched_diffs.json"
    with open(diffs_path, "w") as f:
        output = {}
        for fid, day_map in enriched_diffs.items():
            output[fid] = {str(d): changes for d, changes in day_map.items()}
        json.dump(output, f, indent=2)
    print(f"   [OK] Saved enriched diffs to: {diffs_path}")
    
    # Save Final Payloads (for LLM)
    payloads_path = output_dir / "llm_payloads.json"
    with open(payloads_path, "w") as f:
        json.dump(payloads, f, indent=2)
    print(f"   [OK] Saved LLM payloads to: {payloads_path}")
    
    # --- 9. Cost Impact Analysis ---
    print("\n" + "=" * 80)
    print("COST IMPACT ANALYSIS")
    print("=" * 80)
    
    # Compare total costs
    baseline_cost = baseline_solution.get("total_trip_cost", 0)
    new_cost = new_solution.get("total_trip_cost", 0)
    cost_increase = new_cost - baseline_cost
    
    print(f"\nTotal Trip Cost:")
    print(f"  Baseline: Rs {baseline_cost:.2f}")
    print(f"  New:      Rs {new_cost:.2f}")
    print(f"  Increase: Rs {cost_increase:.2f} ({(cost_increase/baseline_cost*100) if baseline_cost > 0 else 0:.1f}%)")
    
    print("\n" + "=" * 80)
    print("SCENARIO COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
