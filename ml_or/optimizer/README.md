# Optimization Agent Implementation

## Overview

This is the **Optimization Agent** for Voyageur Studio's agentic group travel planning system. It is a **stateless, policy-driven, deterministic optimizer** that:

1. Accepts validated JSON payloads from the backend
2. Solves transport selection for each candidate grouping using OR-Tools CP-SAT
3. Meta-scores and ranks feasible plans
4. Returns 2–3 ranked optimization plans

## Architecture

### File Structure

```
optimizer/
├── optimizer.py         # Main CLI entry point and orchestration
├── schemas.py           # Pydantic input/output validation models
├── model.py             # OR-Tools CP-SAT solver implementation
├── scorer.py            # Meta-scoring and plan ranking logic
├── utils.py             # Helper functions (time parsing, normalization)
├── sample_input.json    # Example test payload
└── __init__.py          # Module initialization
```

### Design Philosophy

- **Stateless**: No caching, no session management. Same input → same output every time.
- **Policy-Driven**: Subgroupings are pre-enumerated by the Policy Agent. The optimizer evaluates each independently.
- **Replaceable**: Backend treats optimizer as a black box. Can swap implementations without modification.
- **Deterministic**: OR-Tools CP-SAT is deterministic; no randomization.

## Workflow

### Step 1: Input Validation
- Payload must match `OptimizationRequest` schema
- Fail fast on schema violations
- Validate time formats (HH:MM), constraints, weights

### Step 2: Per-Grouping Optimization
For each candidate grouping:
- Build OR-Tools CP-SAT model
- Decision variable: choose one transport option
- Constraints:
  - Cost ≤ `max_cost_per_person`
  - Arrival time ≤ `latest_arrival_time`
- Objective: minimize weighted(duration + cost)
- Extract solution if feasible

### Step 3: Meta-Scoring
For all feasible plans:
```
meta_score = 
  w_time  * normalized_duration +
  w_cost  * normalized_cost +
  w_split * (number_of_subgroups - 1)
```
- Lower scores are better
- Splits always penalized

### Step 4: Ranking & Labeling
- Sort by meta-score (ascending)
- Select top 2–3 plans
- Assign labels: "fastest", "cheapest", "balanced"

### Step 5: Response
Return `OptimizationResponse` with ranked plans or `NoFeasiblePlanResponse` if no solution exists.

## Input Contract

```json
{
  "optimization_id": "OPT_001",
  "users": ["U1","U2","U3","U4","U5"],
  "candidate_groupings": [
    [["U1","U2","U3","U4","U5"]],
    [["U1","U2","U3"],["U4","U5"]]
  ],
  "transport_options": [
    {
      "leg_id": "FL_203",
      "from": "DEL",
      "to": "BLR",
      "departure_time": "10:00",
      "arrival_time": "12:30",
      "duration_minutes": 150,
      "cost_per_person": 4500,
      "reliability_score": 0.92
    }
  ],
  "constraints": {
    "latest_arrival_time": "22:00",
    "max_cost_per_person": 5000
  },
  "weights": {
    "time": 0.4,
    "cost": 0.4,
    "split_penalty": 0.2
  }
}
```

## Output Contract (Success)

```json
{
  "plans": [
    {
      "plan_id": "PLAN_A",
      "label": "balanced",
      "grouping": [["U1","U2","U3","U4","U5"]],
      "chosen_legs": ["FL_203"],
      "arrival_time": "12:30",
      "total_cost_per_person": 4500,
      "meta_score": 0.81
    }
  ],
  "optimization_id": "OPT_001"
}
```

## Output Contract (No Feasible Solution)

```json
{
  "status": "NO_FEASIBLE_PLAN",
  "optimization_id": "OPT_001"
}
```

## Usage

### As a CLI Tool

```bash
python optimizer.py sample_input.json
```

This reads `sample_input.json`, runs the optimizer, and prints JSON output to stdout.

### As a Python Module

```python
from ml_or.optimizer import OptimizationAgent

agent = OptimizationAgent(verbose=True)
payload = {...}  # Your input payload
result = agent.optimize(payload)
print(result)
```

## Running Tests

### Test with Sample Input

```bash
cd ml_or/optimizer
python optimizer.py sample_input.json
```

### Test Edge Cases

The optimizer handles:
- ✅ No feasible plans (all constraints violated)
- ✅ Split vs. non-split preference (splits penalized)
- ✅ Tie-breaking (fewer subgroups, earlier arrival)
- ✅ Input validation (fail fast on schema errors)
- ✅ Empty groupings or transport options

## Dependencies

- **ortools** (9.14+): Google OR-Tools for CP-SAT
- **pydantic** (2.0+): Input/output validation
- **python** (3.8+): Standard library only otherwise

Install via:
```bash
pip install ortools pydantic
```

## Integration with Backend

Future integration endpoint:

```
POST /api/v1/optimize

Request: OptimizationRequest (JSON)
Response: OptimizationResponse | NoFeasiblePlanResponse (JSON)
```

The backend will:
1. POST optimization payload to this optimizer
2. Receive ranked plans
3. Present options to user
4. User selects a plan
5. Backend executes the plan

The optimizer does **not** handle approval, database access, or policy decisions.

## Edge Cases & Robustness

### Case 1: No Feasible Solution
If all candidate groupings/transport options violate constraints:
```json
{"status": "NO_FEASIBLE_PLAN", "optimization_id": "..."}
```

### Case 2: Split vs. Non-Split
If all-together is not feasible but splitting is:
- Optimizer will prefer splitting if it's the only solution
- Split penalty ensures non-split plans rank higher when both are feasible

### Case 3: Equal Meta-Scores
Tie-breaking logic (in order):
1. Prefer fewer subgroups
2. Prefer earlier arrival time

### Case 4: Invalid Input
On schema validation failure:
```json
{"error": "Invalid input payload: ...", "status": "VALIDATION_ERROR"}
```

## Testing Strategy

1. **Unit tests** for `utils.py` (time parsing, normalization)
2. **Integration tests** for `model.py` (OR-Tools solver)
3. **End-to-end tests** via `sample_input.json`
4. **Edge cases**:
   - All constraints violated
   - Multiple grouping scenarios
   - Weighted preferences
   - Split penalties

## Key Principles

1. **Stateless**: No caching, no external state
2. **Policy-driven**: Only optimizes; doesn't decide policy
3. **Replaceable**: Black box to backend
4. **Deterministic**: Same input → same output
5. **Fail-fast**: Validate early, report errors clearly

## Non-Goals

❌ Ant Colony Optimization  
❌ Learning models  
❌ Satisfaction prediction  
❌ Database access  
❌ API servers  
❌ UI formatting  
❌ Logging dashboards  

## Future Enhancements

- Multi-leg journeys (current: single leg)
- User satisfaction history integration
- Reliability scoring incorporation
- WebSocket real-time optimization updates
- Distributed optimization for large groups

## References

- [OR-Tools Documentation](https://developers.google.com/optimization/install/python)
- [CP-SAT Solver Guide](https://developers.google.com/optimization/cp/cp_solver)
- Project Context: `ProjectContext.md`
- Agent Instructions: `.github/copilot-instructions.md`
