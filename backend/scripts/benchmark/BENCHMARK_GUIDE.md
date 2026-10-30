# MerYDiaN Benchmark Guide

## Overview
The benchmark framework enables reproducible, large-scale evaluation of the optimizer
across thousands of deterministic scenarios.

## Quick Start

### 1. Generate Scenarios
```bash
python backend/scripts/benchmark/scenario_generator.py
```
Generates `baseline_scenarios.json` with 36 gold-standard scenarios (3 per category).

### 2. Run Benchmarks
```bash
python backend/scripts/benchmark/runner.py
```
Executes progressive batches (100 → 500 → 1K → 5K → 10K) with automatic verification gates.

### 3. Run Weight Tuning
```bash
python backend/scripts/benchmark/weight_tuner.py
```
Tests all weight grid combinations with regression protection and significance testing.

### 4. Generate Reports
```bash
python backend/scripts/benchmark/report_generator.py
```
Produces markdown reports and resume_metrics.json.

## Verification Gates
After every batch, the runner checks:
- Solver success rate ≥ 50%
- Crash rate ≤ 10%
- Constraint satisfaction ≥ 40%
- Runtime stability (StdDev/Mean ≤ 5)

If any gate fails, execution aborts immediately.

## Reproducibility
Every benchmark run stores:
- Random seed
- Optimizer version
- Dataset version
- Benchmark suite version
- Git commit hash

## Database Schema
Tables: `benchmark_runs`, `benchmark_scenarios`, `optimizer_configurations`,
`optimization_metrics`, `experiment_results`

## Statistical Methods
- Bootstrap confidence intervals (1,000 resamples)
- Permutation-based significance testing (2,000 resamples, α=0.05)
- Cohen's d effect size
- Win/Loss percentage analysis
