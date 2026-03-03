"""Test: verify the full explainability pipeline outputs POI names properly."""
from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor
import json

fp = FeedbackProcessor()

old_itinerary = {
    "days": [{
        "day": 1,
        "families": {
            "FAM_A": {
                "pois": [
                    {"location_id": "LOC_001"},
                    {"location_id": "LOC_003"}
                ]
            }
        }
    }]
}

new_itinerary = {
    "days": [{
        "day": 1,
        "families": {
            "FAM_A": {
                "pois": [
                    {"location_id": "LOC_006"},
                    {"location_id": "LOC_003"}
                ]
            }
        }
    }]
}

result = fp.process_feedback(
    trip_id="test_trip",
    family_id="FAM_A",
    old_itinerary=old_itinerary,
    new_itinerary=new_itinerary,
    user_message="Add Akshardham and remove Red Fort",
)

print("=== EXPLANATIONS ===")
for exp in result["explanations"]:
    print(f"Day {exp['day']}: {exp['change_type']} - {exp['poi_name']} ({exp['poi_id']})")
    print(f"  Tags: {exp['causal_tags']}")
    print(f"  Cost: {exp['cost_delta']}")
    llm = exp.get('llm_explanation', '')
    print(f"  LLM: {llm[:120]}")
    print()

if not result["explanations"]:
    print("NO EXPLANATIONS")
    print("Diffs:", json.dumps(result["diffs"], indent=2))
