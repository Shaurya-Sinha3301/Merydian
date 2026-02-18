"""
Enhanced Demo Runner - Full Base+Backbone Architecture
======================================================
Pipeline:
  Phase 0: Display pre-built initial baseline (base_itinerary → backbone → solution)
  Phase 1: Run scenarios sequentially, each using previous output as baseline
"""
import sys
from pathlib import Path
from datetime import datetime
import json
import time

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from agents.agent_controller import AgentController
from agents.explainability_agent import ExplainabilityAgent


def main():
    """Run all demo scenarios with proper LLM payloads."""
    
    print("\n" + "="*80)
    print("VOYAGEUR AGENT SYSTEM - FULL DEMO WITH BASE+BACKBONE ARCHITECTURE")
    print("="*80 + "\n")
    
    # ═══════════════════════════════════════════════════════════════
    # PHASE 0: Verify Initial Baseline
    # ═══════════════════════════════════════════════════════════════
    
    data_dir = project_root / "ml_or" / "data"
    initial_solution_path = data_dir / "initial_optimized_solution.json"
    backbone_path = data_dir / "optimized_backbone.json"
    base_itinerary_path = data_dir / "base_itinerary_clustered.json"
    base_prefs_path = data_dir / "family_preferences_3fam_strict.json"
    
    print("─" * 80)
    print("PHASE 0: Initial Baseline (Pre-built)")
    print("─" * 80)
    print(f"  📋 Base Itinerary:  {base_itinerary_path}")
    print(f"  🏨 Backbone:        {backbone_path}")
    print(f"  ✅ Initial Solution: {initial_solution_path}")
    
    if not initial_solution_path.exists():
        print("\n  ❌ ERROR: Initial baseline solution not found!")
        print("  Run `python -m agents.optimizer_agent` first to generate it,")
        print("  then copy the output to ml_or/data/initial_optimized_solution.json")
        return
    
    # Load and display baseline summary
    with open(initial_solution_path, 'r') as f:
        baseline = json.load(f)
    
    num_days = len(baseline.get('days', []))
    families = baseline.get('families', [])
    print(f"\n  📊 Baseline Summary:")
    print(f"     Trip ID: {baseline.get('trip_id', 'N/A')}")
    print(f"     Days: {num_days}")
    print(f"     Families: {', '.join(families)}")
    
    for day_data in baseline.get('days', []):
        day_num = day_data.get('day', '?')
        shared_pois = day_data.get('shared_poi_order', [])
        print(f"     Day {day_num}: {len(shared_pois)} shared POIs → {shared_pois}")
    
    print(f"\n  This baseline will be used as the comparison point for all scenarios.\n")
    
    # ═══════════════════════════════════════════════════════════════
    # PHASE 1: Run Scenarios Sequentially
    # ═══════════════════════════════════════════════════════════════
    
    print("─" * 80)
    print("PHASE 1: Running Scenarios (Sequential Chain)")
    print("─" * 80 + "\n")
    
    # Initialize controller and explainability agent
    print("Initializing agent system...\n")
    controller = AgentController()
    
    # Create consolidated output directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    demo_dir = project_root / "agents" / "tests" / f"demo_run_{timestamp}"
    demo_dir.mkdir(parents=True, exist_ok=True)
    
    # Define scenarios
    scenarios = [
        {
            "name": "Must-Visit (Chandni Chowk for FAM_B)",
            "input": "We really want to visit Chandni Chowk for some street food. It's the start of Day 2.",
            "context": {"family_id": "FAM_B", "current_day": 1},
        },
        {
            "name": "Location Excluded (Red Fort for FAM_A)",
            "input": "Please skip the Red Fort on Day 3, we're not interested.",
            "context": {"family_id": "FAM_A", "current_day": 2},
        },
        {
            "name": "METRO Disruption (Global)",
            "input": "There's a METRO strike starting tomorrow (Day 3), all metro services are unavailable",
            "context": {"current_day": 2},
        }
    ]
    
    all_results = []
    
    # Chain state: starts with the initial baseline
    previous_solution_path = initial_solution_path
    current_prefs_path = None  # First scenario uses base preferences
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{'#'*80}")
        print(f"SCENARIO {i}/{len(scenarios)}: {scenario['name']}")
        print(f"{'#'*80}\n")
        print(f"User: \"{scenario['input']}\"\n")
        
        # Rate limiting: pause between scenarios to avoid API limits
        if i > 1:
            print(f"⏳ Pausing 10 seconds to avoid rate limiting...\n")
            time.sleep(10)
        
        # Build context with chained state
        context = scenario["context"].copy() if scenario["context"] is not None else {}
        context["previous_solution"] = str(previous_solution_path)
        context["output_dir"] = str(demo_dir / f"scenario_{i}")
        if current_prefs_path:
            context["current_preferences_path"] = str(current_prefs_path)
        
        print(f"  🔗 Baseline: {previous_solution_path.name}")
        if current_prefs_path:
            print(f"  🔗 Prefs:    {current_prefs_path.name}")
        print(f"  📁 Output:   {context['output_dir']}\n")
        
        # Process scenario through the full agent pipeline
        result = controller.process_user_input(
            scenario["input"],
            context
        )
        
        # Collect basic outputs
        scenario_output = {
            "scenario_number": i,
            "scenario_name": scenario["name"],
            "timestamp": datetime.now().isoformat(),
            "user_input": scenario["input"],
            "context": {k: str(v) for k, v in context.items()},
            "feedback_agent": {
                "input": scenario["input"],
                "output": {
                    "event_type": str(result['event'].event_type),
                    "confidence": str(result['event'].confidence),
                    "poi_name": result['event'].poi_name,
                    "poi_id": result['event'].poi_id,
                    "rating": result['event'].rating,
                    "day": result['event'].day,
                    "family_id": result['event'].family_id,
                }
            },
            "decision_agent": {
                "input": result['event'].model_dump(),
                "output": {
                    "action": str(result['decision'].action),
                    "reason": result['decision'].reason,
                }
            },
            "optimizer_triggered": result['decision'].action == "RUN_OPTIMIZER",
            "optimizer_output_dir": None
        }
        
        if result['optimizer_output']:
            optimizer_output_dir = Path(result['optimizer_output']['llm_payloads']).parent
            scenario_output["optimizer_output_dir"] = str(optimizer_output_dir)
            
            # Load payloads for explainability
            payloads_file = optimizer_output_dir / "llm_payloads.json"
            
            if payloads_file.exists():
                print(f"  📄 Loading payloads from: {payloads_file}")
                with open(payloads_file, 'r', encoding='utf-8') as f:
                    payload_data = json.load(f)
                
                # Handle list vs dict (families/agent)
                payloads_to_process = []
                if isinstance(payload_data, dict):
                    if "families" in payload_data:
                        payloads_to_process.extend(payload_data["families"])
                    if "travel_agent" in payload_data:
                        payloads_to_process.append(payload_data["travel_agent"])
                elif isinstance(payload_data, list):
                    payloads_to_process = payload_data
                
                print(f"  ℹ️ Found {len(payloads_to_process)} payloads to process")
                
                explanations = []
                for payload in payloads_to_process:
                    audience = payload.get("audience", "FAMILY")
                    family_id = payload.get("family_id", "N/A")
                    print(f"  📤 Sending to Explainability Agent:")
                    print(f"     Audience: {audience}")
                    if family_id != "N/A":
                        print(f"     Family: {family_id}")
                    
                    explanation = controller.explainability_agent.explain(payload)
                    explanations.append({
                        "audience": audience,
                        "explanation": explanation.summary,
                        "family_id": payload.get("family_id")
                    })
                    print(f"  📥 Explainability Agent Output: {explanation.summary}")
                    
                    # Rate limiting to avoid 429 errors
                    if payload != payloads_to_process[-1]:
                        print("  ⏳ Sleeping 10s to respect API limits...")
                        time.sleep(10)
                
                # Store explanations
                scenario_output["explainability_agent"] = {
                    "explanations": explanations
                }
                
                # ═══════════════════════════════════════════════════
                # CHAIN STATE: Update for next scenario
                # ═══════════════════════════════════════════════════
                optimized_solution_file = optimizer_output_dir / "optimized_solution.json"
                if optimized_solution_file.exists():
                    previous_solution_path = optimized_solution_file
                    print(f"  🔗 Next baseline updated: {previous_solution_path}")
                
                updated_prefs_file = optimizer_output_dir / "family_preferences_updated.json"
                if updated_prefs_file.exists():
                    current_prefs_path = updated_prefs_file
                    print(f"  🔗 Next prefs updated: {current_prefs_path}")
            else:
                print("  ⚠️  No llm_payloads.json found in optimizer output")
                scenario_output["explainability_agent"] = {"explanations": []}
        else:
            # No optimizer run, so no explainability needed
            scenario_output["explainability_agent"] = {"explanations": []}
        
        all_results.append(scenario_output)
        
        # Display summary
        print("\n--- SUMMARY ---")
        print(f"Event Type: {result['event'].event_type}")
        print(f"Confidence: {result['event'].confidence}")
        print(f"Decision: {result['decision'].action}")
        print(f"Optimizer Run: {'Yes' if result['optimizer_output'] else 'No'}")
        if scenario_output.get("explainability_agent", {}).get("explanations"):
            print(f"Explanations Generated: {len(scenario_output['explainability_agent']['explanations'])}")

        # Save intermediate results per scenario
        scenario_dir = Path(context["output_dir"])
        scenario_dir.mkdir(parents=True, exist_ok=True)
        scenario_output_file = scenario_dir / "llm_outputs.json"
        try:
            with open(scenario_output_file, 'w', encoding='utf-8') as f:
                json.dump(scenario_output, f, indent=2, ensure_ascii=False, default=str)
            print(f"  💾 Scenario results saved to: {scenario_output_file}")
        except Exception as e:
            print(f"  ⚠️ Warning: Could not save scenario results: {e}")
    
    # ═══════════════════════════════════════════════════════════════
    # FINAL: Save consolidated results
    # ═══════════════════════════════════════════════════════════════
    
    consolidated_file = demo_dir / "all_scenarios.json"
    with open(consolidated_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"\n{'='*80}")
    print("DEMO COMPLETED")
    print(f"{'='*80}\n")
    print(f"✅ All outputs consolidated in: {demo_dir}")
    print(f"✅ Consolidated results: {consolidated_file}")
    print(f"\nResults:")
    print(f"  Scenarios run: {len(scenarios)}")
    print(f"  Optimizer triggered: {sum(1 for r in all_results if r['optimizer_triggered'])} times")
    total_explanations = sum(len(r.get('explainability_agent', {}).get('explanations', [])) for r in all_results)
    print(f"  Explanations generated: {total_explanations}")
    
    print(f"\n📁 Output Structure:")
    print(f"  {demo_dir.name}/")
    for i in range(1, len(scenarios) + 1):
        scenario_dir = demo_dir / f"scenario_{i}"
        if scenario_dir.exists():
            files = [f.name for f in scenario_dir.iterdir()]
            print(f"    scenario_{i}/ → {', '.join(files)}")
    print(f"    all_scenarios.json")


if __name__ == "__main__":
    main()
