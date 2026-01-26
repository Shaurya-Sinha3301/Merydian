"""
Script to run the Explainability Pipeline and save the generated JSON output.
Demonstrates the end-to-end flow from Optimizer -> Diff -> Tags -> Deltas -> Payload.
"""
import json
import sys
from pathlib import Path

# Fix import path when running from Voyageur_Studio directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from ml_or.itinerary_optimizer import ItineraryOptimizer
from ml_or.explainability.diff_engine import ItineraryDiffEngine
from ml_or.explainability.causal_tagger import CausalTagger
from ml_or.explainability.delta_engine import DeltaEngine
from ml_or.explainability.payload_builder import ExplanationPayloadBuilder

def main():
    print("=" * 80)
    print("EXPLAINABILITY PIPELINE DEMO")
    print("=" * 80)
    
    # --- 1. Run Optimizer ---
    print("\n[STEP 1] Running Optimizer...")
    
    # Calculate data paths relative to this script's location
    script_dir = Path(__file__).parent
    data_dir = script_dir / "data"
    
    optimizer = ItineraryOptimizer(
        locations_file=str(data_dir / "locations.json"),
        transport_file=str(data_dir / "transport_graph.json"),
        base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
        family_prefs_file=str(data_dir / "family_preferences_3fam_strict.json")
    )
    
    # Run for 1 day, 3 families
    solution = optimizer.optimize_multi_family_single_day(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        day_index=0,
        max_pois=5,
        time_limit_seconds=30,
        enable_trace=True  # Enable decision tracing
    )
    
    if not solution:
        print("ERROR: Optimizer failed to find a solution.")
        return
    
    # --- 2. Get Decision Trace ---
    decision_traces = optimizer.decision_traces
    print(f"\n[STEP 2] Decision Trace collected for {len(decision_traces)} day(s).")
    
    # --- 3. Run Diff Engine ---
    print("\n[STEP 3] Running Diff Engine...")
    diff_engine = ItineraryDiffEngine()
    diffs = diff_engine.compute_diff(optimizer.base_itinerary, solution)
    print(f"   Diffs computed for {len(diffs)} family(s).")
    
    # --- 4. Run Causal Tagger ---
    print("\n[STEP 4] Running Causal Tagger...")
    tagger = CausalTagger()
    tagged_diffs = tagger.tag_changes(diffs, decision_traces)
    
    # --- 5. Run Delta Engine ---
    print("\n[STEP 5] Running Delta Engine...")
    delta_engine = DeltaEngine()
    enriched_diffs = delta_engine.compute_deltas(tagged_diffs, decision_traces, optimizer.locations)
    
    # --- 6. Run Payload Builder ---
    print("\n[STEP 6] Running Payload Builder...")
    builder = ExplanationPayloadBuilder()
    payloads = builder.build_payloads(enriched_diffs, optimizer.locations, audience="TRAVEL_AGENT")
    print(f"   Generated {len(payloads)} explanation payload(s).")
    
    # --- 7. Save Outputs ---
    output_dir = Path("ml_or/tests/solved")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save Optimized Solution
    solution_path = output_dir / "optimized_solution_3fam.json"
    with open(solution_path, "w") as f:
        json.dump(solution, f, indent=2)
    print(f"\n[OK] Saved optimized solution to: {solution_path}")
    
    # Save Decision Traces
    traces_path = output_dir / "decision_traces_3fam.json"
    with open(traces_path, "w") as f:
        # Convert dict keys to strings for JSON compatibility
        json.dump({str(k): v for k, v in decision_traces.items()}, f, indent=2)
    print(f"[OK] Saved decision traces to: {traces_path}")
    
    # Save Enriched Diffs
    diffs_path = output_dir / "enriched_diffs_3fam.json"
    with open(diffs_path, "w") as f:
        # Flatten structure for JSON
        output = {}
        for fid, day_map in enriched_diffs.items():
            output[fid] = {str(d): changes for d, changes in day_map.items()}
        json.dump(output, f, indent=2)
    print(f"[OK] Saved enriched diffs to: {diffs_path}")
    
    # Save Final Payloads (for LLM)
    payloads_path = output_dir / "llm_payloads_3fam.json"
    with open(payloads_path, "w") as f:
        json.dump(payloads, f, indent=2)
    print(f"[OK] Saved LLM payloads to: {payloads_path}")
    
    print("\n" + "=" * 80)
    print("PIPELINE COMPLETE. Review the JSON files in ml_or/tests/solved/")
    print("=" * 80)

if __name__ == "__main__":
    main()
