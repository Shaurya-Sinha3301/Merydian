
import json
import os

# Simple Scenario: Morning of Day 1
# Context: Fresh start, but user wants to add Lotus Temple immediately to the plan.

scenario_data = {
    "day_index": 0, # Day 1
    "current_state": {
        "FAM_A": {"loc": "LOC_HOTEL", "time": "09:00"},
        "FAM_B": {"loc": "LOC_HOTEL", "time": "09:00"},
        "FAM_C": {"loc": "LOC_HOTEL", "time": "09:00"}
    },
    "visited_history": {
        # Empty history for a fresh start
    },
    "user_requests": {
        "FAM_A": {"force_visit": ["LOC_004"], "force_skip": []},
        "FAM_B": {"force_visit": ["LOC_004"], "force_skip": []},
        "FAM_C": {"force_visit": ["LOC_004"], "force_skip": []}
    }
}

OUTPUT_PATH = "ml_or/data/simple_demo.json"

def generate():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(scenario_data, f, indent=4)
    print(f"Generated simple demo scenario at: {OUTPUT_PATH}")

if __name__ == "__main__":
    generate()
