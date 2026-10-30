import os
import json
import asyncio
from datetime import datetime
from uuid import uuid4

# Mocking the pipeline for now if LLM is unavailable, but the actual implementation 
# can use the real OptimizerAgent if the API key is set.
from app.services.trip_service import TripService
from app.core.db import engine
from sqlmodel import Session

DEMO_DIR = os.path.join(os.path.dirname(__file__), "..", "demo_data")

PERSONAS = {
    "Family_Vacation": {
        "trip_name": "Family Vacation in Delhi",
        "destination": "Delhi, India",
        "start_date": "2026-03-15",
        "end_date": "2026-03-18",
        "families": [{
            "family_id": "DEMO_FAM_VACATION",
            "members": 4,
            "children": 2,
            "budget_sensitivity": 0.5,
            "energy_level": 0.8,
            "pace_preference": "moderate",
            "interest_vector": {"history": 0.6, "architecture": 0.5, "food": 0.8, "nature": 0.7, "nightlife": 0.0, "shopping": 0.4, "religious": 0.2, "adventure": 0.8, "culture": 0.6},
            "must_visit_locations": ["LOC_008"]
        }]
    },
    "Luxury_Couple": {
        "trip_name": "Luxury Couple Retreat",
        "destination": "Delhi, India",
        "start_date": "2026-04-10",
        "end_date": "2026-04-13",
        "families": [{
            "family_id": "DEMO_LUXURY_COUPLE",
            "members": 2,
            "children": 0,
            "budget_sensitivity": 0.0,
            "energy_level": 0.5,
            "pace_preference": "relaxed",
            "interest_vector": {"history": 0.5, "architecture": 0.8, "food": 1.0, "nature": 0.5, "nightlife": 0.9, "shopping": 1.0, "religious": 0.0, "adventure": 0.1, "culture": 0.8},
            "must_visit_locations": []
        }]
    },
    "Budget_Backpacker": {
        "trip_name": "Budget Backpacker Adventure",
        "destination": "Delhi, India",
        "start_date": "2026-05-01",
        "end_date": "2026-05-05",
        "families": [{
            "family_id": "DEMO_BUDGET_BACKPACKER",
            "members": 1,
            "children": 0,
            "budget_sensitivity": 1.0,
            "energy_level": 1.0,
            "pace_preference": "fast",
            "interest_vector": {"history": 0.9, "architecture": 0.8, "food": 0.9, "nature": 0.5, "nightlife": 0.7, "shopping": 0.2, "religious": 0.7, "adventure": 0.8, "culture": 1.0},
            "must_visit_locations": []
        }]
    },
    "Elderly_Travelers": {
        "trip_name": "Relaxing Golden Years Trip",
        "destination": "Delhi, India",
        "start_date": "2026-06-01",
        "end_date": "2026-06-05",
        "families": [{
            "family_id": "DEMO_ELDERLY",
            "members": 2,
            "children": 0,
            "budget_sensitivity": 0.3,
            "energy_level": 0.2,
            "pace_preference": "relaxed",
            "interest_vector": {"history": 1.0, "architecture": 0.9, "food": 0.5, "nature": 0.8, "nightlife": 0.0, "shopping": 0.3, "religious": 0.9, "adventure": 0.0, "culture": 0.9},
            "must_visit_locations": []
        }]
    },
    "Accessibility_Trip": {
        "trip_name": "Accessible Delhi Tour",
        "destination": "Delhi, India",
        "start_date": "2026-07-10",
        "end_date": "2026-07-14",
        "families": [{
            "family_id": "DEMO_ACCESSIBILITY",
            "members": 3,
            "children": 0,
            "budget_sensitivity": 0.5,
            "energy_level": 0.4,
            "pace_preference": "relaxed",
            "interest_vector": {"history": 0.8, "architecture": 0.7, "food": 0.8, "nature": 0.6, "nightlife": 0.0, "shopping": 0.5, "religious": 0.5, "adventure": 0.0, "culture": 0.8},
            "must_visit_locations": [],
            "accessibility_needs": ["wheelchair", "no_stairs"]
        }]
    }
}

def run_demo_generation():
    if not os.path.exists(DEMO_DIR):
        os.makedirs(DEMO_DIR)

    for persona, config in PERSONAS.items():
        print(f"Generating demo data for {persona}...")
        try:
            # Initialize trip
            result = TripService.initialize_trip(
                trip_name=config["trip_name"],
                destination=config["destination"],
                start_date=config["start_date"],
                end_date=config["end_date"],
                baseline_itinerary="delhi_3day_skeleton",
                families=config["families"]
            )
            
            trip_id = result["trip_id"]
            
            # Since running full optimizer requires LLMs, we dump the current state 
            # to be used as deterministic data.
            # In a real environment, you'd trigger the optimizer and wait for completion.
            
            demo_file = os.path.join(DEMO_DIR, f"{persona}_trip.json")
            with open(demo_file, "w") as f:
                json.dump(result, f, indent=2)
                
            print(f"Saved {persona} to {demo_file}")
            
        except Exception as e:
            print(f"Failed generating {persona}: {e}")

if __name__ == "__main__":
    run_demo_generation()
    print("Demo data generation complete.")
