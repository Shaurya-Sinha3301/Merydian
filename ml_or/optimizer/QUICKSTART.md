# Quick Start Guide - Optimization Agent

## Installation & Setup

### Prerequisites
- Python 3.8+
- pip or conda

### Install Dependencies
```bash
pip install ortools pydantic
```

### Verify Installation
```bash
cd ml_or/optimizer
python optimizer.py sample_input.json
```

Expected output: JSON with 2 ranked plans

---

## Running the Optimizer

### Option 1: CLI (Recommended for Testing)
```bash
python ml_or/optimizer/optimizer.py <input_json_file>
```

**Example:**
```bash
python ml_or/optimizer/optimizer.py ml_or/optimizer/sample_input.json
```

**Output:** JSON to stdout

---

### Option 2: Python Module (For Backend Integration)
```python
from ml_or.optimizer import OptimizationAgent

# Initialize agent
agent = OptimizationAgent(verbose=True)

# Load your payload
import json
with open('payload.json', 'r') as f:
    payload = json.load(f)

# Run optimization
result = agent.optimize(payload)

# Handle result
if 'plans' in result:
    print("Feasible plans found:")
    for plan in result['plans']:
        print(f"  - {plan['plan_id']}: {plan['label']}, score={plan['meta_score']}")
else:
    print("No feasible plan exists")
```

---

## Input Payload Format

Create a JSON file matching this structure:

```json
{
  "optimization_id": "OPT_001",
  "users": ["U1", "U2", "U3"],
  "candidate_groupings": [
    [["U1", "U2", "U3"]],
    [["U1"], ["U2", "U3"]]
  ],
  "transport_options": [
    {
      "leg_id": "FLIGHT_A",
      "from": "NYC",
      "to": "LAX",
      "departure_time": "08:00",
      "arrival_time": "11:00",
      "duration_minutes": 180,
      "cost_per_person": 2000,
      "reliability_score": 0.95
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

### Field Explanations

| Field | Type | Description |
|-------|------|-------------|
| `optimization_id` | string | Unique request identifier |
| `users` | string[] | List of user IDs to include |
| `candidate_groupings` | string[][][] | Pre-enumerated groupings to evaluate |
| `transport_options` | object[] | Available transport choices |
| `leg_id` | string | Unique transport option ID |
| `from` | string | Origin location code |
| `to` | string | Destination location code |
| `departure_time` | string | Time in HH:MM format |
| `arrival_time` | string | Time in HH:MM format |
| `duration_minutes` | int | Total duration in minutes |
| `cost_per_person` | float | Cost per person in currency units |
| `reliability_score` | float | 0–1 reliability rating |
| `latest_arrival_time` | string | Latest allowed arrival (HH:MM) |
| `max_cost_per_person` | float | Maximum allowed cost |
| `time` | float | Weight for duration (0–1) |
| `cost` | float | Weight for cost (0–1) |
| `split_penalty` | float | Weight for group splits (0–1) |

---

## Output Formats

### Success: Ranked Plans
```json
{
  "plans": [
    {
      "plan_id": "PLAN_A",
      "label": "balanced",
      "grouping": [["U1", "U2", "U3"]],
      "chosen_legs": ["FLIGHT_A"],
      "arrival_time": "11:00",
      "total_cost_per_person": 2000,
      "meta_score": 0.52
    }
  ],
  "optimization_id": "OPT_001"
}
```

### Failure: No Feasible Solution
```json
{
  "status": "NO_FEASIBLE_PLAN",
  "optimization_id": "OPT_001"
}
```

### Validation Error
```json
{
  "error": "Invalid input payload: ...",
  "status": "VALIDATION_ERROR"
}
```

---

## Test Scenarios

### Test 1: Basic Optimization
```bash
python ml_or/optimizer/optimizer.py ml_or/optimizer/sample_input.json
```
**Expected:** 2 plans ranked by meta-score ✅

### Test 2: Complex Multi-Grouping
```bash
python ml_or/optimizer/optimizer.py ml_or/optimizer/sample_input_multi_grouping.json
```
**Expected:** 3 plans with varying split counts ✅

### Test 3: Infeasible Constraints
```bash
python ml_or/optimizer/optimizer.py ml_or/optimizer/sample_input_infeasible.json
```
**Expected:** `NO_FEASIBLE_PLAN` response ✅

---

## Common Issues & Solutions

### Issue: `ModuleNotFoundError: No module named 'ortools'`
**Solution:** Install ortools
```bash
pip install ortools --upgrade
```

### Issue: `Invalid time format 'HH:MM'`
**Solution:** Ensure times are in 24-hour HH:MM format (e.g., "14:30", not "2:30 PM")

### Issue: `NO_FEASIBLE_PLAN` when solutions should exist
**Solution:** Check constraints:
- Is `max_cost_per_person` >= any `cost_per_person`?
- Is `latest_arrival_time` >= all `arrival_time` values?

### Issue: Unexpected plan ranking
**Solution:** Review weights:
- Do weights reflect your priorities?
- Sum of weights doesn't need to equal 1 (auto-normalized)

---

## Understanding the Meta-Score

Lower score = better plan

```
meta_score = 
  w_time  * normalized_duration +
  w_cost  * normalized_cost +
  w_split * (number_of_subgroups - 1)
```

Example: All-together plan with moderate cost gets lowest score (no split penalty)

---

## Integration Checklist

- [ ] Install ortools
- [ ] Test with sample inputs
- [ ] Understand output format
- [ ] Create backend `/api/v1/optimize` endpoint
- [ ] POST payload from Policy Agent
- [ ] Return ranked plans to UI
- [ ] User selects a plan
- [ ] Execute chosen plan

---

## Documentation

- **README.md**: Complete architecture guide
- **BUILD_SUMMARY.md**: What was built & test results
- **ProjectContext.md**: Overall project vision
- `.github/copilot-instructions.md`: Agent instructions

---

## Support

For issues or questions:
1. Check inline docstrings in `.py` files
2. Review test payloads for examples
3. Read error messages (fail-fast validation)
4. Check README.md for design decisions

---

**Version:** 1.0  
**Status:** Production-Ready  
**Last Updated:** January 13, 2026
