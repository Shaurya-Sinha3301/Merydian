
# TRAVELAI – Optimization Engine Context File
## Purpose
This document is provided to the Code Editor AI Agent. It contains complete system context
for implementing the heavy-weight OR-Tools optimization model for personalized group itineraries.

---
## 1. Input Files (Immutable)

The files are in the [ml_or/data] folder
1. locations.json  
- World nodes (POIs, hotels, restaurants)  
- visit_time, tags, base_importance  

2. transport_graph.json  
- Directed edges  
- mode, duration_min, cost, reliability  

3. base_itinerary.json  
- Planning scope only  
- NO transport  
- Start/end anchors  
- POIs per day  

4. family_preferences.json  
- interest vectors  
- must_visit, never_visit  
- budget and energy weights  

---
## 2. Optimization Philosophy

Personalization is optimized as deviation from a base itinerary, not as independent routes.

---
## 3. Decision Variables (CP-SAT)

x[f,d,i] ∈ {0,1}  → visit POI  
y[f,d,i,j] ∈ {0,1} → ordering  
z[f,d,i,j,m] ∈ {0,1} → transport mode  

arr[f,d,i], dep[f,d,i] ∈ ℤ

---
## 4. Time Constraints

dep = arr + visit_time  

arr[j] ≥ dep[i] + transport_time(i,j,m) − M(1 − z)

0 ≤ arr ≤ day_end

---
## 5. Satisfaction

Sat(f,i) =
base_importance × Σ_tag(interest_vector × poi_tag)

Total = Σ x × Sat

---
## 6. Coherence Loss

ExtraTravelTime  
ExtraTravelCost  
MissedSharedPOIs  
DesyncDuration  

CoherenceLoss =
α·time + β·cost + γ·missedPOIs + δ·desync

Recommended:
α=1, β=0.05, γ=100, δ=0.5

---
## 7. Objective

maximize Σ_f [ Satisfaction(f) − λ·CoherenceLoss(f) ]

---
## 8. Hard Guards

- Max desync minutes per day
- Anchor POIs fixed
- Replacement radius bound

---
## 9. Output

solved_itinerary.json with:
- POI order
- transport modes
- arrival/departure times

---
## Final Instruction

This is a time-expanded CP-SAT scheduling problem with deviation penalties.
Treat as industrial optimization, not recommendation heuristics.
