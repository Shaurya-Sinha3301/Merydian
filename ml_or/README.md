# `ml_or` — Mathematical Optimization & Explainability Engine

The core optimization package for Voyageur Studio. Implements a CP-SAT based joint itinerary optimizer with a full explainability pipeline.

---

## Package Structure

```
ml_or/
├── itinerary_optimizer.py      # Main CP-SAT optimizer (POI + transport joint optimization)
├── hotel_optimizer.py          # CP-SAT backbone optimizer (hotel selection + skeleton routing)
├── explainability/
│   ├── diff_engine.py          # Computes factual diffs between baseline and new solutions
│   ├── causal_tagger.py        # Assigns causal tags to each change (deterministic, no AI)
│   ├── delta_engine.py         # Computes cost & satisfaction deltas per change
│   └── payload_builder.py      # Builds audience-specific JSON payloads for the LLM layer
├── data/
│   ├── locations.json                      # All POIs (SKELETON + BRANCH roles)
│   ├── hotels.json                         # Hotel inventory
│   ├── transport_graph.json                # Directed transport edges (BUS/AUTO/CAB/METRO)
│   ├── base_itinerary_clustered.json       # Daily planning scope (skeleton POIs per day)
│   ├── family_preferences_3fam_strict.json # Family interest vectors, constraints, budgets
│   ├── optimized_backbone.json             # Pre-computed hotel assignments + skeleton routes
│   └── initial_optimized_solution.json     # Baseline solution used for diff comparison
└── Documentation/                          # Extended technical documentation
```

---

## Two-Stage Optimization Pipeline

### Stage 1 — Backbone Optimizer (`hotel_optimizer.py`)

Runs **once** at trip planning time. Produces `optimized_backbone.json`.

**Solves jointly:**
1. **Hotel Selection** — Picks the best hotel per family per day based on budget sensitivity and proximity to skeleton POIs.
2. **Skeleton Route Ordering** — Orders the mandatory shared POIs (role: `SKELETON`) for each day using a TSP-style CP-SAT model, with the selected hotel as the start/end anchor.

**Output — `optimized_backbone.json`:**
```json
{
  "hotel_assignments": { "FAM_A": [{ "day": 1, "hotel_id": "...", "cost": 5000 }] },
  "skeleton_routes":   { "1": { "FAM_A": ["HOTEL", "LOC_001", "LOC_007", "HOTEL"] } },
  "daily_restaurants": { "1": { "FAM_A": "LOC_046_DINNER" } }
}
```

---

### Stage 2 — Itinerary Optimizer (`itinerary_optimizer.py`)

Runs on every re-optimization event (preference change, transport disruption, etc.). Uses the backbone as a fixed constraint and fills in optional `BRANCH` POIs around the skeleton.

#### Decision Variables (CP-SAT)

| Variable | Domain | Meaning |
|---|---|---|
| `x[f,d,i]` | `{0,1}` | Family `f` visits POI `i` on day `d` |
| `y[f,d,i,j]` | `{0,1}` | POI `i` visited before POI `j` |
| `z[f,d,i,j,m]` | `{0,1}` | Transport mode `m` used from `i` to `j` |
| `arr[f,d,i]`, `dep[f,d,i]` | `ℤ (minutes)` | Arrival/departure times |

#### Objective Function

```
maximize Σ_f [ Satisfaction(f) − λ · CoherenceLoss(f) ]
```

- **Satisfaction(f, i)** = `base_importance × Σ_tag(interest_vector[tag] × poi_tag[tag])`
- **CoherenceLoss** = `α·extra_time + β·extra_cost + γ·missed_shared_POIs + δ·desync`
- Default weights: `α=1, β=0.05, γ=100, δ=0.5, λ=0.3`

#### Key Constraints

- `dep[i] = arr[i] + visit_time[i]`
- `arr[j] ≥ dep[i] + transport_time(i,j,m) − M·(1 − z[i,j,m])`
- Exactly one transport mode selected per leg
- Anchor/skeleton POIs fixed in position
- `must_visit` POIs enforced; `never_visit` POIs excluded
- Day window: `[540, 1320]` minutes (09:00–22:00)

#### Transport Disruption Support

The optimizer loads `transport_graph.json` and **filters out edges where `available: false`**. When a disruption is active (e.g., METRO strike), the `transport_METRO_disrupted.json` file is generated with all METRO edges marked `available: false`, and passed to the optimizer instead of the original graph. The optimizer then naturally avoids METRO and selects the next-best mode.

```python
# In _load_transport():
available_edges = [e for e in all_edges if e.get('available', True)]
```

#### Partial Optimization (Mid-Trip Re-optimization)

When `start_day_index > 0`, the optimizer:
1. **Loads history** — Extracts visited POIs from days `0..start_day-1` of the previous solution to prevent revisits.
2. **Optimizes future** — Runs CP-SAT only for days `start_day..N`.
3. **Stitches** — Prepends the immutable past days verbatim to the new solution.

This ensures past days are never altered (can't change what already happened), while future days are re-optimized with the new constraints.

#### Transport Modes

| Mode | Description |
|---|---|
| `METRO` | Delhi Metro — fast, cheap, high reliability (0.95) |
| `BUS` | City bus — moderate speed, low cost (reliability 0.75) |
| `AUTO` | Auto-rickshaw — flexible, moderate cost (reliability 0.9) |
| `CAB` | Cab/taxi — door-to-door, higher cost (reliability 1.0) |
| `CAB_FALLBACK` | Synthetic fallback — generated when no graph edge exists between a POI pair |

---

## Explainability Pipeline (`explainability/`)

Runs after every optimization. Produces `enriched_diffs.json` and `llm_payloads.json` for the LLM explanation layer.

### Pipeline Steps

```
baseline_solution + new_solution
         │
         ▼
  ┌─────────────────┐
  │  DiffEngine     │  → POI_ADDED / POI_REMOVED / ROUTE_CHANGED per family per day
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  CausalTagger   │  → Assigns causal_tags[] to each change (deterministic rules)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  DeltaEngine    │  → Adds satisfaction_delta and cost_delta (incl. transport)
  └────────┬────────┘
           │
           ▼
  ┌──────────────────────┐
  │  PayloadBuilder      │  → Builds FAMILY + TRAVEL_AGENT JSON payloads for LLM
  └──────────────────────┘
```

### Diff Types

| Type | Meaning |
|---|---|
| `POI_ADDED` | A new POI appears in the new solution that wasn't in the baseline |
| `POI_REMOVED` | A POI from the baseline is absent in the new solution |
| `ROUTE_CHANGED` | Same POI pair, different transport mode |

### Causal Tags

| Tag | Trigger |
|---|---|
| `INTEREST_VECTOR_DOMINANCE` | POI added; interest score > 1.2 |
| `SHARED_ANCHOR_REQUIRED` | POI added; it's a SKELETON anchor role |
| `OPTIMIZER_SELECTED` | POI added; moderate interest (0.8–1.2) |
| `OPTIMIZER_TRADEOFF` | POI added despite low interest (routing/time benefit) |
| `LOW_INTEREST_DROPPED` | POI removed; interest score < 0.8 |
| `OBJECTIVE_DOMINATED` | POI removed; cost/time/coherence outweighed its value |
| `METRO_UNAVAILABLE` | Route changed due to METRO disruption |
| `ROUTE_REROUTED` | Successfully found alternative transport mode |
| `REROUTED_TO_BUS` / `REROUTED_TO_CAB_FALLBACK` | Specific reroute destination |

### Output Files (per run)

| File | Contents |
|---|---|
| `optimized_solution.json` | Full 3-day itinerary with POI order, transport modes, arrival/departure times |
| `optimized_backbone.json` | Hotel assignments + skeleton route used for this run |
| `decision_traces.json` | Per-day optimizer decision logs (candidates, constraints, outcomes) |
| `enriched_diffs.json` | POI changes with causal tags + cost/satisfaction deltas |
| `llm_payloads.json` | Audience-specific payloads (FAMILY + TRAVEL_AGENT) for LLM |
| `transport_METRO_disrupted.json` | Modified transport graph (only present when disruption active) |

---

## Data Files

### `locations.json`
Each entry is a POI or restaurant:
```json
{
  "location_id": "LOC_001",
  "name": "Red Fort",
  "type": "MONUMENT",
  "category": "Heritage",
  "lat": 28.6562, "lng": 77.2410,
  "avg_visit_time_min": 90,
  "cost": 50,
  "tags": ["history", "architecture", "culture"],
  "base_importance": 1.2,
  "role": "SKELETON"
}
```
- **`role: SKELETON`** — Shared anchor POI; position is fixed by the backbone optimizer.
- **`role: BRANCH`** — Optional per-family POI; selected by the itinerary optimizer.

### `transport_graph.json`
Directed edges between POI pairs:
```json
{
  "edge_id": "EDGE_M_2715",
  "from": "LOC_013",
  "to": "LOC_003",
  "mode": "METRO",
  "duration_min": 22,
  "cost": 18,
  "reliability": 0.95,
  "available": true
}
```
Set `"available": false` to simulate transport disruptions.

### `family_preferences_3fam_strict.json`
```json
{
  "family_id": "FAM_A",
  "members": 4,
  "budget_sensitivity": 0.8,
  "energy_level": 0.7,
  "interest_vector": { "history": 1.5, "nature": 0.5, "food": 1.0 },
  "must_visit_locations": [],
  "never_visit_locations": []
}
```

---

## Usage

```python
from ml_or.hotel_optimizer import HotelSkeletonOptimizer
from ml_or.itinerary_optimizer import ItineraryOptimizer

# Stage 1: Generate backbone (run once)
backbone_opt = HotelSkeletonOptimizer()
backbone_opt.optimize_and_save("ml_or/data/optimized_backbone.json")

# Stage 2: Full trip optimization
optimizer = ItineraryOptimizer(
    transport_file="ml_or/data/transport_graph.json",  # or disrupted variant
    family_prefs_file="ml_or/data/family_preferences_3fam_strict.json",
    optimized_backbone_file="ml_or/data/optimized_backbone.json"
)

solution = optimizer.optimize_trip(
    family_ids=["FAM_A", "FAM_B", "FAM_C"],
    num_days=3,
    lambda_divergence=0.05,
    start_day_index=0  # >0 for mid-trip partial re-optimization
)
```

In practice, both stages are orchestrated by `agents/optimizer_agent.py` via `agents/agent_controller.py`.

---

## Extended Documentation

See `ml_or/Documentation/` for deep-dives:

| File | Contents |
|---|---|
| `MATHEMATICAL_MODEL_SPECIFICATION.md` | Full CP-SAT formulation with equations |
| `OPTIMIZER_ARCHITECTURE_AND_FEATURES.md` | Architecture decisions, STEP-by-STEP feature flags |
| `AGENTIC_WORKFLOW_COMPLETE_GUIDE.md` | How agents orchestrate the optimizer |
| `BACKEND_INTEGRATION_GUIDE.md` | API integration patterns |
| `VOYAGEUR_ARCHITECTURE_DEEP_DIVE.md` | System-wide architecture overview |
