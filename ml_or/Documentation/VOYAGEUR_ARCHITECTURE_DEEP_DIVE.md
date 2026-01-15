# 🏗️ Voyageur Engine: Architecture Deep Dive

**Target File**: `ml_or/itinerary_optimizer.py`
**Architecture Style**: Constraint Programming (CP-SAT) with Time-Expanded Graphs.

---

## 1. High-Level Design
The engine follows a **Hierarchical Optimization** approach:
1.  **Orchestrator Layer** (`optimize_trip`): Manages the multi-day lifecycle, state (Hotel Anchors), and result aggregation.
2.  **Solver Layer** (`optimize_multi_family_single_day`): The heavy lifting. Instantiates the CP-SAT model for a specific day and group of families.
3.  **Data Layer** (`Location`, `TransportEdge`): Immutable static definitions loaded from JSON.

---

## 2. Core Algorithm: Hybrid Synced TSP
The unique innovation of Voyageur is the **Hybrid Synced TSP**, which solves the "Herding Cats" problem. It allows individual freedom (`adj`) constrained by group social pressure (`y`).

### A. The Two Graphs
The solver maintains **two parallel graph representations**:

| Feature | Variable | Scope | Purpose |
| :--- | :--- | :--- | :--- |
| **The Backbone** | `y[i, j]` | **Shared** (Global) | Defines the "Group Plan" ordering. If `y[A,B]=1`, the *Group* agrees A comes before B. |
| **The Paths** | `adj[f, i, j]` | **Family** (Local) | Defines the *actual* physical path taken by Family `f`. allows for detours/shortcuts. |

### B. Synchronization Logic
The "Hybrid" nature comes from how these two graphs interact:
1.  **Skeleton Constraint**: For designated "Skeleton" POIs (e.g., Red Fort), all families MUST arrive at the exact same timestamp (`arr[f1, p] == arr[f2, p]`).
2.  **Sequence Enforcement**: The Shared Backbone `y` forces a directed acyclic graph (DAG) on the Skeleton POIs.
3.  **Divergence Freedom**: Between Skeleton nodes, families can traverse different `adj` edges (e.g., f1 takes a cab, f2 takes the metro, or f2 visits a Branch POI).

---

## 3. Decision Variables & Constraints

### Key Decision Variables
-   `x[f, i] ∈ {0, 1}`: **Visit Goal**. Does Family `f` visit Location `i`?
-   `arr[f, i] ∈ [0, 1440]`: **Arrival Time**. Minute of the day Family `f` arrives at `i`.
-   `dep[f, i] ∈ [0, 1440]`: **Departure Time**. `arr + visit_duration`.

### The Constraint Hierarchy
The solver applies constraints in strict priority:
1.  **Physical Constraints (Hard)**:
    -   `arr[j] >= dep[i] + travel_time` (Physics)
    -   Flow Conservation (Must leave if you arrive)
2.  **Hard Time Windows (Hard)**:
    -   `arr[Lunch] >= 12:30` AND `dep[Lunch] <= 14:00`
3.  **Social Constraints (Semi-Hard)**:
    -   Sync at Skeleton POIs (All families arrive together).
4.  **Preference Constraints (Soft)**:
    -   "Must Visit" (Heavily rewarded).
    -   "Never Visit" (Hard exclusion).

---

## 4. The Objective Function
The engine maximizes a single scalar value:

$$ \text{Maximize } \mathcal{O} = \sum_{f} \left( \text{Satisfaction}(f) - \lambda \cdot \text{CoherenceLoss}(f) \right) $$

Where:
-   **Satisfaction**: $\sum (\text{Importance} \times \text{InterestMatch})$.
-   **CoherenceLoss**: Cost of travel + Time spent commuting + Social Desync penalties.
-   **$\lambda$ (`lambda_coherence`)**: The "Herding Factor".
    -   High $\lambda$ (>2.0): Forces group to stick together to save money/time.
    -   Low $\lambda$ (<0.5): Allows group to fracture into independent sub-trips.

---

## 5. Execution Flow

1.  **Load Data**: Parses `locations.json` and `transport_graph.json`.
2.  **Trip Loop**: Iterates Day 1 -> Day N.
3.  **Graph Construction**:
    -   Identifies **Start/End Anchors** (usually `LOC_HOTEL`).
    -   Classifies **Skeleton** vs **Branch** POIs.
4.  **Solve (CP-SAT)**:
    -   Build variables.
    -   Apply constraints.
    -   Maximize Objective.
5.  **Extract & Validate**:
    -   Converts raw variables to JSON.
    -   Runs **Sanity Checks** (Monotonic time, Connectivity).
6.  **Return**: Aggregated 3-Day Plan.

---

## 6. Future Extensibility
-   **Fatigue Modeling**: Add `energy[f, i]` variable that decreases with `adj` edges.
-   **Live Traffic**: Replace static `transport_graph` lookup with API calls in the Orchestrator layer.
