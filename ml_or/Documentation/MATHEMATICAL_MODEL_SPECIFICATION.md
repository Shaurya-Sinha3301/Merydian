# Mathematical Model Specification - Voyageur Itinerary Optimizer

## Overview

Voyageur is a **Multi-Family, Multi-Day Itinerary Optimization Engine** that solves a variant of the **Team Orienteering Problem with Time Windows (TOPTW)** using Google OR-Tools CP-SAT solver. The model optimizes personalized travel itineraries while maintaining group coherence through skeleton synchronization points.

---

## 1. Decision Variables

### Primary Variables

| Variable | Domain | Description |
|----------|--------|-------------|
| **$x_{f,d,i}$** | $\{0,1\}$ | Binary variable: 1 if family $f$ visits POI $i$ on day $d$ |
| **$y_{i,j}$** | $\{0,1\}$ | Binary variable: 1 if skeleton POI $i$ comes before $j$ in the shared backbone |
| **$\text{adj}_{f,i,j}$** | $\{0,1\}$ | Binary variable: 1 if family $f$ travels from node $i$ to node $j$ |
| **$\text{arr}_{f,d,i}$** | $\mathbb{Z}$ | Integer variable: arrival time at POI $i$ for family $f$ on day $d$ (minutes since day start) |
| **$\text{dep}_{f,d,i}$** | $\mathbb{Z}$ | Integer variable: departure time from POI $i$ for family $f$ on day $d$ (minutes since day start) |

### Node Types

- **START**: Virtual start node for each day
- **END**: Virtual end node for each day
- **Skeleton POIs**: Mandatory synchronization points (all families must visit)
- **Branch POIs**: Optional locations selected from dynamic candidate pool

---

## 2. Objective Function

The optimizer maximizes satisfaction while penalizing deviation from base itinerary:

$$
\max \sum_{f \in \text{Families}} \left[ \text{Satisfaction}_f - \lambda \cdot \text{CoherenceLoss}_f \right]
$$

### Components

#### 2.1 Satisfaction Score

$$
\text{Satisfaction}_f = \sum_{i \in \text{POIs}} x_{f,i} \cdot \text{Score}_{f,i}
$$

Where:

$$
\text{Score}_{f,i} = \text{base\_importance}_i \times \left(1 + \frac{\sum_{t \in \text{tags}_i} \text{interest\_vector}_{f,t}}{|\text{tags}_i|}\right)
$$

- $\text{base\_importance}_i$: Intrinsic importance of POI $i$ (from data)
- $\text{interest\_vector}_{f,t}$: Family $f$'s interest weight for tag $t$
- $\text{tags}_i$: Set of tags associated with POI $i$ (e.g., "historical", "adventure")

#### 2.2 Coherence Loss

$$
\text{CoherenceLoss}_f = \alpha \cdot \text{TravelTime}_f + \beta \cdot \text{TravelCost}_f + \gamma \cdot \text{OrderDeviation}_f
$$

**Parameters:**
- $\alpha = 1$: Travel time weight (1 minute = 1 satisfaction point)
- $\beta = 1$: Travel cost weight (₹1 = 1 satisfaction point)
- $\gamma = 1$: Order deviation weight
- $\lambda = 0.3$: Overall coherence loss weight

**Travel Time:**
$$
\text{TravelTime}_f = \sum_{i,j} \text{adj}_{f,i,j} \cdot \text{duration}_{i,j}
$$

**Travel Cost:**
$$
\text{TravelCost}_f = \sum_{i,j} \text{adj}_{f,i,j} \cdot \text{cost}_{i,j}
$$

**Order Deviation Penalty:**
$$
\text{OrderDeviation}_f = \sum_{\substack{i,j \in \text{POIs} \\ \text{base\_order}_i > \text{base\_order}_j}} 100 \cdot y_{i,j}
$$

---

## 3. Constraints

### 3.1 Time Constraints

**Visit Time Relationship:**
$$
\text{dep}_{f,i} = \text{arr}_{f,i} + \text{visit\_time}_i \quad \forall f, i
$$

**Time Chaining (for consecutive POIs):**
$$
\text{arr}_{f,j} \geq \text{dep}_{f,i} + \text{duration}_{i,j} \quad \text{if } \text{adj}_{f,i,j} = 1
$$

**Day Time Bounds:**
$$
\text{day\_start} \leq \text{arr}_{f,i} \leq \text{day\_end}
$$
$$
\text{day\_start} \leq \text{dep}_{f,i} \leq \text{day\_end}
$$

### 3.2 Flow Conservation Constraints

**For Each POI (if visited):**
$$
\sum_{i \in \text{Nodes}} \text{adj}_{f,i,j} = x_{f,j} \quad \forall f, j \quad \text{(incoming)}
$$
$$
\sum_{j \in \text{Nodes}} \text{adj}_{f,i,j} = x_{f,i} \quad \forall f, i \quad \text{(outgoing)}
$$

**Start Node:**
$$
\sum_{j \in \text{POIs}} \text{adj}_{f,\text{START},j} = 1 \quad \forall f
$$

**End Node:**
$$
\sum_{i \in \text{POIs}} \text{adj}_{f,i,\text{END}} = 1 \quad \forall f
$$

### 3.3 Skeleton Synchronization Constraints

**Shared Backbone Ordering:**

For skeleton POIs, the `y` variables enforce a common ordering across all families:

$$
y_{i,j} = 1 \implies \text{arr}_{f,j} \geq \text{dep}_{f,i} \quad \forall f, i,j \in \text{Skeleton}
$$

**Skeleton Flow Conservation:**
$$
\sum_{i \in \text{Skeleton Nodes}} y_{i,j} = \text{skeleton\_active}_j \quad \forall j \in \text{Skeleton}
$$
$$
\sum_{j \in \text{Skeleton Nodes}} y_{i,j} = \text{skeleton\_active}_i \quad \forall i \in \text{Skeleton}
$$

Where $\text{skeleton\_active}_i = 1$ if any family visits skeleton POI $i$.

### 3.4 Preference Constraints

**Must-Visit Locations:**
$$
x_{f,i} = 1 \quad \forall i \in \text{must\_visit}_f
$$

**Never-Visit Locations:**
$$
x_{f,i} = 0 \quad \forall i \in \text{never\_visit}_f
$$

### 3.5 History Tracking Constraints (Multi-Day)

To prevent revisiting non-repeatable POIs across days:

$$
x_{f,d,i} = 0 \quad \text{if } i \in \text{visited\_history}_f \text{ and } \text{repeatable}_i = \text{False}
$$

**Exception:** Skeleton POIs can repeat if explicitly mandated in the base itinerary.

---

## 4. Model Architecture Features

### 4.1 Dynamic POI Expansion

Instead of hardcoding all POIs, the system dynamically expands the candidate pool:

1. **Calculate Centroid** of skeleton POIs for each day
2. **Spatial Filter**: Find locations within radius (default 5 km)
3. **Interest Scoring**: Rank by family preference match
4. **Capacity Limit**: Cap total branch POIs (default 12)

### 4.2 Fallback Transport

When explicit transport edges are missing:

$$
\text{duration\_min} = \left\lceil \frac{\text{haversine\_distance}}{25 \text{ km/h}} \times 60 \right\rceil
$$

$$
\text{cost} = \max(50, \text{haversine\_distance} \times 15)
$$

Where haversine distance is calculated as:

$$
d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)
$$

With $R = 6371$ km (Earth's radius).

### 4.3 Two-Layer Architecture

**Layer 1: Skeleton Backbone** 
- Shared synchronization points
- Enforced via `y` variables
- All families follow same order

**Layer 2: Branch Paths**
- Family-specific detours
- Enforced via `adj` variables
- Between skeleton anchors

---

## 5. Problem Classification

- **Type:** Mixed Integer Programming (MIP) via CP-SAT
- **Variant:** Team Orienteering Problem with Time Windows (TOPTW)
- **Extensions:** 
  - Multi-family coordination
  - History tracking across days
  - Dynamic candidate expansion
  - Synchronization constraints

---

## 6. Solver Configuration

**Solver:** Google OR-Tools CP-SAT

**Parameters:**
- `max_time_in_seconds`: 30 (default, configurable)
- `log_search_progress`: True
- **Status:** OPTIMAL or FEASIBLE

**Scaling:**
- Satisfaction scores scaled by 100× to match integer domain
- Coherence loss scaled proportionally

---

## 7. Implementation Reference

- **Main File:** `itinerary_optimizer.py`
- **Key Class:** `ItineraryOptimizer`
- **Core Methods:**
  - `optimize_single_family_single_day()`: Single-family optimization
  - `optimize_multi_family_multi_day()`: Multi-family with synchronization
  - `expand_branch_pois_for_day()`: Dynamic POI expansion
  - `calculate_satisfaction()`: Satisfaction scoring

---

## 8. Example Constraint Applications

### Must-Visit Enforcement
```python
model.Add(x[(family_id, poi_id)] == 1)
```

### Time Chaining
```python
model.Add(arr[j] >= dep[i] + edge.duration_min).OnlyEnforceIf(z[(i,j,mode)])
```

### Skeleton Synchronization
```python
# For all families, skeleton order enforced via y variables
for f in families:
    model.Add(arr[(f, poi_j)] >= dep[(f, poi_i)]).OnlyEnforceIf(y[(poi_i, poi_j)])
```

---

## Summary

The Voyageur optimizer balances **personalization** (family-specific preferences and routing) with **coherence** (shared experience at skeleton anchors). The mathematical model uses CP-SAT to find optimal tradeoffs between satisfaction, travel efficiency, and group synchronization while respecting all temporal, spatial, and preference constraints.
