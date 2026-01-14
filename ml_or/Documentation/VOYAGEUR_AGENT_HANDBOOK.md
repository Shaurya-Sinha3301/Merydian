# 📘 Voyageur Agent Handbook

**Version**: 1.0 (Production Ready)
**Target Audience**: AI Agents, Backend Systems
**Purpose**: Guide for dynamically executing the Voyageur Itinerary Optimizer.

---

## 1. System Overview
Voyageur is a **Multi-Family, Multi-Day Itinerary Optimization Engine**.
It solves the "Social Group Travel Problem":
- **Constraint 1 (Synchronization)**: Families must travel together for key "Skeleton" events (Shared Bus).
- **Constraint 2 (Divergence)**: Families may split up for "Branch" events if their preferences strictly disagree.
- **Constraint 3 (Time/Cost)**: All scheduling respects physical travel time, hotel anchors, and strict meal windows.

---

## 2. The Agent Workflow
When an AI Agent needs to generate a trip, it should follow this pipeline:

1.  **NLP Parsing**: Extract User Intent (e.g., "3 days in Delhi, 3 families, strict budget").
2.  **JSON Generation**: Construct [family_preferences.json](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/data/family_preferences.json) and [base_itinerary.json](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/data/base_itinerary.json).
3.  **Execution**: Call `ItineraryOptimizer.optimize_trip()`.
4.  **Response**: Parse the output JSON to generate a natural language summary.

---

## 3. Data Inputs (JSON Schemas)

### A. Family Preferences ([family_preferences.json](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/data/family_preferences.json))
Define the personalities of the groups.
```json
[
  {
    "family_id": "FAM_A",
    "members": 4,
    "budget_sensitivity": 0.8,  // 1.0 = Very Cheap, 0.0 = Luxury
    "pace_preference": "moderate", // "fast", "moderate", "relaxed"
    "interest_vector": {
      "history": 0.9,
      "nightlife": 0.1
    },
    "must_visit_locations": ["LOC_001"], // Optional overrides
    "never_visit_locations": ["LOC_011"]
  }
]
```

### B. Base Itinerary ([base_itinerary.json](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/data/base_itinerary.json))
Define the "Skeleton" of the trip.
- **`role="SKELETON"`**: Everyone must *try* to attend (unless banned). Synchronization enforced.
- **`role="BRANCH"`**: Optional detour. Families only go if interested/rich.
- **`time_window_start/end`**: Hard constraints (e.g., Lunch).

```json
{
  "assumptions": {
    "day_start_time": "09:00",
    "day_end_time": "22:00", // Needs to be late enough for Dinner
    "start_end_location": "LOC_HOTEL"
  },
  "days": [
    {
      "day": 1,
      "pois": [
        {
          "location_id": "LOC_001",
          "role": "SKELETON", // Shared Event
          "planned_visit_time_min": 60
        },
        {
          "location_id": "LOC_LUNCH",
          "role": "SKELETON",
          "time_window_start": "12:30", // Strict Earliest Start
          "time_window_end": "14:00"    // Strict Latest End
        }
      ]
    }
  ]
}
```

---

## 4. Python API Usage

To run the optimizer dynamically:

```python
from ml_or.itinerary_optimizer import ItineraryOptimizer

def run_agent_job():
    # 1. Initialize
    opt = ItineraryOptimizer(
        base_itinerary_file='dynamic_itinerary.json',
        family_preferences_file='dynamic_prefs.json',
        locations_file='ml_or/data/locations.json'
    )

    # 2. Tune Coherence (The "Herding Cats" Factor)
    # 2.0 = Strict Group (Try to keep everyone together)
    # 0.5 = Loose Group (Allow frequent splitting)
    opt.lambda_coherence = 0.5 

    # 3. Execute
    result = opt.optimize_trip(
        family_ids=['FAM_A', 'FAM_B'], 
        num_days=3
    )
    
    return result # Returns Dictionary or None
```

---

## 5. Interpreting the Output
The output JSON structure is hierarchical:

```json
{
  "trip_id": "...",
  "total_trip_cost": 1250.50,
  "days": [
    {
      "day_idx": 1,
      "families": {
        "FAM_A": {
          "pois": [
            { "location_id": "LOC_HOTEL", "departure_time": "09:00" },
            { "location_id": "LOC_001", "arrival_time": "09:15", "role": "SKELETON" }
          ],
          "transport": [
             { "from": "LOC_HOTEL", "to": "LOC_001", "mode": "CAB", "cost": 50 }
          ]
        }
      }
    }
  ]
}
```
**Key Fields for Agents**:
- **`families[fid]['pois']`**: The timeline. Use this to describe "Who goes where."
- **`arrival_time` / `departure_time`**: Exact timestamps.
- **`role`**: Tells you if it was a Shared event or a Branch detour.

---

## 6. Critical Constraints & Tips
1.  **Hotel Anchors**: Always define `start_location` and `end_location` as `LOC_HOTEL` (or similar) in the JSON to enable commute calculation.
2.  **Dinner Logic**: If adding Dinner (e.g., 19:30-21:00), ensure `day_end_time` is >= 22:00 to allow return travel.
3.  **Infeasibility**: If the solver returns `None`, the time windows are likely too tight or the budget too low. Relax constraints and retry.
