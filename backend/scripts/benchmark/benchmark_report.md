# MerYDiaN Benchmark Report

**Generated:** 2026-07-08T14:51:48.611001Z
**Sample Size:** 10000

## Baseline vs Best Configuration Comparison

Configuration comparison unavailable (single evaluated configuration or baseline not found).

## Resume Metrics

✓ Executed 10,000 optimization scenarios
✓ Evaluated 1 optimizer configurations
✓ 0.143662 s median optimization latency
✓ 5.063174 s P95 latency
✓ 5.165002 s P99 latency
✓ 100.0% successful optimization runs

## Engineering Improvements

No comparison configuration available. Improvement analysis skipped.

## Configuration Summary

| Configuration | Runs | Mean Runtime | Median Runtime | Success Rate | Avg Travel Time | Avg Satisfaction | Memory Usage | CPU Usage |
|---------------|------|--------------|----------------|--------------|-----------------|------------------|--------------|-----------|
| Baseline | 10000 | 0.66 | 0.14 | 100.0% | 83.34 | 56.17 | 4.75 | 6.12 |

## Derived Metrics

- **Optimization throughput (runs/minute)**: 90.64
- **Solver success rate**: 100.00%
- **Average skipped activities**: 2.5332
- **Average runtime per POI**: 0.1029s
- **Average runtime per trip day**: 0.2206s
- **Benchmark reproducibility rate**: 100.0% (deterministic seed enforced)

## Optimization Quality

### objective_score
- Mean: 29593.1043 | Median: 29726.0 | P95: 39325.0 | P99: 43729.52
- StdDev: 6156.414143 | CI 95%: [29472.5891, 29714.3605]

### hard_constraint_sat_pct
- Mean: 1.0 | Median: 1.0 | P95: 1.0 | P99: 1.0
- StdDev: 0.0 | CI 95%: [1.0, 1.0]

### soft_constraint_sat_pct
Not Available

### solver_optimality_gap
Not Available

### runtime_seconds
- Mean: 0.661936 | Median: 0.143662 | P95: 5.063174 | P99: 5.165002
- StdDev: 5.215701 | CI 95%: [0.592814, 0.773837]

### cpu_time_seconds
- Mean: 6.122858 | Median: 0.375 | P95: 35.939062 | P99: 92.797344
- StdDev: 17.856601 | CI 95%: [5.750237, 6.490798]

### memory_mb
- Mean: 4.748243 | Median: 0.496094 | P95: 25.700781 | P99: 53.189453
- StdDev: 10.351612 | CI 95%: [4.532624, 4.943927]

## Travel Quality

### travel_distance_km
Not Available

### travel_time_min
- Mean: 83.3395 | Median: 85.0 | P95: 116.0 | P99: 129.0
- StdDev: 20.765451 | CI 95%: [82.9451, 83.7452]

### walking_distance_km
Not Available

### total_waiting_time_min
Not Available

### itinerary_utilization_pct
Not Available

### unused_time_min
Not Available

## Preference Quality

### satisfaction_score
- Mean: 56.170028 | Median: 56.352222 | P95: 64.333762 | P99: 68.541552
- StdDev: 4.929716 | CI 95%: [56.077058, 56.267586]

### activities_completed
- Mean: 7.1887 | Median: 7.0 | P95: 9.0 | P99: 9.0
- StdDev: 1.263508 | CI 95%: [7.1646, 7.2149]

### activities_skipped
- Mean: 2.5332 | Median: 2.0 | P95: 6.0 | P99: 6.0
- StdDev: 1.688011 | CI 95%: [2.501, 2.5659]

### accessibility_score
Not Available

### fatigue_score
Not Available

### preference_coverage_pct
Not Available

### time_window_compliance
Not Available

## Business Metrics

### hotel_cost
Not Available

### budget_utilization_pct
Not Available

### schedule_efficiency_pct
Not Available

### travel_efficiency_pct
Not Available
