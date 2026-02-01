# Optimizer Integration Guide

## Current Status: STUB MODE ⚠️

The `OptimizerAgent` in `agents/optimizer_agent.py` is currently a **stub** that copies static demo files. It **does not** process actual user constraints.

### What This Means

All optimizer runs produce **identical results** regardless of user input:
- ✅ User says "Add Akshardham" → Returns Akshardham scenario
- ❌ User says "Exclude Red Fort" → Returns Akshardham scenario (WRONG!)
- ❌ User says "Add Lotus Temple" → Returns Akshardham scenario (WRONG!)

The demo files being copied are from:
```
ml_or/tests/solved/3fam3daypref/
  ├── optimized_solution.json
  ├── decision_traces.json
  ├── enriched_diffs.json
  └── llm_payloads.json
```

These represent a single scenario: **FAM_B adds Akshardham on Day 2**.

---

## How to Integrate the Real Optimizer

Follow the pattern from `ml_or/tests/solved/3fam3daypref/run_preference_scenario.py`:

### Step 1: Import Required Modules

```python
from ml_or.itinerary_optimizer import ItineraryOptimizer
from ml_or.explainability.diff_engine import ItineraryDiffEngine
from ml_or.explainability.causal_tagger import CausalTagger
from ml_or.explainability.delta_engine import DeltaEngine
from ml_or.explainability.payload_builder import ExplanationPayloadBuilder
```

### Step 2: Initialize Optimizer

```python
def run(self, preferences=None, constraints=None, base_solution_path=None):
    # Load data files
    data_dir = self.ml_or_dir / "data"
    optimizer = ItineraryOptimizer(
        locations_file=str(data_dir / "locations.json"),
        transport_file=str(data_dir / "transport_graph.json"),
        base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
        family_prefs_file=str(data_dir / "family_preferences.json")  # Dynamic!
    )
```

### Step 3: Build Dynamic Family Preferences

Convert the `preferences` parameter (FeedbackEvent) into family_preferences format:

```python
# Load existing preferences
with open(data_dir / "family_preferences.json", 'r') as f:
    family_prefs = json.load(f)

# Update based on event
event_type = preferences.get("event_type")
family_id = preferences.get("family_id")
poi_id = preferences.get("poi_id")

if event_type == "MUST_VISIT_ADDED":
    if family_id not in family_prefs:
        family_prefs[family_id] = {"must_visit": [], "never_visit": []}
    family_prefs[family_id]["must_visit"].append(poi_id)

elif event_type == "NEVER_VISIT_ADDED":
    if family_id not in family_prefs:
        family_prefs[family_id] = {"must_visit": [], "never_visit": []}
    family_prefs[family_id]["never_visit"].append(poi_id)

# Save updated preferences to temp file
temp_prefs_path = run_dir / "family_preferences_updated.json"
with open(temp_prefs_path, 'w') as f:
    json.dump(family_prefs, f, indent=2)

# Reinitialize optimizer with updated preferences
optimizer = ItineraryOptimizer(
    locations_file=str(data_dir / "locations.json"),
    transport_file=str(data_dir / "transport_graph.json"),
    base_itinerary_file=str(data_dir / "base_itinerary_final.json"),
    family_prefs_file=str(temp_prefs_path)
)
```

### Step 4: Run Optimizer

```python
# Load baseline (if updating existing solution)
if base_solution_path and base_solution_path.exists():
    with open(base_solution_path, 'r') as f:
        baseline_solution = json.load(f)
else:
    baseline_solution = None

# Optimize
new_solution = optimizer.optimize_trip(
    family_ids=["FAM_A", "FAM_B", "FAM_C"],
    num_days=3,
    lambda_divergence=0.05
)
```

### Step 5: Run Explainability Pipeline

```python
# Compare solutions
diff_engine = ItineraryDiffEngine()
if baseline_solution:
    diffs = diff_engine.compare_optimized_solutions(
        baseline_optimized=baseline_solution,
        new_optimized=new_solution,
        days_to_compare=None
    )
else:
    # First run - compare to base itinerary
    diffs = diff_engine.compute_diff(base_itinerary, new_solution)

# Tag changes
tagger = CausalTagger()
decision_traces = optimizer.decision_traces
tagged_diffs = tagger.tag_changes(diffs, decision_traces)

# Calculate deltas
delta_engine = DeltaEngine()
enriched_diffs = delta_engine.compute_deltas(
    tagged_diffs,
    decision_traces,
    optimizer.locations,
    baseline_solution=baseline_solution,
    new_solution=new_solution
)

# Build LLM payloads
builder = ExplanationPayloadBuilder()
payloads = builder.build_payloads(
    enriched_diffs,
    optimizer.locations,
    audience="TRAVEL_AGENT"
)
```

### Step 6: Save All Outputs

```python
# Save optimized solution
with open(run_dir / "optimized_solution.json", 'w') as f:
    json.dump(new_solution, f, indent=2)

# Save decision traces
with open(run_dir / "decision_traces.json", 'w') as f:
    json.dump({str(k): v for k, v in decision_traces.items()}, f, indent=2)

# Save enriched diffs
with open(run_dir / "enriched_diffs.json", 'w') as f:
    output = {}
    for fid, day_map in enriched_diffs.items():
        output[fid] = {str(d): changes for d, changes in day_map.items()}
    json.dump(output, f, indent=2)

# Save LLM payloads
with open(run_dir / "llm_payloads.json", 'w') as f:
    json.dump(payloads, f, indent=2)

return {
    "optimized_solution": run_dir / "optimized_solution.json",
    "decision_traces": run_dir / "decision_traces.json",
    "enriched_diffs": run_dir / "enriched_diffs.json",
    "llm_payloads": run_dir / "llm_payloads.json"
}
```

---

## Critical Considerations

### POI ID Mapping
The FeedbackAgent extracts POI **names** ("Red Fort", "Akshardham"), but the optimizer needs POI **IDs** ("LOC_001", "LOC_006"). You need a mapping:

```python
# Load locations map
from ml_or.data_loader import load_locations_map
locations_map = load_locations_map(str(data_dir / "locations.json"))

# Find POI ID by name
poi_name = preferences.get("poi_name")
poi_id = None
for loc_id, loc_data in locations_map.items():
    if loc_data["name"].lower() == poi_name.lower():
        poi_id = loc_id
        break
```

### Baseline Management
- First run: Compare to base_itinerary
- Subsequent runs: Compare to previous optimized solution
- Store the "current" solution in a persistent location or database

### Performance
- Optimizer can be slow (~5-10 seconds per run)
- Consider caching or async execution for production

---

## Testing

After integration, verify:
1. "Add Akshardham" → Akshardham appears in FAM_B's day 2
2. "Exclude Red Fort" → Red Fort removed from FAM_A's itinerary
3. "Add Lotus Temple" → Lotus Temple added to requested family

Each run should produce **different** enriched_diffs and llm_payloads!
