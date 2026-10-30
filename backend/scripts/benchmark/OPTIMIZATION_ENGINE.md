# MerYDiaN Optimization Engine

## Solver
- **Engine**: Google OR-Tools CP-SAT (Constraint Programming – Satisfiability)
- **Language**: Python 3.10+
- **Paradigm**: Multi-objective combinatorial optimization

## Decision Variables
| Variable | Type | Description |
|----------|------|-------------|
| `x[poi, mode]` | Binary | Whether POI is visited using transport mode |
| `y[poi]` | Binary | Whether POI is selected (any mode) |
| `z[poi, mode]` | Binary | Transport mode selection per POI |
| `adj[i, j]` | Binary | Whether POI j immediately follows POI i |
| `arr[poi]` | Integer | Arrival time at POI (minutes from day start) |
| `dep[poi]` | Integer | Departure time from POI (minutes from day start) |

## Constraints
### Hard Constraints
- Time window enforcement (POI open/close hours)
- Hotel check-in/check-out scheduling
- Day start/end time bounds
- Transport graph connectivity
- Arrival ≤ Departure for every POI

### Soft Constraints
- Budget limits
- Fatigue/energy thresholds (per family profile)
- Walking distance limits
- Accessibility requirements

## Objective Function
```
Maximize: Σ satisfaction(poi) - λ·coherence_loss - branch_penalty
```

Where coherence_loss = α·travel_time + β·travel_cost + γ·order_deviation + δ·divergence

### Tunable Parameters
| Parameter | Description | Default |
|-----------|-------------|---------|
| α (alpha) | Travel time weight | 1.0 |
| β (beta) | Travel cost weight | 0.05 |
| γ (gamma) | Missed-POI penalty | 100.0 |
| δ (delta) | Desync duration weight | 0.5 |
| λ (lambda) | Overall coherence loss weight | 0.3 |

## Family Profiles
- Solo Traveler, Couple, Family with Children, Elderly, Accessibility-focused
- Each profile adjusts fatigue bounds and constraint priorities
- Energy level scales maximum fatigue threshold

## Fatigue Model
```
fatigue(family) = Σ (visit_duration × weight) + Σ (walk_duration × walk_weight)
max_fatigue = base_limit × energy_level × profile_modifier
```
