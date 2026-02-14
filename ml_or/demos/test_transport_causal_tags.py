"""
Simple Transport Disruption Demo - Causal Tagging Test
Tests causal tagging and diff generation for BUS disruption scenario.
Follows chandni_demo output pattern.
"""
import sys
from pathlib import Path
import json

# Add paths
script_dir = Path(__file__).parent
ml_or_root = script_dir.parent
project_root = ml_or_root.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(ml_or_root))

from itinerary_optimizer import ItineraryOptimizer
from explainability.diff_engine import ItineraryDiffEngine
from explainability.causal_tagger import CausalTagger
from explainability.payload_builder import ExplanationPayloadBuilder


def main():
    """Run simple BUS disruption demo with causal tagging"""
    
    print("\n" + "="*80)
    print("TRANSPORT DISRUPTION DEMO - Causal Tagging Test")
    print("="*80 + "\n")
    
    # Setup
    data_dir = ml_or_root / "data"
    output_dir = script_dir / "output" / "bus_disruption_demo"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[SETUP] Output: {output_dir}\n")
    
    # =========================================================================
    # STEP 1: Baseline Optimization (Original Transport Graph)
    # =========================================================================
    print("="*80)
    print("STEP 1: Baseline Optimization (All Transport Available)")
    print("="*80 + "\n")
    
    print("[1.1] Running optimizer with original transport graph...")
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
    with open(baseline_file, 'w', encoding='utf-8') as f:
        json.dump(baseline_solution, f, indent=2, default=str)
    print(f"  ✓ Saved: {baseline_file.name}\n")
    
    # Count transport modes
    print("[1.2] Transport mode usage in baseline:")
    for day in baseline_solution["days"]:
        day_num = day["day"]
        modes = {}
        for fam_id, fam_data in day["families"].items():
            for poi in fam_data["pois"]:
                mode = poi.get("transport_to_next", {}).get("mode")
                if mode:
                    modes[mode] = modes.get(mode, 0) + 1
        print(f"  Day {day_num}: BUS={modes.get('BUS', 0)}, METRO={modes.get('METRO', 0)}")
    print()
    
    # =========================================================================
    # STEP 2: Create Filtered Transport Graph (BUS Unavailable)
    # =========================================================================
    print("="*80)
    print("STEP 2: Filter Transport Graph (Mark BUS Routes Unavailable)")
    print("="*80 + "\n")
    
    print("[2.1] Loading transport graph...")
    with open(data_dir / "transport_graph.json", 'r', encoding='utf-8') as f:
        transport_graph = json.load(f)
    
    # Filter BUS edges
    bus_filtered_count = 0
    for edge in transport_graph:
        if edge.get("mode") == "BUS":
            edge["available"] = False
            bus_filtered_count += 1
    
    # Save filtered graph
    filtered_graph_file = output_dir / "transport_graph_bus_unavailable.json"
    with open(filtered_graph_file, 'w', encoding='utf-8') as f:
        json.dump(transport_graph, f, indent=2)
    
    print(f"  ✓ Marked {bus_filtered_count} BUS edges as unavailable")
    print(f"  ✓ Saved: {filtered_graph_file.name}\n")
    
    # =========================================================================
    # STEP 3: Re-optimize with BUS Disruption
    # =========================================================================
    print("="*80)
    print("STEP 3: Re-optimize with BUS Disruption")
    print("="*80 + "\n")
    
    print("[3.1] Running optimizer with filtered transport graph...")
    disrupted_optimizer = ItineraryOptimizer(
        locations_file=str(data_dir / "locations.json"),
        transport_file=str(filtered_graph_file),
        base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
        family_prefs_file=str(data_dir / "family_preferences_3fam_strict.json")
    )
    
    disrupted_solution = disrupted_optimizer.optimize_trip(
        family_ids=["FAM_A", "FAM_B", "FAM_C"],
        num_days=3,
        lambda_divergence=0.05
    )
    
    # Save disrupted solution
    disrupted_file = output_dir / "disrupted_solution.json"
    with open(disrupted_file, 'w', encoding='utf-8') as f:
        json.dump(disrupted_solution, f, indent=2, default=str)
    print(f"  ✓ Saved: {disrupted_file.name}\n")
    
    # Count transport modes
    print("[3.2] Transport mode usage after disruption:")
    for day in disrupted_solution["days"]:
        day_num = day["day"]
        modes = {}
        for fam_id, fam_data in day["families"].items():
            for poi in fam_data["pois"]:
                mode = poi.get("transport_to_next", {}).get("mode")
                if mode:
                    modes[mode] = modes.get(mode, 0) + 1
        print(f"  Day {day_num}: BUS={modes.get('BUS', 0)}, METRO={modes.get('METRO', 0)}")
    print()
    
    # =========================================================================
    # STEP 4: Compute Diffs
    # =========================================================================
    print("="*80)
    print("STEP 4: Compute Itinerary Diffs")
    print("="*80 + "\n")
    
    print("[4.1] Computing route differences...")
    diff_engine = ItineraryDiffEngine()
    diffs = diff_engine.compare_optimized_solutions(
        baseline_solution,
        disrupted_solution,
        days_to_compare=[1, 2, 3]
    )
    
    # Save raw diffs
    diffs_file = output_dir / "diffs.json"
    with open(diffs_file, 'w', encoding='utf-8') as f:
        json.dump(diffs, f, indent=2)
    
    print(f"  ✓ Found diffs for {len(diffs)} families")
    for fam_id, day_diffs in diffs.items():
        total_changes = sum(len(changes) for changes in day_diffs.values())
        print(f"    {fam_id}: {total_changes} changes across {len(day_diffs)} days")
    print(f"  ✓ Saved: {diffs_file.name}\n")
    
    # =========================================================================
    # STEP 5: Apply Causal Tagging
    # =========================================================================
    print("="*80)
    print("STEP 5: Apply Causal Tagging")
    print("="*80 + "\n")
    
    print("[5.1] Creating decision traces with realistic candidate data...")
    
    # Load family preferences to calculate interest scores
    with open(data_dir / "family_preferences_3fam_strict.json", 'r', encoding='utf-8') as f:
        family_prefs = json.load(f)
    
    # Calculate interest scores for LOC_015 (Chandni Chowk):
    # Tags: shopping, food, history
    # Base importance: 0.88
    def calc_interest_score(family_id):
        fam_pref = next((f for f in family_prefs if f["family_id"] == family_id), None)
        if not fam_pref:
            return 1.0
        
        iv = fam_pref["interest_vector"]
        # Chandni Chowk: shopping + food + history
        base = 0.88
        score = base * (iv["shopping"] * 0.4 + iv["food"] * 0.4 + iv["history"] * 0.2)
        return round(score, 4)
    
    # Create decision traces with candidate data for Day 3 (index 2)
    decision_traces = {
        2: {  # Day 3
            "candidates": [
                {
                    "family": "FAM_A",
                    "day": 3,
                    "candidates": [
                        {
                            "poi_id": "LOC_LUNCH",
                            "interest_score": 1.2,
                            "role": "SKELETON"
                        },
                        {
                            "poi_id": "LOC_DINNER",
                            "interest_score": 1.17,
                            "role": "SKELETON"
                        },
                        {
                            "poi_id": "LOC_015",  # Chandni Chowk - ADDED
                            "interest_score": calc_interest_score("FAM_A"),  # shopping:0.3, food:0.4, history:0.9
                            "role": "BRANCH"
                        }
                    ]
                },
                {
                    "family": "FAM_B",
                    "day": 3,
                    "candidates": [
                        {
                            "poi_id": "LOC_LUNCH",
                            "interest_score": 1.45,
                            "role": "SKELETON"
                        },
                        {
                            "poi_id": "LOC_DINNER",
                            "interest_score": 1.63,
                            "role": "SKELETON"
                        },
                        {
                            "poi_id": "LOC_015",  # Chandni Chowk - ADDED
                            "interest_score": calc_interest_score("FAM_B"),  # shopping:0.8, food:0.9, history:0.3
                            "role": "BRANCH"
                        }
                    ]
                },
                {
                    "family": "FAM_C",
                    "day": 3,
                    "candidates": [
                        {
                            "poi_id": "LOC_LUNCH",
                            "interest_score": 1.3,
                            "role": "SKELETON"
                        },
                        {
                            "poi_id": "LOC_DINNER",
                            "interest_score": 1.37,
                            "role": "SKELETON"
                        },
                        {
                            "poi_id": "LOC_015",  # Chandni Chowk - ADDED
                            "interest_score": calc_interest_score("FAM_C"),  # shopping:0.7, food:0.6, history:0.6
                            "role": "BRANCH"
                        }
                    ]
                }
            ],
            "constraints": [],
            "active_disruptions": [
                {
                    "disruption_id": "BUS_STRIKE_20260215",
                    "affected_modes": ["BUS"],
                    "reason": "STRIKE",
                    "severity": "SEVERE"
                }
            ],
            "outcome": {
                "family": "ALL",
                "day": 3,
                "selected_pois": ["LOC_LUNCH", "LOC_015", "LOC_DINNER"],
                "objective_breakdown": {
                    "total_satisfaction": 0,
                    "coherence_loss": 0,
                    "net_value": 0
                },
                "rejected_eligible_pois": []
            }
        }
    }
    
    # Save decision traces
    traces_file = output_dir / "decision_traces.json"
    with open(traces_file, 'w', encoding='utf-8') as f:
        json.dump(decision_traces, f, indent=2)
    print(f"  ✓ Saved: {traces_file.name}\n")
    
    print("[5.2] Tagging changes with causal reasons...")
    causal_tagger = CausalTagger()
    enriched_diffs = causal_tagger.tag_changes(diffs, decision_traces)
    
    # Save enriched diffs
    enriched_file = output_dir / "enriched_diffs.json"
    with open(enriched_file, 'w', encoding='utf-8') as f:
        json.dump(enriched_diffs, f, indent=2)
    
    print(f"  ✓ Tagged {len(enriched_diffs)} families")
    
    # Count tags
    tag_counts = {}
    for fam_id, day_diffs in enriched_diffs.items():
        for day_num, changes in day_diffs.items():
            for change in changes:
                for tag in change.get("causal_tags", []):
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    print("  ✓ Causal tags found:")
    for tag, count in sorted(tag_counts.items()):
        print(f"    {tag}: {count}")
    print(f"  ✓ Saved: {enriched_file.name}\n")
    
    # =========================================================================
    # STEP 6: Build LLM Payloads
    # =========================================================================
    print("="*80)
    print("STEP 6: Build LLM Payloads")
    print("="*80 + "\n")
    
    print("[6.1] Loading location names...")
    with open(data_dir / "locations.json", 'r', encoding='utf-8') as f:
        locations_data = json.load(f)
    
    # Create location map
    locations_map = {loc["location_id"]: loc for loc in locations_data}
    
    print("[6.2] Building explanation payloads...")
    payload_builder = ExplanationPayloadBuilder()
    llm_payloads = payload_builder.build_payloads(enriched_diffs, locations_map)
    
    # Save payloads
    payloads_file = output_dir / "llm_payloads.json"
    with open(payloads_file, 'w', encoding='utf-8') as f:
        json.dump(llm_payloads, f, indent=2)
    
    print(f"  ✓ Generated {len(llm_payloads)} LLM payloads")
    print(f"  ✓ Saved: {payloads_file.name}\n")
    
    # Show sample payloads
    if llm_payloads:
        print("[6.3] Sample payloads:")
        for i, payload in enumerate(llm_payloads[:3], 1):
            print(f"\n  Payload {i}:")
            print(f"    Family: {payload.get('family')}")
            print(f"    Day: {payload.get('day')}")
            print(f"    Change: {payload.get('change_type')}")
            if payload.get('change_type') == 'ROUTE_CHANGED':
                print(f"    Route: {payload.get('from_poi')} → {payload.get('to_poi')}")
                print(f"    Mode: {payload.get('from_mode')} → {payload.get('to_mode')}")
            else:
                print(f"    POI: {payload.get('poi', {}).get('name')}")
            print(f"    Tags: {', '.join(payload.get('causal_tags', []))}")
        
        if len(llm_payloads) > 3:
            print(f"\n  ... and {len(llm_payloads) - 3} more")
    print()
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("="*80)
    print("DEMO COMPLETE")
    print("="*80 + "\n")
    
    print("[OUTPUT FILES]")
    print(f"  1. {baseline_file.name}")
    print(f"  2. {filtered_graph_file.name}")
    print(f"  3. {disrupted_file.name}")
    print(f"  4. {diffs_file.name}")
    print(f"  5. {traces_file.name}")
    print(f"  6. {enriched_file.name}")
    print(f"  7. {payloads_file.name}\n")
    
    print("[CAUSAL TAGGING TEST]")
    if tag_counts:
        print("  ✅ Causal tagging WORKING")
        print(f"  ✅ Found {len(tag_counts)} unique tag types")
        print(f"  ✅ Tagged {sum(tag_counts.values())} total changes")
    else:
        print("  ⚠️  No causal tags found - check implementation")
    
    print("\n[DIFF GENERATION TEST]")
    total_changes = sum(
        len(changes) 
        for fam in diffs.values() 
        for changes in fam.values()
    )
    if total_changes > 0:
        print("  ✅ Diff engine WORKING")
        print(f"  ✅ Generated {total_changes} change events")
    else:
        print("  ⚠️  No diffs found - check solutions")
    
    print(f"\n✅ All outputs saved to: {output_dir}")
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    main()
