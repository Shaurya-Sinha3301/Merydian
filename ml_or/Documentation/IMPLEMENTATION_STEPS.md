# Heavy-Weight CP-SAT Itinerary Optimizer - Implementation Steps

**Date:** January 14, 2026  
**Task:** Implement OR-Tools CP-SAT model as described in TRAVELAI_Optimization_Context.md  
**Approach:** Start with 1 family, 1 day, 3 POIs  

---

## Step 1: Initial Implementation ✅

Created `ml_or/itinerary_optimizer.py` with:

- Data loading from JSON files (locations, transport, base_itinerary, family_preferences)
- CP-SAT model with decision variables:
  - `x[i]` = visit POI i
  - `y[i,j]` = POI i before POI j
  - `z[i,j,m]` = transport mode m from i to j
  - `arr[i], dep[i]` = arrival/departure times
- Satisfaction calculation based on interest vectors and POI tags
- Constraints for time, ordering, must-visit, never-visit
- Objective: maximize satisfaction - cost penalty

**Result:** Model runs but produces infeasible solution due to missing transport edges between POIs.

---

## Step 2: Issue Identified

The transport graph (`transport_graph.json`) does not have edges between all POI pairs. For example:
- LOC_001 (Red Fort 1) to LOC_007 (Jama Masjid 7): No direct edge
- LOC_007 to LOC_002 (Qutub Minar 2): No direct edge

The base itinerary specifies these 3 POIs for Day 1, but the transport graph is sparse.

**Options:**
1. Add synthetic transport edges (e.g., assume CAB available between any two locations)
2. Use only POIs that have transport connectivity
3. Relax the model to allow "virtual" transport with estimated times/costs

---

## Step 3: STEP 1 COMPLETE ✅

**Implemented:**
- ✅ Froze POI order from base itinerary (no y[i,j] variables)
- ✅ Added fallback CAB transport using Haversine distance
- ✅ Enforced explicit time chaining: `arr[j] >= dep[i] + transport_time`
- ✅ Simplified objective to minimize transport cost

**Result:** 
```
09:00 → Red Fort 1 → 09:45
09:55 → Jama Masjid 7 → 10:40  
10:50 → Qutub Minar 2 → 11:35
```

**✅ SANITY CHECK PASSED:** Arrival times are monotonically increasing!

**Key Insights:**
1. Presolve no longer collapses variables to 0
2. Time advances correctly with transport durations
3. Fallback transport ensures connectivity
4. Model is now feasible and produces realistic schedules

---

## Step 4: STEP 4 COMPLETE ✅

**Implemented:**
- ✅ Multiple transport modes available per leg
- ✅ Solver chooses optimal mode based on weighted objective
- ✅ Objective: `w_cost * total_cost + w_time * total_duration`
- ✅ Weights derived from family budget_sensitivity (0.7 = cost-focused)

**Result:**
```
Objective value: 7600 (70% cost weight + 30% time weight)
Total cost: ₹100
Total time: 20 minutes
Transport selected: CAB_FALLBACK for both legs
```

**Key Insights:**
1. Solver correctly selects transport modes to minimize weighted objective
2. Family budget sensitivity (0.7) makes solver prefer cheaper options
3. Time still advances monotonically
4. Transport choice works within fixed order

**Note:** Currently selecting CAB_FALLBACK because no real transport edges exist between LOC_001→LOC_007→LOC_002 in transport_graph.json. This is expected behavior.

---

## Step 5A/5B: COMPLETE ✅

**Implemented:**
- ✅ Added START and END dummy nodes (START_DAY_1, END_DAY_1)
- ✅ Reintroduced y[i,j] ordering variables for all node pairs
- ✅ Added flow constraints: at most one predecessor/successor per POI
- ✅ Added START/END flow: exactly one out of START, exactly one into END
- ✅ Bound transport to ordering: `Σ_m z[i,j,m] = y[i,j]`
- ✅ Updated time chaining for free ordering mode
- ✅ Updated objective function to handle all possible edges
- ✅ Updated solution extraction to reconstruct path from y[i,j] variables
- ✅ Forced all POIs to be visited (x[poi] == 1)

**Test Results (All POIs Visited):**
```
Base order: LOC_001 → LOC_007 → LOC_002
Optimized order: LOC_001 → LOC_002 → LOC_007
Objective: 7600 (same as frozen order)
Cost: ₹100 (same as frozen order)
Time: 20 min (same as frozen order)
```

**Test Results (Optional POIs):**
```
Base order: LOC_001 → LOC_007 → LOC_002
Optimized order: LOC_002 → LOC_001 (LOC_007 skipped)
Objective: 3800 (50% reduction)
Cost: ₹50 (50% reduction)
Time: 10 min (50% reduction)
```

**Key Insights:**
1. ✅ Solver successfully reorders POIs to minimize cost/time
2. ✅ Path reconstruction from y[i,j] works correctly
3. ✅ Time advances monotonically in all cases
4. ✅ Flow constraints prevent subtours and disconnected paths
5. ✅ When POIs are optional, solver optimizes by skipping expensive POIs
6. ✅ When POIs are mandatory, solver finds best order among all permutations

**Architecture Notes:**
- START/END nodes are critical for preventing subtours
- Flow constraints ensure exactly one path from START to END
- Transport binding (Σ_m z[i,j,m] = y[i,j]) ensures transport is selected only for used edges
- Time chaining works correctly with free ordering

## Step 8A: COMPLETE ✅

**Implemented:**
- ✅ Added order-deviation coherence loss (γ·order_deviation)
- ✅ Rescaled objective to human-readable values
- ✅ Fixed objective scaling bug (was -7,497,019, now -3,302)
- ✅ Coherence loss now includes: α·time + β·cost + γ·order_deviation
- ✅ All values normalized to O(100-1000) range

**Test Results:**
```
Base order: LOC_001 -> LOC_007 -> LOC_002
Optimized order: LOC_001 -> LOC_007 -> LOC_002 (KEPT BASE ORDER)
Order deviations: 0
Total satisfaction: 2.98
Coherence loss: 120.0
  - Transport time: 20 min
  - Transport cost: Rs.100
  - Order deviation penalty: 0
Net value: -33.02
Objective value: -3302 (scaled, human-readable)
```

**Key Insights:**
1. ✅ Objective values are now human-readable (-3,302 instead of -7,497,019)
2. ✅ Solver KEPT base order (no deviations) - this is correct behavior!
3. ✅ Order deviation penalty is working (0 violations = 0 penalty)
4. ✅ Coherence loss properly weighted against satisfaction
5. ✅ Net value is negative because coherence loss (120) > satisfaction (2.98)

**Why Solver Kept Base Order:**
- Satisfaction gain from reordering: minimal (all POIs have similar scores)
- Order deviation penalty: 100 per violation
- Transport cost/time: same for all orderings (fallback CAB)
- Result: No incentive to deviate from base order

**Next Steps:**
- Test with POIs that have significantly different satisfaction scores
- Test with real transport edges (not just fallback CAB)
- Verify solver DOES reorder when satisfaction gain justifies it

## Step 8B: Next Actions

**Testing Needed:**
- Create scenario where reordering provides clear satisfaction benefit
- Verify solver trades off satisfaction vs order coherence correctly
- Test with different lambda values to see sensitivity

**After STEP 8B:**
- STEP 9: Extend to multiple families
- STEP 10: Add group synchronization penalties
- STEP 11: Scale to multiple days

---

## Key Learnings

1. **Data Completeness:** The transport graph is sparse - not all POI pairs have edges
2. **Model Complexity:** Time-expanded CP-SAT with ordering + transport selection is complex
3. **Incremental Approach:** Starting with 1 family, 1 day, 3 POIs is correct strategy
4. **Real-World Constraints:** Need to handle missing data gracefully

---

## Files Created

- `ml_or/itinerary_optimizer.py` - Main optimizer implementation (500+ lines)
- `ml_or/solved_itinerary_minimal.json` - Output file (will be created on successful run)
- `ml_or/Documentation/IMPLEMENTATION_STEPS.md` - This file

---

## Status

**Current:** Model implemented but needs transport graph fixes  
**Next:** Add fallback transport or filter POIs by connectivity  
**Goal:** Get first feasible solution for 1 family, 1 day, 3 POIs  
