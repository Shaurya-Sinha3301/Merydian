"""
Phase 4I: Final Technical Documentation Generator.

Generates:
- SYSTEM_ARCHITECTURE.md
- OPTIMIZATION_ENGINE.md
- BENCHMARK_GUIDE.md
- ENGINEERING_DECISIONS.md
- LESSONS_LEARNED.md
- PROJECT_RESULTS.md
"""
import os
import sys
import json
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from backend.scripts.benchmark.analysis import BenchmarkAnalyzer


def _write(path: str, content: str):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  Generated: {os.path.basename(path)}")


def generate_system_architecture(output_dir: str):
    content = """# MerYDiaN System Architecture

## Overview
MerYDiaN is a multi-family travel itinerary optimization platform built on Google OR-Tools CP-SAT solver.
The system coordinates multiple families across multi-day trips, optimizing for satisfaction, cost, time,
fatigue, and accessibility while respecting hard temporal and spatial constraints.

## Architecture Layers

### 1. Data Layer
- **Locations Database** (`ml_or/data/locations.json`): POIs with coordinates, tags, visit durations, costs, and time windows.
- **Transport Graph** (`ml_or/data/transport_graph.json`): Directed graph of transport edges with mode, duration, cost, and reliability.
- **Hotels** (`ml_or/data/hotels.json`): Hotel assignments with check-in/check-out constraints.
- **Family Preferences** (`ml_or/data/family_preferences_3fam_strict.json`): Per-family demographic profiles and constraints.

### 2. Optimization Engine
- **Core Solver** (`ml_or/itinerary_optimizer.py`): CP-SAT constraint programming model.
  - POI selection variables (binary)
  - Transport mode selection
  - Arrival/departure time chaining
  - Multi-family shared-vehicle synchronization
- **Metrics Collector** (`ml_or/metrics_collector.py`): Non-intrusive instrumentation layer.

### 3. Agent Orchestration Layer
- **LLM Agents** (`agents/`): Natural language processing for user feedback interpretation.
- **Optimizer Service** (`backend/app/services/optimizer_service.py`): Stateless service bridge between agents and solver.

### 4. Benchmark Framework
- **Database** (`backend/scripts/benchmark/db.py`): SQLite-backed metrics persistence.
- **Runner** (`backend/scripts/benchmark/runner.py`): Progressive batch execution with verification gates.
- **Analysis** (`backend/scripts/benchmark/analysis.py`): Statistical analysis, A/B testing, regression protection.
- **Weight Tuner** (`backend/scripts/benchmark/weight_tuner.py`): Automated hyperparameter search.
- **Report Generator** (`backend/scripts/benchmark/report_generator.py`): Automated markdown + JSON report generation.

### 5. Frontend
- **Next.js Application** (`frontend/`): User-facing interface for trip planning and feedback.

## Data Flow
```
User Input → LLM Agents → Optimizer Service → ItineraryOptimizer (CP-SAT)
                                                     ↓
                                              MetricsCollector
                                                     ↓
                                              benchmark.db (SQLite)
                                                     ↓
                                          Reports / Resume Metrics
```

## Key Design Principles
1. **Stateless Optimizer**: The solver is pure—no database access, no side effects.
2. **Separated Instrumentation**: Metrics collection is orthogonal to optimization logic.
3. **Reproducible Benchmarks**: Every run is seeded, versioned, and stored.
4. **Regression Protection**: No configuration is adopted without statistical validation.
"""
    _write(os.path.join(output_dir, "SYSTEM_ARCHITECTURE.md"), content)


def generate_optimization_engine(output_dir: str):
    content = """# MerYDiaN Optimization Engine

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
"""
    _write(os.path.join(output_dir, "OPTIMIZATION_ENGINE.md"), content)


def generate_benchmark_guide(output_dir: str):
    content = """# MerYDiaN Benchmark Guide

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
"""
    _write(os.path.join(output_dir, "BENCHMARK_GUIDE.md"), content)


def generate_engineering_decisions(output_dir: str):
    content = """# MerYDiaN Engineering Decisions

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
"""
    _write(os.path.join(output_dir, "ENGINEERING_DECISIONS.md"), content)


def generate_lessons_learned(output_dir: str):
    content = """# MerYDiaN Lessons Learned

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
"""
    _write(os.path.join(output_dir, "LESSONS_LEARNED.md"), content)


def generate_project_results(db_path: str, output_dir: str):
    """Generates PROJECT_RESULTS.md — the first document recruiters read."""
    analyzer = BenchmarkAnalyzer(db_path)
    stats = analyzer.generate_statistics()
    leaderboard = analyzer.generate_leaderboard()
    sensitivity = analyzer.sensitivity_analysis()

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM optimization_metrics")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM optimization_metrics WHERE solver_status IN ('OPTIMAL','FEASIBLE')")
        valid = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(DISTINCT id) FROM optimizer_configurations")
        configs = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM experiment_results")
        experiments = cursor.fetchone()[0]

    success_rate = round(valid / total * 100, 2) if total else 0
    best = leaderboard[0] if leaderboard else {}

    rt = stats.get("runtime_seconds", {})
    obj = stats.get("objective_score", {})
    sat = stats.get("hard_constraint_sat_pct", {})

    lines = ["# MerYDiaN — Project Results", ""]
    lines.append("## Summary")
    lines.append("MerYDiaN is a multi-objective travel itinerary optimizer built on Google OR-Tools CP-SAT.")
    lines.append("The system schedules multi-family, multi-day trips while respecting temporal, spatial,")
    lines.append("budget, fatigue, and accessibility constraints.")
    lines.append("")

    lines.append("## Final Benchmark Summary")
    lines.append(f"- **Total Benchmark Runs:** {total:,}")
    lines.append(f"- **Valid Solver Completions:** {valid:,}")
    lines.append(f"- **Solver Success Rate:** {success_rate}%")
    lines.append(f"- **Optimizer Configurations Tested:** {configs}")
    lines.append(f"- **A/B Experiments Recorded:** {experiments}")
    lines.append("")

    if best:
        lines.append("## Best Optimizer Configuration")
        lines.append(f"- **Configuration:** {best.get('config_name', 'N/A')}")
        lines.append(f"- **Avg Objective Score:** {best.get('avg_objective', 'N/A')}")
        lines.append(f"- **Avg Runtime:** {best.get('avg_runtime', 'N/A')}s")
        lines.append(f"- **Success Rate:** {best.get('success_rate', 'N/A')}%")
        lines.append(f"- **Hard Constraint Satisfaction:** {best.get('avg_hard_constraint_sat', 'N/A')}%")
        lines.append("")

    lines.append("## Key Engineering Achievements")
    lines.append("1. **Reproducible Benchmarking:** Every run is seeded, versioned, and stored in SQLite.")
    lines.append("2. **Statistical Rigor:** Bootstrap CIs, permutation significance tests, Cohen's d effect sizes.")
    lines.append("3. **Regression Protection:** No configuration adopted without passing regression gates.")
    lines.append("4. **Progressive Scaling:** Verification gates at every batch (100 → 500 → 1K → 5K → 10K).")
    lines.append("5. **Automated Hyperparameter Tuning:** Grid search with composite scoring and significance gating.")
    lines.append("")

    lines.append("## Final Measured Metrics")
    lines.append("| Metric | Mean | Median | P95 | P99 | StdDev |")
    lines.append("|--------|------|--------|-----|-----|--------|")
    for key, label in [("runtime_seconds", "Runtime (s)"), ("objective_score", "Objective Score"),
                        ("hard_constraint_sat_pct", "Hard Constraint Sat"), ("satisfaction_score", "Satisfaction"),
                        ("travel_time_min", "Travel Time (min)"), ("fatigue_score", "Fatigue")]:
        if key in stats:
            s = stats[key]
            lines.append(f"| {label} | {s['mean']} | {s['median']} | {s['p95']} | {s['p99']} | {s['stdev']} |")
    lines.append("")

    lines.append("## Research Conclusions")
    lines.append("- CP-SAT delivers deterministic, reproducible optimization suitable for rigorous benchmarking.")
    lines.append("- Objective weight tuning yields measurable improvements when validated with statistical significance.")
    lines.append("- Regression protection is essential to prevent silent degradation of core guarantees.")
    lines.append("- Progressive scaling with verification gates catches issues early and prevents wasted computation.")
    lines.append("")

    lines.append("## Future Work")
    lines.append("- Multi-city optimization across connected trip segments.")
    lines.append("- Real-time re-optimization using live transport and weather data.")
    lines.append("- Integration with production hotel and transport booking APIs.")
    lines.append("- Exploration of meta-learning for weight initialization from traveler profile clusters.")
    lines.append("")

    _write(os.path.join(output_dir, "PROJECT_RESULTS.md"), "\n".join(lines))


def generate_all_documentation(db_path: str, output_dir: str = None):
    """Generate all Phase 4I documentation."""
    if output_dir is None:
        output_dir = os.path.dirname(__file__)

    print("\nGenerating Phase 4I Documentation...")
    generate_system_architecture(output_dir)
    generate_optimization_engine(output_dir)
    generate_benchmark_guide(output_dir)
    generate_engineering_decisions(output_dir)
    generate_lessons_learned(output_dir)
    generate_project_results(db_path, output_dir)
    print("All documentation generated.")


if __name__ == "__main__":
    db_file = os.path.join(os.path.dirname(__file__), "benchmark.db")
    output = os.path.dirname(__file__)
    if os.path.exists(db_file):
        generate_all_documentation(db_file, output)
    else:
        # Generate static docs even without DB
        generate_system_architecture(output)
        generate_optimization_engine(output)
        generate_benchmark_guide(output)
        generate_engineering_decisions(output)
        generate_lessons_learned(output)
        print("Static documentation generated. Run benchmarks first for PROJECT_RESULTS.md.")
