# 🔄 Voyageur Engine: Data Flow Report

**Target**: `ml_or/itinerary_optimizer.py`
**Purpose**: Explain how input JSON files trigger specific logic in the solver.

---

## 1. The Inputs (Supply Side)

### A. `locations.json` (The "World")
*Static database of places.*
- **Role in Solver**: Defines the "Nodes" in the graph.
- **Key Fields**:
    - `avg_visit_time_min` → Used in constraint: `dep[i] == arr[i] + visit_time`.
    - `tags` (e.g., "history") → Used in Objective: `Satisfaction = Importance * (1 + InterestMatch)`.
    - `cost` → Tracks spending against budget.
    - `role` ("SKELETON" vs "BRANCH") → Determines if Sync logic applies.

### B. `transport_graph.json` (The "Roads")
*Static connectivity graph.*
- **Role in Solver**: Defines the "Edges" and their weights.
- **Key Fields**:
    - `duration_min` → Used in constraint: `arr[j] >= dep[i] + duration`.
    - `cost` → Used in Objective: `CoherenceLoss += cost * beta`.
    - `mode` ("CAB", "METRO") → Informational for the final itinerary.
- **Fallback**: If no edge exists, the optimizer generates a "FALLBACK_CAB" edge based on Haversine distance.

---

## 2. The Inputs (Demand Side)

### C. `base_itinerary_final.json` (The "Plan")
*The architectural blueprint of the trip.*
- **Role in Solver**: Sets the scope (Days, Candidates, Anchors).
- **Key Fields**:
    - `start/end_location` (e.g., "LOC_HOTEL") → Sets `arr[START]`, `dep[END]`.
    - `pois` List → The subset of `functions.json` to consider for *this* day.
    - `time_window_start/end` → **Hard Constraint**: `arr[poi] >= start`, `dep[poi] <= end`.

### D. `family_preferences_3fam_strict.json` (The "Users")
*The personalities traveling.*
- **Role in Solver**: The optimization weights.
- **Key Fields**:
    - `interest_vector` → Multiplier for Satisfaction score.
    - `budget_sensitivity` → Affects how much `cost` penalizes the objective.
    - `must_visit_locations` → **Hard Constraint**: `x[poi] == 1`.
    - `never_visit_locations` → **Hard Constraint**: `x[poi] == 0`.

---

## 3. The Output

### E. `final_optimized_trip.json`
*The solved state.*
- Contains the optimal values for:
    - **Who** visited **What** (`x` variable).
    - **When** (`arr`, `dep` variables).
    - **How** (`transport` modes selected).
    - **Why** (Satisfaction scores provided).
