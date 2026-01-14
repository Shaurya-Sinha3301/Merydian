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

## Step 4: Next Actions (STEP 4 from ChatGPT)

**Reintroduce Transport Choice:**
- Keep order fixed (for now)
- Allow solver to choose between multiple transport modes
- Objective: minimize cost OR maximize reliability OR balance both
- Verify transport selection works correctly

**After STEP 4:**
- STEP 5: Reintroduce ordering freedom (y[i,j] variables)
- STEP 6: Add coherence loss calculations
- STEP 7: Extend to multiple families
- STEP 8: Scale to multiple days

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
