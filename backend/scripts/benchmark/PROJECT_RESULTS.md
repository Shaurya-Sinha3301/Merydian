# MerYDiaN — Project Results

## Summary
MerYDiaN is a multi-objective travel itinerary optimizer built on Google OR-Tools CP-SAT.
The system schedules multi-family, multi-day trips while respecting temporal, spatial,
budget, fatigue, and accessibility constraints.

## Final Benchmark Summary
- **Total Benchmark Runs:** 3,825
- **Valid Solver Completions:** 3,825
- **Solver Success Rate:** 100.0%
- **Optimizer Configurations Tested:** 21
- **A/B Experiments Recorded:** 13

## Best Optimizer Configuration
- **Configuration:** A0.5_B0.02_G50.0
- **Avg Objective Score:** 37338.21
- **Avg Runtime:** 1.7722s
- **Success Rate:** 100.0%
- **Hard Constraint Satisfaction:** 100.0%

## Key Engineering Achievements
1. **Reproducible Benchmarking:** Every run is seeded, versioned, and stored in SQLite.
2. **Statistical Rigor:** Bootstrap CIs, permutation significance tests, Cohen's d effect sizes.
3. **Regression Protection:** No configuration adopted without passing regression gates.
4. **Progressive Scaling:** Verification gates at every batch (100 → 500 → 1K → 5K → 10K).
5. **Automated Hyperparameter Tuning:** Grid search with composite scoring and significance gating.

## Final Measured Metrics
| Metric | Mean | Median | P95 | P99 | StdDev |
|--------|------|--------|-----|-----|--------|
| Runtime (s) | 0.251266 | 0.0676 | 1.030164 | 5.07972 | 0.778046 |
| Objective Score | 32675.48549 | 33167.0 | 43426.0 | 46239.0 | 6727.57105 |
| Hard Constraint Sat | 1.0 | 1.0 | 1.0 | 1.0 | 0.0 |
| Satisfaction | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Travel Time (min) | 92.876601 | 92.0 | 121.0 | 135.76 | 18.261995 |
| Fatigue | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

## Research Conclusions
- CP-SAT delivers deterministic, reproducible optimization suitable for rigorous benchmarking.
- Objective weight tuning yields measurable improvements when validated with statistical significance.
- Regression protection is essential to prevent silent degradation of core guarantees.
- Progressive scaling with verification gates catches issues early and prevents wasted computation.

## Future Work
- Multi-city optimization across connected trip segments.
- Real-time re-optimization using live transport and weather data.
- Integration with production hotel and transport booking APIs.
- Exploration of meta-learning for weight initialization from traveler profile clusters.
