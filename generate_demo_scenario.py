
import json
import os

# Default Scenario: Day 1 Mid-Day Change
# Context: Families are at Lunch (13:00). FAM_C decides they MUST visit Lotus Temple.

scenario_data = {
    "day_index": 0, # Day 1
    "current_state": {
        "FAM_A": {"loc": "LOC_LUNCH", "time": "13:00"},
        "FAM_B": {"loc": "LOC_LUNCH", "time": "13:00"},
        "FAM_C": {"loc": "LOC_LUNCH", "time": "13:00"}
    },
    "visited_history": {
        "FAM_A": ["LOC_001", "LOC_008"], # Red Fort, Raj Ghat
        "FAM_B": ["LOC_001", "LOC_008"],
        "FAM_C": ["LOC_001", "LOC_008"]
    },

    "user_requests": {
        "FAM_A": {
             "force_visit": ["LOC_004"], # Lotus Temple (Group Decision)
             "force_skip": []
        },
        "FAM_B": {
             "force_visit": ["LOC_004"],
             "force_skip": []
        },
        "FAM_C": {
             "force_visit": ["LOC_004"], 
             "force_skip": []
        }
    }

}

OUTPUT_PATH = "ml_or/data/demo_scenario.json"

def generate():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(scenario_data, f, indent=4)
    print(f"Generated demo scenario at: {OUTPUT_PATH}")
    print("You can edit this file to simulate different real-time situations!")

if __name__ == "__main__":
    generate()
