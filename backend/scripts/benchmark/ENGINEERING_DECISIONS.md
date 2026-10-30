# MerYDiaN Engineering Decisions

## 1. CP-SAT over Heuristic Methods
**Decision**: Use Google OR-Tools CP-SAT instead of genetic algorithms or simulated annealing.
**Rationale**: CP-SAT provides optimality guarantees and deterministic behavior for the same input.
This is critical for reproducible benchmarking and regression testing.

## 2. SQLite for Benchmark Storage
**Decision**: Use SQLite instead of JSON files or PostgreSQL.
**Rationale**: Zero-dependency, file-based storage that supports SQL queries for analysis.
The benchmark database needs to be portable and self-contained.

## 3. Stateless Optimizer
**Decision**: The optimizer has no database access or side effects.
**Rationale**: Enables parallel execution, easy testing, and clean separation of concerns.
All persistence is handled by the service layer.

## 4. Bootstrap over Parametric Tests
**Decision**: Use bootstrap confidence intervals and permutation tests instead of t-tests.
**Rationale**: The distribution of optimizer metrics is not guaranteed to be normal.
Bootstrap methods are non-parametric and more robust.

## 5. Regression Protection Before Adoption
**Decision**: Never adopt a new configuration without checking for regressions on protected metrics.
**Rationale**: A configuration that improves average objective but degrades constraint satisfaction
or solver success rate is unacceptable. Core guarantees must be preserved.

## 6. Progressive Batch Execution
**Decision**: Scale benchmarks progressively (100 → 10,000) with gates.
**Rationale**: Catches failures early before committing to expensive large-scale runs.
Validates data quality at every scale.

## 7. Separated Metrics Collection
**Decision**: Metrics collection is a separate module from the optimizer.
**Rationale**: Instrumentation should not affect solver performance or behavior.
The collector is injected at the call boundary, not inside the solver loop.

## 8. Frozen Benchmark Suite for Tuning
**Decision**: The benchmark suite version is frozen before any tuning campaign begins.
**Rationale**: Comparing configurations on different scenario sets produces invalid conclusions.
Suite version is stored with every run for auditability.
