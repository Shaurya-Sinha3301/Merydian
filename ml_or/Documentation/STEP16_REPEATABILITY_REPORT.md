# ✅ Step 16 Report: Global Repeatability & Conflict Resolution

**Status**: COMPLETED.
**Outcome**: 3-Day Itinerary Generated Successfully.

---

## 1. The Repeatability Feature
We implemented a **Global History Tracker** to ensure families don't visit the same non-repeatable monument twice across the entire trip.
-   **Method**: `visited_history` set passed between daily optimization loops.
-   **Rule**: If `POI` in `history` AND `repeatable==False` -> `x[fid, poi] = 0`.

## 2. The Use Case (Bug)
We encountered a deadlock on **Day 2** for `FAM_B`.
-   **Day 1**: FAM_B visited **Red Fort** (satisfying their "Must Visit" preference).
-   **Day 2**: Red Fort appeared as a candidate (via Branch Expansion).
-   **The Conflict**:
    -   *History Ban*: "You visited Red Fort yesterday. **DO NOT VISIT**."
    -   *Must Visit Preference*: "Red Fort is available. **MUST VISIT**."
    -   *Result*: `0 == 1` -> **INFEASIBLE**.

## 3. The Resolution
We patched the **Must-Visit Logic** in the solver (`optimize_multi_family_single_day`).
-   **Old Logic**: Greedy. "If available, visit it."
-   **New Logic**: Smart. "If available **AND NOT ALREADY VISITED**, visit it."

## 4. Final Verification
The generated `final_optimized_trip.json` proves the fix:
-   **Day 1**: `FAM_B` visits **Red Fort** (Satisfies Must Visit).
-   **Day 2**: `FAM_B` visits **Humayun Tomb**, **Purana Qila**, **Moti Mahal**. (Red Fort is correctly skipped).
-   **Day 3**: `FAM_B` visits **Qutub Minar**, **India Gate**.

The engine now correctly balances strict constraints (History) with user preferences (Must Visit), resolving conflicts intelligently.
