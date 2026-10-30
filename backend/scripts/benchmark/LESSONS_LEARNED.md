# MerYDiaN Lessons Learned

## 1. Measure Everything, Estimate Nothing
The single most important lesson. Early development relied on assumptions about performance.
The benchmark framework replaced all assumptions with measured data.

## 2. Deterministic Scenarios Are Essential
Random scenario generation made benchmarks unreproducible. Switching to deterministic,
seeded scenario generation with fixed categories solved this entirely.

## 3. Statistical Significance Matters
Early A/B comparisons used average differences only. This led to false conclusions.
Adding bootstrap significance tests and effect sizes prevented adopting configurations
that appeared better but were within noise margins.

## 4. Regression Protection Prevents Silent Failures
Without regression checks, optimizer "improvements" occasionally degraded constraint
satisfaction or solver success rate. The automated regression gate catches these.

## 5. Start Small, Scale Gradually
Running 10,000 scenarios immediately would waste hours on bugs that could be caught
in the first 100 runs. Progressive batching with verification gates is the correct approach.

## 6. Separate Instrumentation from Logic
Early attempts to collect metrics inside the solver loop caused subtle behavioral changes.
Moving to a boundary-level collector eliminated this problem.

## 7. Version Everything
Optimizer version, dataset version, suite version, and git hash must all be stored.
Without this, historical comparisons are meaningless.

## 8. Resume Metrics Must Be Earned
Generating resume bullets before collecting sufficient data produces indefensible claims.
The 1,000-run minimum threshold ensures statistical stability.
