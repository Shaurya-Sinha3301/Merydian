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
            "name": "Must-Visit (Simulated Day 2 Start)",
            "input": "We really want to visit Chandni Chowk for some street food. It's the start of Day 2.",
            "context": {"family_id": "FAM_B", "current_day": 1}, # 0-indexed, so 1 is Day 2
        },
        {
            "name": "Location Excluded (Day 3 Preference)",
            "input": "Please skip the Red Fort on Day 3, we're not interested.",
            "context": {"family_id": "FAM_A", "current_day": 2}, # Day 3
        },
        {
            "name": "METRO Disruption (Start of Day 3)",
            "input": "There's a METRO strike starting tomorrow (Day 3), all metro services are unavailable",
            "context": {"current_day": 2}, # Day 3
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
        context = scenario["context"].copy() if scenario["context"] is not None else {}
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
            
            # Load payloads
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
                
                # Clean output structure - just the explanations
                scenario_output["explainability_agent"] = {
                    "explanations": explanations
                }
                
                # Update previous_solution_path for next scenario
                optimized_solution_file = optimizer_output_dir / "optimized_solution.json"
                if optimized_solution_file.exists():
                    previous_solution_path = optimized_solution_file
                    print(f"  💾 Saved baseline for next scenario: {previous_solution_path}")
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
        print (f"Decision: {result['decision'].action}")
        print(f"Optimizer Run: {'Yes' if result['optimizer_output'] else 'No'}")
        if scenario_output.get("explainability_agent", {}).get("explanations"):
            print(f"Explanations Generated: {len(scenario_output['explainability_agent']['explanations'])}")

        # INTERMEDIATE SAVE: Save results after every scenario
        current_output_dir = None
        if result['optimizer_output']:
             current_output_dir = Path(result['optimizer_output']['llm_payloads']).parent
        
        if not current_output_dir:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            current_output_dir = project_root / "agents" / "tests" / f"demo_results_{timestamp}"
            current_output_dir.mkdir(parents=True, exist_ok=True)
            
        output_file = current_output_dir / "llm_outputs.json"
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_results, f, indent=2, ensure_ascii=False, default=str)
            print(f"  💾 Intermediate results saved to: {output_file}")
        except Exception as e:
            print(f"  ⚠️ Warning: Could not save intermediate results: {e}")
    
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
    
    print(f"\n{'='*80}")
    print("DEMO COMPLETED")
    print(f"{'='*80}\n")
    print(f"✅ All outputs consolidated in: {output_dir}")
    print(f"✅ LLM inputs/outputs: {output_file}")
    print(f"\nResults:")
    print(f"  Scenarios run: {len(scenarios)}")
    print(f"  Optimizer triggered: {sum(1 for r in all_results if r['optimizer_triggered'])} times")
    total_explanations = sum(len(r.get('explainability_agent', {}).get('explanations', [])) for r in all_results)
    print(f"  Explanations generated: {total_explanations}")


if __name__ == "__main__":
    main()
