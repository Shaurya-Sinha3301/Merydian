# 🏗️ Voyageur Architecture Deep Dive

**Version**: 1.0 (Post-Step 16)
**Date**: January 15, 2026

---

## 1. System Overview
Voyageur is a **Multi-Family, Multi-Day Itinerary Optimization Engine** built on Google OR-Tools (CP-SAT).
It solves a variant of the **Team Orienteering Problem with Time Windows (TOPTW)**, enriched with social constraints (synchronization) and economic constraints (budget).

### Core Philosophy
1.  **Divergence w/ Synchronization**: Families are free to split up ("Branch POIs") but must reunite at key moments ("Skeleton POIs").
2.  **Global History**: The system remembers what happened on Day 1 to influence Day 2 (preventing repeat visits).
3.  **Strict Reality**: All travel times, costs, and time windows are hard constraints.

---

## 2. The Optimization Loop
The engine operates in a day-by-day loop (`optimize_trip` in `itinerary_optimizer.py`):

1.  **Initialize History**: `visited_history = {fam_id: set()}`
2.  **Day Loop** (For Day 1 to N):
    *   **A. Load Data**: Fetch Base Itinerary (Skeleton) + Preferences.
    *   **B. Dynamic Expansion (Step 15)**:
        *   Analyze Skeleton POIs (`ROLE=SKELETON`).
        *   Query `locations.json` for nearby/relevant candidates (`ROLE=BRANCH`).
        *   Filter by Family Budget & Interests.
    *   **C. Build Model (CP-SAT)**:
        *   Create nodes for Start, End, and Candidates.
        *   Define Decision Variables: `x[fam, poi]` (Visit), `arr[fam, poi]` (Time).
    *   **D. Apply Constraints**:
        *   **Flow**: Path connectivity (Start -> ... -> End).
        *   **Time**: Windows (Lunch 12:30-14:00), Travel Duration.
        *   **Sync**: If POI is Skeleton, all families must arrive effectively together.
        *   **History (Step 16)**: `model.Add(x[poi] == 0)` if POI is in `visited_history` (unless repeatable).
    *   **E. Solve**: Maximize `Satisfaction - DivergenceCost`.
    *   **F. Update History**: Extract visited POIs and add to `visited_history`.
3.  **Aggregate**: Combine daily solutions into `final_trip.json`.

---

## 3. Key Architectural Components

### A. The "Ghost Node" Model (Dynamic Branching)
Instead of hardcoding every possible stop, the system uses a **Candidate Pool**:
-   **Skeleton**: Hardcoded anchors (e.g., Qutub Minar, Lunch).
-   **Candidates**: A pool of ~10 nearby locations dynamically fetched from the database.
-   **Selection**: The solver *chooses* which candidates to visit (setting `x=1`) and which to ignore (`x=0`).

### B. The "Common Bus" Constraint (Synchronization)
To ensure families don't drift apart permanently:
-   Skeleton POIs act as **Sync Anchors**.
-   Constraints force `arrival_time[FamA] == arrival_time[FamB]` at these nodes.
-   Between anchors, families traverse independent "Branch" paths.

### C. The "Memory" Layer (Repeatability)
To prevent "Groundhog Day" scenarios:
-   **State**: `visited_history` persists across the `optimize_trip` loop.
-   **Check**: At the start of Day N optimization, checks if candidate $P$ is in `visited_history`.
-   **Action**: If found AND `repeatable=False`, strict ban (`x=0`).

---

## 4. File Structure
*   `itinerary_optimizer.py`: The Brain. Contains the CP-SAT model building and solving logic.
*   `data/locations.json`: The World. Database of all possible POIs with metadata (lat/lng, cost, repeatable).
*   `data/base_itinerary_final.json`: The Template. Defines the "Skeleton" structure for each day.
*   `final_optimized_trip.json`: The Output. The detailed, solved schedule.

---

## 5. Future Scalability
*   **Parallel Solving**: Days are currently solved sequentially (Day 1 -> Update History -> Day 2). This is necessary for history tracking.
*   **Geospatial Indexing**: Currently uses simple distance calc. For 10,000+ POIs, a true spatial index (R-Tree) would be needed for Dynamic Expansion.
