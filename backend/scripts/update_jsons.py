import os
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.generate_demo_data import PERSONAS

DEMO_DIR = os.path.join(os.path.dirname(__file__), "..", "demo_data")

def update_jsons():
    for persona, config in PERSONAS.items():
        file_path = os.path.join(DEMO_DIR, f"{persona}_trip.json")
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                data = json.load(f)
            
            # Extend schema backwards compatibly
            data["persona_config"] = config
            
            # Add mock data for new requirements (hotels, flights, budget)
            data["persona_config"]["budget"] = {
                "total": 4500 if persona == "Family_Vacation" else 8000 if persona == "Luxury_Couple" else 1500,
                "currency": "USD"
            }
            data["persona_config"]["hotels"] = [
                {"name": "Taj Palace", "check_in": config["start_date"], "check_out": config["end_date"]}
            ]
            data["persona_config"]["flights"] = [
                {"airline": "Air India", "flight_number": "AI 101", "date": config["start_date"]}
            ]

            with open(file_path, "w") as f:
                json.dump(data, f, indent=2)
            print(f"Updated {file_path}")

if __name__ == "__main__":
    update_jsons()
