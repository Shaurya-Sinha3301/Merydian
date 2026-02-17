"""
Enhanced Demo Runner - Uses LLM payloads for proper explainability.
Loads llm_payloads.json from optimizer output (contains actual POI names).
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
    print("VOYAGEUR AGENT SYSTEM - FULL DEMO WITH LLM PAYLOADS")
    print("="*80 + "\n")
    
    # Initialize controller and explainability agent
    print("Initializing agent system...\n")
    controller = AgentController()
    exp_agent = ExplainabilityAgent()
    
    # Define scenarios
    scenarios = [
        {
            "name": "Must-Visit Location Added",
            "input": "We really want to visit Chandni Chowk for some street food.",
            "context": {"family_id": "FAM_B"},
        },
        {
            "name": "Location Excluded",
            "input": "Please skip the Red Fort, we're not interested.",
            "context": {"family_id": "FAM_A"},
        },
        {
            "name": "Day Rating (Soft Preference)",
            "input": "I'd rate today a 9 out of 10!",
            "context": {"family_id": "FAM_C", "day": 1},
        },
        {
            "name": "METRO Global Disruption",
            "input": "There's a METRO strike today, all metro services are unavailable",
            "context": {},
        },
        {
            "name": "Delay Reported (Mocked)",
            "input": "We're running 30 minutes late due to traffic",
            "context": None,
        }
    ]
    
    all_results = []
    previous_solution_path = None  # Track previous scenario's output for sequential comparison
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{'#'*80}")
        print(f"SCENARIO {i}/{len(scenarios)}: {scenario['name']}")
        print(f"{'#'*80}\n")
        print(f"User: \"{scenario['input']}\"\n")
        
        # Rate limiting: pause between scenarios to avoid API limits
        if i > 1:  # Skip pause before first scenario
            print(f"⏳ Pausing 10 seconds to avoid rate limiting...\n")
            time.sleep(10)
        
        # Build context with previous solution for comparison
        context = scenario["context"] if scenario["context"] is not None else {}
        if previous_solution_path:
            context["previous_solution"] = str(previous_solution_path)
        
        # Process scenario
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
            "context": scenario["context"],
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
                "input": result['event'].dict(),
                "output": {
                    "action": str(result['decision'].action),
                    "reason": result['decision'].reason,
                }
            },
            "optimizer_triggered": result['optimizer_output'] is not None,
        }
        
        # If optimizer was triggered, load and use LLM payloads
        if result['optimizer_output']:
            llm_payloads_path = result['optimizer_output'].get('llm_payloads')
            optimizer_output_dir = Path(llm_payloads_path).parent if llm_payloads_path else None
            
            if llm_payloads_path and Path(llm_payloads_path).exists():
                print(f"\n✓ Using optimizer output folder: {optimizer_output_dir}")
                print(f"✓ Loading LLM payloads from: {llm_payloads_path}")
                
                # Load LLM payloads
                with open(llm_payloads_path, 'r') as f:
                    llm_payloads = json.load(f)
                
                print(f"✓ Loaded {len(llm_payloads)} LLM payload(s) with actual POI names")
                
                # Generate explanations using LLM payloads
                explanations = []
                for payload in llm_payloads:
                    # Show what we're sending to the explainability agent
                    print(f"\n  📤 Sending to Explainability Agent:")
                    print(f"     Family: {payload.get('family')}")
                    print(f"     POI: {payload.get('poi', {}).get('name', 'Unknown')}")
                    print(f"     Change: {payload.get('change_type')}")
                    print(f"     Causal Tags: {', '.join(payload.get('causal_tags', []))}")
                    
                    explanation = exp_agent.explain(payload)
                    explanations.append({
                        "input_payload": payload,
                        "output_summary": explanation.summary
                    })
                    print(f"  📥 Explainability Agent Output: {explanation.summary}")
                
                scenario_output["explainability_agent"] = {
                    "input": llm_payloads,
                    "output": explanations
                }
                # Store the optimizer folder for later use
                scenario_output["optimizer_output_dir"] = str(optimizer_output_dir)
                
                # Update previous_solution_path for next scenario
                optimized_solution_file = optimizer_output_dir / "optimized_solution.json"
                if optimized_solution_file.exists():
                    previous_solution_path = optimized_solution_file
                    print(f"  💾 Saved baseline for next scenario: {previous_solution_path}")
            else:
                print("  ⚠️  No llm_payloads.json found in optimizer output")
                scenario_output["explainability_agent"] = {
                    "input": [],
                    "output": []
                }
        else:
            # No optimizer run, so no explainability needed
            scenario_output["explainability_agent"] = {
                "input": [],
                "output": []
            }
        
        all_results.append(scenario_output)
        
        # Display summary
        print("\n--- SUMMARY ---")
        print(f"Event Type: {result['event'].event_type}")
        print(f"Confidence: {result['event'].confidence}")
        print (f"Decision: {result['decision'].action}")
        print(f"Optimizer Run: {'Yes' if result['optimizer_output'] else 'No'}")
        if scenario_output.get("explainability_agent", {}).get("output"):
            print(f"Explanations Generated: {len(scenario_output['explainability_agent']['output'])}")
    
    # Use the optimizer's output folder (from the last optimizer run) for saving all outputs
    # This consolidates everything into one folder
    output_dir = None
    for result in all_results:
        if result.get("optimizer_output_dir"):
            output_dir = Path(result["optimizer_output_dir"])
            break
    
    if not output_dir:
        # Fallback: create a new folder if optimizer never ran
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = project_root / "agents" / "tests" / f"demo_run_{timestamp}"
        output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save all outputs to JSON in the optimizer's folder
    output_file = output_dir / "llm_outputs.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False, default=str)
    
    # Save summary
    summary_file = output_dir / "summary.txt"
    with open(summary_file, 'w') as f:
        f.write(f"Demo Run Summary\n")
        f.write(f"{'='*80}\n")
        f.write(f"Output Directory: {output_dir}\n")
        f.write(f"Total scenarios: {len(scenarios)}\n")
        f.write(f"Optimizer triggered: {sum(1 for r in all_results if r['optimizer_triggered'])} times\n\n")
        
        for result in all_results:
            f.write(f"\nScenario {result['scenario_number']}: {result['scenario_name']}\n")
            f.write(f"  User Input: {result['user_input']}\n")
            f.write(f"  Event Type: {result['feedback_agent']['output']['event_type']}\n")
            f.write(f"  Decision: {result['decision_agent']['output']['action']}\n")
            
            explanations = result.get("explainability_agent", {}).get("output", [])
            if explanations:
                f.write(f"  Explanations ({len(explanations)}):\n")
                for exp in explanations:
                    f.write(f"    - {exp['output_summary']}\n")
    
    print(f"\n{'='*80}")
    print("DEMO COMPLETED")
    print(f"{'='*80}\n")
    print(f"✅ All outputs consolidated in: {output_dir}")
    print(f"✅ LLM inputs/outputs: {output_file}")
    print(f"✅ Summary: {summary_file}")
    print(f"\nResults:")
    print(f"  Scenarios run: {len(scenarios)}")
    print(f"  Optimizer triggered: {sum(1 for r in all_results if r['optimizer_triggered'])} times")
    total_explanations = sum(len(r.get('explainability_agent', {}).get('output', [])) for r in all_results)
    print(f"  Explanations generated: {total_explanations}")


if __name__ == "__main__":
    main()
