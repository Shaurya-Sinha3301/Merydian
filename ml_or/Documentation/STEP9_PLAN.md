# STEP 9: Multi-Family Optimization - Implementation Plan

## Current Status
- ✅ STEP 1-8A: Single-family optimization complete and working
- ✅ Objective scaling fixed (human-readable values)
- ✅ Order deviation penalties working
- ✅ Satisfaction vs coherence tradeoffs verified

## STEP 9A/9B: Multi-Family Extension

### Design Principles (DO NOT VIOLATE)
1. **ONE shared itinerary structure** - not independent optimizers per family
2. **SHARED components:**
   - POI set
   - Transport graph
   - Ordering variables y[i,j]
   - Flow constraints
   - Base itinerary order

3. **FAMILY-SPECIFIC components:**
   - Visit decisions: x[f,i]
   - Arrival/departure times: arr[f,i], dep[f,i]
   - Satisfaction scores
   - Transport cost/time accumulation

### Implementation Steps

#### 1. Extend Decision Variables
```python
# SHARED: Ordering variables y[i,j] (ONE set for all families)
y = {}
for i in all_nodes:
    for j in all_nodes:
        if i != j and j != START_NODE and i != END_NODE:
            y[(i, j)] = model.NewBoolVar(f'order_{i}_before_{j}')

# FAMILY-SPECIFIC: Visit decisions x[f,i]
x = {}
for fid in family_ids:
    for poi in candidate_pois:
        x[(fid, poi)] = model.NewBoolVar(f'visit_{fid}_{poi}')
        model.Add(x[(fid, poi)] == 1)  # Force all POIs for now

# FAMILY-SPECIFIC: Arrival and departure times
arr = {}
dep = {}
for fid in family_ids:
    for poi in candidate_pois:
        arr[(fid, poi)] = model.NewIntVar(day_start_min, day_end_min, f'arr_{fid}_{poi}')
        dep[(fid, poi)] = model.NewIntVar(day_start_min, day_end_min, f'dep_{fid}_{poi}')
```

#### 2. Shared Transport Network
```python
# SHARED: Transport variables z[i,j,m] (families use same transport network)
z = {}
transport_modes = {}

for i in all_nodes:
    for j in all_nodes:
        if i == j or j == START_NODE or i == END_NODE:
            continue
        
        key = (i, j)
        # ... create transport modes ...
        
        for edge in transport_modes[key]:
            z[(i, j, edge.mode, edge.edge_id)] = model.NewBoolVar(
                f'transport_{i}_{j}_{edge.mode}_{edge.edge_id}'
            )
```

#### 3. Family-Specific Time Chaining
```python
# Each family follows the shared order but with their own times
for fid in family_ids:
    for i in all_nodes:
        for j in all_nodes:
            if i == j or j == START_NODE or i == END_NODE:
                continue
            
            if (i, j) not in y:
                continue
            
            key = (i, j)
            if key in transport_modes:
                for edge in transport_modes[key]:
                    if edge.mode != "LOGICAL" and i in candidate_pois and j in candidate_pois:
                        model.Add(
                            arr[(fid, j)] >= dep[(fid, i)] + edge.duration_min
                        ).OnlyEnforceIf(z[(i, j, edge.mode, edge.edge_id)])
```

#### 4. Inter-Family Divergence Penalty (STEP 9B)
```python
# Penalize when families differ on visiting a POI
divergence_terms = []
if len(family_ids) >= 2:
    for i in range(len(family_ids)):
        for j in range(i + 1, len(family_ids)):
            fid1 = family_ids[i]
            fid2 = family_ids[j]
            for poi in candidate_pois:
                # |x[f1,i] - x[f2,i]| = difference in visit decisions
                diff = model.NewIntVar(0, 1, f'diff_{fid1}_{fid2}_{poi}')
                model.Add(diff >= x[(fid1, poi)] - x[(fid2, poi)])
                model.Add(diff >= x[(fid2, poi)] - x[(fid1, poi)])
                divergence_terms.append(100 * diff)  # Scale to match other penalties

total_divergence = sum(divergence_terms) if divergence_terms else 0
```

#### 5. Extended Objective Function
```python
# Calculate satisfaction for each family
satisfaction_terms = {}
for fid in family_ids:
    family = families[fid]
    total_sat = 0.0
    for poi in candidate_pois:
        sat_score = self.calculate_satisfaction(family, self.locations[poi])
        total_sat += sat_score
    satisfaction_terms[fid] = int(total_sat * 100)  # Scale to integer

total_satisfaction = sum(satisfaction_terms.values())

# Coherence loss = α·time + β·cost + γ·order_deviation + δ·divergence
alpha = 1
beta = 1
gamma = 1
delta = int(lambda_divergence * 100)  # Scale divergence weight

coherence_loss = (alpha * total_time + beta * total_cost + 
                  gamma * total_order_deviation + delta * total_divergence)

# Overall objective
lambda_coherence = 30  # 0.3 * 100
objective = total_satisfaction - lambda_coherence * coherence_loss

model.Maximize(objective)
```

### Success Criteria
1. ✅ Families mostly follow the same itinerary
2. ✅ Small preference differences cause local deviations
3. ✅ Families rejoin naturally when divergence cost grows
4. ✅ Solver does NOT create two unrelated itineraries
5. ✅ Objective values remain interpretable (O(10²–10³))

### Testing Plan
1. Test with 2 families with identical preferences → should produce identical schedules
2. Test with 2 families with slightly different preferences → should have minor deviations
3. Test with 2 families with very different preferences → should balance satisfaction vs divergence
4. Verify objective values are human-readable
5. Verify no subtours or disconnected paths

### Next Steps After STEP 9
- STEP 10: 3 families
- STEP 11: POI substitution using similarity + distance
- STEP 12: Multi-day (5D/6N)
- STEP 13: Hotels / restaurants
- STEP 14: Dynamic replanning

## Implementation Notes
- Add new method: `optimize_multi_family_single_day()`
- Add new extraction method: `_extract_multi_family_solution()`
- Update main() to test multi-family optimization
- Preserve all existing single-family functionality
- Use careful file editing to avoid corruption
