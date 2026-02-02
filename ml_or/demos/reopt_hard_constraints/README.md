# Re-Optimization Demo - Hard Constraints Only

## Overview

This demo showcases **stateful re-optimization** with hard constraints (`must_visit` and `never_visit`). It demonstrates how the system handles sequential preference changes while preserving itinerary state across multiple optimization runs.

## Three-Phase Flow

### Phase 1: Baseline Itinerary
- **Input**: Family preferences with **zero constraints**
- **Families**:
  - `FAM_A`: High history/religious, low nightlife
  - `FAM_B`: High food/nightlife/shopping, low religious  
  - `FAM_C`: Balanced across all categories
- **Output**: `itinerary_v0.json`
- **Expectation**: Optimizer selects both Skeleton and Branch POIs based on interest vectors

### Phase 2: Must-Visit Re-Optimization
- **Simulated Input**: `FAM_A` says *"I definitely want to visit Akshardham"`*
- **Constraint**: `must_visit_locations: ["LOC_006"]`
- **Baseline**: `itinerary_v0.json`
- **Output**: `itinerary_v1_must_visit.json`
- **Explanations**: `output/phase2_output/explanations.md`

### Phase 3: Never-Visit Re-Optimization
- **Simulated Input**: `FAM_B` says *"I don't want to visit [Branch POI]"*
- **Dynamic Detection**: Script automatically identifies first Branch POI from `itinerary_v1`
- **Constraint**: `never_visit_locations: [detected_poi]`
- **Baseline**: `itinerary_v1_must_visit.json`
- **Output**: `itinerary_v2_never_visit.json`
- **Explanations**: `output/phase3_output/explanations.md`
- **Graceful Skip**: If no Branch POI exists, Phase 3 skips (customer can't exclude what's not there)

## Running the Demo

### From Project Root
```bash
cd c:\Amlan\Codes\Voyageur_Studio
python demo reopt_hard_constraints
```

### From Demo Directory
```bash
cd c:\Amlan\Codes\Voyageur_Studio\ml_or\demos\reopt_hard_constraints
python run_demo.py
```

## Output Structure

```
output/
├── itinerary_v0.json                    # Baseline
├── itinerary_v1_must_visit.json         # After must-visit
├── itinerary_v2_never_visit.json        # After never-visit
├── phase1_output/
│   ├── optimized_solution.json
│   ├── decision_traces.json
│   └── enriched_diffs.json
├── phase2_output/
│   ├── optimized_solution.json
│   ├── enriched_diffs.json
│   ├── llm_payloads.json
│   └── explanations.md                  # ⭐ Human-readable explanations
└── phase3_output/
    ├── optimized_solution.json
    ├── enriched_diffs.json
    ├── llm_payloads.json
    └── explanations.md                  # ⭐ Human-readable explanations
```

## Key Features

### Dynamic POI Detection
Phase 3 automatically detects Branch POIs from the current itinerary, mirroring real-world usage where customers can only exclude locations already in their plan.

### Stateful Re-Optimization
Each phase uses the previous itinerary as baseline:
```
Phase 1: baseline → v0
Phase 2: v0 → v1  
Phase 3: v1 → v2
```

### Explainability Integration
Each phase generates:
- **Technical artifacts**: `enriched_diffs.json`, `llm_payloads.json`
- **Human explanations**: `explanations.md` with natural language summaries

### Unique Interest Vectors
Baseline families have diverse preferences to ensure:
- Skeleton POIs are always included (group coordination)
- Branch POIs are selectively added based on interests
- Demonstrates personalization within group travel constraints

## Demo Validation

### Pre-Flight Checks
- Verify baseline preferences have empty constraints
- Confirm Akshardham (`LOC_006`) exists in locations
- Validate base itinerary structure

### Post-Run Checks
- `itinerary_v1` includes Akshardham
- `itinerary_v2` excludes detected Branch POI
- Enriched diffs show correct change types (`POI_ADDED`, `POI_REMOVED`)
- Causal tags present in payloads (`SHARED_ANCHOR_REQUIRED`, `INTEREST_VECTOR_DOMINANCE`, etc.)

## Technical Details

### Agent Integration
- **OptimizerAgent**: Runs CP-SAT optimization with constraint handling
- **ExplainabilityAgent**: Converts technical payloads to natural language
- **Preference Builder**: Applies events to family preferences
- **Diff Engine**: Compares baseline and new itineraries

### Constraint Enforcement
- **Must-Visit**: Hard constraint enforced by optimizer
- **Never-Visit**: Hard exclusion, POI removed if present
- **Skeleton POIs**: Never modified (group coordination required)
- **Branch POIs**: Personalization layer, can be added/removed

## Troubleshooting

### Phase 1 fails
- Check `ml_or/data/` has all required files (`locations.json`, `transport_graph.json`, `base_itinerary_final.json`)
- Verify OR-Tools is installed (`pip install ortools`)

### Phase 3 skips
- Expected behavior if no Branch POIs exist in `itinerary_v1`
- Check Phase 2 output to see if Akshardham was actually added

### No explanations generated
- Verify Groq API key is set in `.env`
- Check `llm_payloads.json` exists and is not empty
- Agent will use demo mode (templates) if API unavailable

## Design Decisions

All design decisions were approved by the user:
- ✅ Dynamic POI detection (no hardcoding)
- ✅ Separate explanation files per phase
- ✅ Graceful skip if POI not found
- ✅ Unique interest vectors for rich demo

## Related Files

- **Optimizer**: `agents/optimizer_agent.py`
- **Explainability**: `agents/explainability_agent.py`
- **Preference Builder**: `agents/preference_builder.py`
- **Implementation Plan**: Brain artifact `implementation_plan.md`
