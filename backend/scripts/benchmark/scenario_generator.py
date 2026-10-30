import json
import os
import random
from typing import Dict, List, Any

# Scenario Categories (Added challenging ones)
CATEGORIES = [
    "Solo Traveler",
    "Couple",
    "Family with Children",
    "Elderly Travelers",
    "Luxury Vacation",
    "Budget Vacation",
    "Weekend Trip",
    "Long Vacation",
    "Dense City Itinerary",
    "Sparse Rural Itinerary",
    "High Transport Disruption",
    "Accessibility-Focused Trip",
    "Overloaded Day",          # Too many attractions
    "Mixed Interests",         # Conflicting family interests
    "Heavy Traffic"            # Stresses transport cost/time
]

# All available POIs in locations.json (excluding restaurants)
AVAILABLE_POIS = [f"LOC_{str(i).zfill(3)}" for i in range(1, 21)]

def generate_family_preference(category: str, seed: int) -> Dict[str, Any]:
    random.seed(seed)
    
    members = 2
    children = 0
    budget_sensitivity = 0.5
    energy_level = 1.0
    profiles = []
    interest_vector = {"history": 0.5, "culture": 0.5, "food": 0.5, "nature": 0.5, "shopping": 0.5}
    must_visits = []
    
    if "Solo" in category:
        members = 1
        interest_vector = {"nightlife": 1.0, "art": 0.8, "food": 0.7}
    elif "Family" in category:
        members = random.randint(3, 5)
        children = random.randint(1, 3)
        profiles.append("children")
        budget_sensitivity = 0.7
        energy_level = 0.8
        interest_vector = {"nature": 1.0, "food": 0.8, "shopping": 0.5}
    elif "Elderly" in category:
        profiles.append("elderly")
        energy_level = 0.5
        interest_vector = {"history": 1.0, "culture": 0.9, "religious": 0.8}
    elif "Accessibility" in category:
        profiles.append("accessibility")
        energy_level = 0.6
        interest_vector = {"history": 1.0, "nature": 0.8}
    
    if "Luxury" in category:
        budget_sensitivity = 0.1
        interest_vector = {"luxury": 1.0, "shopping": 0.9, "food": 0.9}
    elif "Budget" in category:
        budget_sensitivity = 0.9
        interest_vector = {"budget": 1.0, "history": 0.8, "nature": 0.7}
        
    if "Mixed" in category:
        # Conflicting interests
        interest_vector = {"history": 1.0, "shopping": 1.0, "nightlife": 1.0, "nature": 1.0}
    
    # 40% chance to force a must-visit, 10% chance for multiple conflicting MUST_VISITs
    r = random.random()
    if r < 0.1:
        must_visits = random.sample(AVAILABLE_POIS, min(3, len(AVAILABLE_POIS)))
    elif r < 0.4:
        must_visits = [random.choice(AVAILABLE_POIS)]
        
    # Introduce never visits
    never_visits = []
    if random.random() < 0.1:
        never_visits = [random.choice(AVAILABLE_POIS)]
        
    return {
        "members": members,
        "children": children,
        "budget_sensitivity": budget_sensitivity,
        "energy_level": energy_level,
        "profiles": profiles,
        "must_visit_locations": must_visits,
        "never_visit_locations": never_visits,
        "pace_preference": "moderate",
        "interest_vector": interest_vector
    }

def generate_base_itinerary(category: str, seed: int) -> Dict[str, Any]:
    random.seed(seed)
    
    num_days = 3
    if "Weekend" in category:
        num_days = 2
    elif "Long" in category:
        num_days = 7
    elif "Overloaded" in category:
        num_days = 1 # Cram everything in one day
        
    days = []
    for d in range(num_days):
        # Determine number of candidates
        num_candidates = random.randint(8, 12)
        if "Overloaded" in category:
            num_candidates = 20
        elif "Sparse" in category:
            num_candidates = 5
            
        selected_pois = random.sample(AVAILABLE_POIS, min(num_candidates, len(AVAILABLE_POIS)))
        
        poi_list = []
        for i, poi_id in enumerate(selected_pois):
            poi_list.append({
                "sequence": i + 1,
                "location_id": poi_id,
                "role": "CANDIDATE",
                "planned_visit_time_min": random.choice([45, 60, 90, 120])
            })
            
        days.append({
            "day_index": d,
            "start_location": "LOC_HOTEL",
            "end_location": "LOC_HOTEL",
            "date": f"2026-10-{d+1:02d}",
            "pois": poi_list
        })
        
    day_start_time = "09:00"
    day_end_time = "21:00"
    if "Overloaded" in category or random.random() < 0.2:
        day_start_time = "10:00"
        day_end_time = "18:00"
    
    return {
        "days": days,
        "assumptions": {
            "day_start_time": day_start_time,
            "day_end_time": day_end_time,
            "start_end_location": "LOC_HOTEL"
        }
    }

def generate_benchmark_suite(output_path: str, count: int = 30):
    scenarios = []
    
    for i in range(count):
        category = CATEGORIES[i % len(CATEGORIES)]
        seed = 42 + i
        scenario_id = f"SCENARIO_{i+1:03d}_{category.replace(' ', '_').upper()}"
        
        scenario = {
            "scenario_id": scenario_id,
            "category": category,
            "seed": seed,
            "family_preference": generate_family_preference(category, seed),
            "base_itinerary": generate_base_itinerary(category, seed),
            "dataset_version": "v1.0"
        }
        
        scenarios.append(scenario)
        
    with open(output_path, 'w') as f:
        json.dump(scenarios, f, indent=2)
    
    print(f"Generated {count} deterministic benchmark scenarios at {output_path}")

if __name__ == "__main__":
    out_file = os.path.join(os.path.dirname(__file__), "baseline_scenarios.json")
    # Generate 50 scenarios for better statistical variance
    generate_benchmark_suite(out_file, count=50)
