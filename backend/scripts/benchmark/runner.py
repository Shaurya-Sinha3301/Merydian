"""
Phase 4A: Large-Scale Benchmark Execution Engine.

Runs the benchmark suite progressively (100 -> 500 -> 1K -> 5K -> 10K),
with automatic verification gates after every batch.

Phase 4B: Failure Analysis is integrated into the runner.
"""
import os
import sys
import json
import time
import hashlib
import tempfile
import traceback
import random
import math
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from backend.scripts.benchmark.db import BenchmarkDB
from backend.scripts.benchmark.scenario_generator import (
    CATEGORIES, generate_family_preference, generate_base_itinerary
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
OPTIMIZER_VERSION = "v2.1"
DATASET_VERSION   = "v1.0"
SUITE_VERSION     = "v1.0"
BATCH_SIZES       = [100, 500, 1_000, 5_000, 10_000]

# Abort thresholds
MIN_SUCCESS_RATE           = 0.50   # Abort if solver success rate drops below 50%
MAX_CRASH_RATE             = 0.10   # Abort if crash rate exceeds 10%
MIN_CONSTRAINT_SATISFACTION = 0.40  # Abort if avg constraint satisfaction < 40%
MAX_RUNTIME_STDDEV_RATIO   = 5.0   # Abort if runtime stddev / mean > 5

# Failure categories
FAILURE_CATEGORIES = {
    "INFEASIBLE":        "Infeasible Model",
    "MODEL_INVALID":     "Constraint Conflict",
    "INVALID_DATASET":   "Invalid Dataset",
    "TIMEOUT":           "Timeout",
    "MISSING_POIS":      "Missing POIs",
    "TRANSPORT_FAILURE":  "Transport Graph Failure",
    "HOTEL_FAILURE":     "Hotel Assignment Failure",
    "INTERNAL_ERROR":    "Internal Solver Failure",
    "UNKNOWN":           "Unknown Failure",
}


def _get_git_hash() -> str:
    """Attempt to retrieve the current Git commit hash."""
    try:
        import subprocess
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip() if result.returncode == 0 else "N/A"
    except Exception:
        return "N/A"


def _classify_failure(result: Optional[Dict], exception: Optional[Exception] = None) -> str:
    """Classify a failed optimization into a failure category."""
    if exception:
        msg = str(exception).lower()
        if "timeout" in msg or "time limit" in msg:
            return "TIMEOUT"
        if "transport" in msg or "edge" in msg:
            return "TRANSPORT_FAILURE"
        if "hotel" in msg:
            return "HOTEL_FAILURE"
        if "poi" in msg or "location" in msg:
            return "MISSING_POIS"
        return "INTERNAL_ERROR"

    if result is None:
        return "INFEASIBLE"

    status = result.get("status", result.get("solver_status", "")).upper()
    if "INFEASIBLE" in status:
        return "INFEASIBLE"
    if "MODEL_INVALID" in status:
        return "MODEL_INVALID"
    if result.get("error"):
        msg = result.get("message", "").lower()
        if "timeout" in msg:
            return "TIMEOUT"
        if "transport" in msg:
            return "TRANSPORT_FAILURE"
        if "hotel" in msg:
            return "HOTEL_FAILURE"
        return "INFEASIBLE"

    return "UNKNOWN"


def generate_scaled_scenarios(count: int, base_seed: int = 42) -> List[Dict[str, Any]]:
    """Generate *count* deterministic scenarios by cycling categories with unique seeds."""
    scenarios = []
    for i in range(count):
        category = CATEGORIES[i % len(CATEGORIES)]
        seed = base_seed + i
        scenario_id = f"SCENARIO_{i+1:05d}_{category.replace(' ', '_').upper()}"
        scenarios.append({
            "scenario_id": scenario_id,
            "category": category,
            "seed": seed,
            "family_preference": generate_family_preference(category, seed),
            "base_itinerary": generate_base_itinerary(category, seed),
            "dataset_version": DATASET_VERSION,
        })
    return scenarios


def _build_metrics_dict(result: Optional[Dict], elapsed: float, failure_cat: str) -> Dict[str, Any]:
    """Build a unified metrics dict from a solver result (or failure)."""
    if result and "metrics" in result:
        m = dict(result["metrics"])
    else:
        m = {}

    # Ensure core keys always exist
    m.setdefault("runtime_seconds", elapsed)
    m.setdefault("cpu_time_seconds", 0)
    m.setdefault("memory_used_mb", 0)
    m.setdefault("objective_score", 0)
    m.setdefault("solver_status", failure_cat if failure_cat else "UNKNOWN")
    m.setdefault("travel_distance_km", 0)
    m.setdefault("walking_distance_km", 0)
    m.setdefault("travel_time_min", 0)
    m.setdefault("hotel_cost", 0)
    m.setdefault("activities_scheduled", 0)
    m.setdefault("activities_skipped", 0)
    m.setdefault("unused_time_min", 0)
    m.setdefault("itinerary_density", 0)
    m.setdefault("constraint_satisfaction_rate", 0)
    m.setdefault("soft_constraint_sat_pct", 0)
    m.setdefault("relaxed_constraints", [])
    m.setdefault("dropped_constraints", [])
    m.setdefault("satisfaction_score", 0)
    m.setdefault("budget_adherence", 0)
    m.setdefault("accessibility_score", 0)
    m.setdefault("fatigue_score", 0)
    m.setdefault("time_window_compliance", 0)
    m.setdefault("solver_optimality_gap", 0)
    m.setdefault("soft_constraints_relaxed", 0)
    m.setdefault("candidate_pois_evaluated", 0)
    m.setdefault("itinerary_utilization_pct", 0)
    m.setdefault("total_waiting_time_min", 0)
    m.setdefault("avg_travel_time_min", 0)
    m.setdefault("preference_coverage_pct", 0)
    m.setdefault("budget_utilization_pct", 0)
    m.setdefault("schedule_efficiency_pct", 0)
    m.setdefault("travel_efficiency_pct", 0)
    return m


# ---------------------------------------------------------------------------
# Verification Gates
# ---------------------------------------------------------------------------
def verify_batch(db: BenchmarkDB, run_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Run verification gates after a batch completes.
    Returns (passed: bool, report: dict).
    """
    import sqlite3
    with sqlite3.connect(db.db_path) as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM optimization_metrics WHERE run_id = ?", (run_id,)
        )
        total = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM optimization_metrics WHERE run_id = ? AND solver_status IN ('OPTIMAL', 'FEASIBLE')",
            (run_id,),
        )
        successes = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM optimization_metrics WHERE run_id = ? AND solver_status = 'INTERNAL_ERROR'",
            (run_id,),
        )
        crashes = cursor.fetchone()[0]

        cursor.execute(
            "SELECT AVG(hard_constraint_sat_pct) FROM optimization_metrics WHERE run_id = ?",
            (run_id,),
        )
        avg_sat = cursor.fetchone()[0] or 0
        
        cursor.execute(
            "SELECT AVG(satisfaction_score), "
            "CASE WHEN COUNT(*) > 1 THEN SUM((satisfaction_score - sub.m) * (satisfaction_score - sub.m)) / (COUNT(*) - 1) ELSE 0 END "
            "FROM optimization_metrics, (SELECT AVG(satisfaction_score) as m FROM optimization_metrics WHERE run_id = ?) sub "
            "WHERE run_id = ?",
            (run_id, run_id),
        )
        row_sat = cursor.fetchone()
        avg_satisfaction = row_sat[0] or 0
        var_satisfaction = row_sat[1] or 0
        
        cursor.execute(
            "SELECT "
            "CASE WHEN COUNT(*) > 1 THEN SUM((objective_score - sub.m) * (objective_score - sub.m)) / (COUNT(*) - 1) ELSE 0 END "
            "FROM optimization_metrics, (SELECT AVG(objective_score) as m FROM optimization_metrics WHERE run_id = ?) sub "
            "WHERE run_id = ?",
            (run_id, run_id),
        )
        var_objective = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT AVG(runtime_seconds), "
            "CASE WHEN COUNT(*) > 1 THEN SQRT(SUM((runtime_seconds - sub.m) * (runtime_seconds - sub.m)) / (COUNT(*) - 1)) ELSE 0 END "
            "FROM optimization_metrics, (SELECT AVG(runtime_seconds) as m FROM optimization_metrics WHERE run_id = ?) sub "
            "WHERE run_id = ?",
            (run_id, run_id),
        )
        row = cursor.fetchone()
        avg_runtime = row[0] or 0
        std_runtime = row[1] or 0

    success_rate = successes / total if total else 0
    crash_rate = crashes / total if total else 0
    runtime_ratio = (std_runtime / avg_runtime) if avg_runtime > 0 else 0

    report = {
        "total_scenarios": total,
        "successes": successes,
        "success_rate": round(success_rate, 4),
        "crashes": crashes,
        "crash_rate": round(crash_rate, 4),
        "avg_constraint_satisfaction": round(avg_sat, 4),
        "avg_runtime_seconds": round(avg_runtime, 4),
        "runtime_stddev": round(std_runtime, 4),
        "runtime_stddev_ratio": round(runtime_ratio, 4),
    }

    passed = True
    reasons = []
    if success_rate < MIN_SUCCESS_RATE:
        passed = False
        reasons.append(f"Success rate {success_rate:.2%} < {MIN_SUCCESS_RATE:.0%}")
    if crash_rate > MAX_CRASH_RATE:
        passed = False
        reasons.append(f"Crash rate {crash_rate:.2%} > {MAX_CRASH_RATE:.0%}")
    if avg_sat < MIN_CONSTRAINT_SATISFACTION:
        passed = False
        reasons.append(f"Avg constraint satisfaction {avg_sat:.2%} < {MIN_CONSTRAINT_SATISFACTION:.0%}")
    if runtime_ratio > MAX_RUNTIME_STDDEV_RATIO:
        passed = False
        reasons.append(f"Runtime instability ratio {runtime_ratio:.2f} > {MAX_RUNTIME_STDDEV_RATIO}")
    if avg_satisfaction <= 0:
        passed = False
        reasons.append(f"Avg satisfaction score is zero. Must be > 0.")
    if var_objective <= 0:
        passed = False
        reasons.append(f"Objective variance is zero. Configurations produce identical outcomes.")

    report["passed"] = passed
    report["abort_reasons"] = reasons
    return passed, report


# ---------------------------------------------------------------------------
# Failure Analysis (Phase 4B)
# ---------------------------------------------------------------------------
def generate_failure_report(db: BenchmarkDB, run_id: int) -> Dict[str, Any]:
    """Generate failure frequency, percentages, and category trends."""
    import sqlite3
    with sqlite3.connect(db.db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            "SELECT solver_status, COUNT(*) as cnt FROM optimization_metrics WHERE run_id = ? GROUP BY solver_status",
            (run_id,),
        )
        status_counts = {row["solver_status"]: row["cnt"] for row in cursor.fetchall()}

        cursor.execute(
            "SELECT COUNT(*) FROM optimization_metrics WHERE run_id = ?", (run_id,)
        )
        total = cursor.fetchone()[0]

        # Per-category failure rates
        cursor.execute(
            """
            SELECT s.category, m.solver_status, COUNT(*) as cnt
            FROM optimization_metrics m
            JOIN benchmark_scenarios s ON m.scenario_id = s.id
            WHERE m.run_id = ?
            GROUP BY s.category, m.solver_status
            """,
            (run_id,),
        )
        category_trends = {}
        for row in cursor.fetchall():
            cat = row["category"]
            if cat not in category_trends:
                category_trends[cat] = {}
            category_trends[cat][row["solver_status"]] = row["cnt"]

    success_statuses = {"OPTIMAL", "FEASIBLE"}
    failures = {k: v for k, v in status_counts.items() if k not in success_statuses}
    total_failures = sum(failures.values())

    return {
        "total_scenarios": total,
        "total_failures": total_failures,
        "failure_rate": round(total_failures / total, 4) if total else 0,
        "failure_frequency": failures,
        "failure_percentages": {
            k: round(v / total * 100, 2) for k, v in failures.items()
        } if total else {},
        "category_trends": category_trends,
    }


# ---------------------------------------------------------------------------
# Main Runner
# ---------------------------------------------------------------------------
def run_progressive_benchmarks(
    db_path: str,
    config_name: str = "Baseline",
    alpha: float = 1.0,
    beta: float = 0.05,
    gamma: float = 100.0,
    fatigue_enabled: bool = True,
    time_windows_enabled: bool = True,
    walking_enabled: bool = True,
    batch_sizes: List[int] = None,
    time_limit_seconds: int = 5,
    output_dir: str = None,
) -> Dict[str, Any]:
    """
    Progressive benchmark execution with verification gates.
    Returns a summary of all batches executed.
    """
    if batch_sizes is None:
        batch_sizes = BATCH_SIZES
    if output_dir is None:
        output_dir = os.path.dirname(__file__)

    db = BenchmarkDB(db_path)
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    db.init_db(schema_path)

    git_hash = _get_git_hash()
    config_id = db.record_config(
        config_name, alpha, beta, gamma,
        fatigue_enabled, time_windows_enabled, walking_enabled, {}
    )

    cumulative_summary = {
        "optimizer_version": OPTIMIZER_VERSION,
        "dataset_version": DATASET_VERSION,
        "suite_version": SUITE_VERSION,
        "git_hash": git_hash,
        "config_name": config_name,
        "config_id": config_id,
        "batches": [],
    }

    total_executed = 0

    for target_size in batch_sizes:
        batch_count = target_size - total_executed
        if batch_count <= 0:
            continue

        print(f"\n{'='*70}")
        print(f" BATCH: Executing scenarios {total_executed+1} -> {target_size}")
        print(f"{'='*70}")

        run_id = db.record_run(
            seed=42, opt_version=OPTIMIZER_VERSION,
            dataset_version=DATASET_VERSION, git_hash=git_hash,
            suite_version=SUITE_VERSION,
        )

        scenarios = generate_scaled_scenarios(batch_count, base_seed=42 + total_executed)
        batch_start = time.time()
        batch_successes = 0
        batch_failures = 0

        for idx, scenario in enumerate(scenarios):
            scenario_num = total_executed + idx + 1
            scenario_id = scenario["scenario_id"]
            category = scenario["category"]
            fam_pref = scenario["family_preference"]
            base_itin = scenario["base_itinerary"]
            family_id = "FAM_BENCHMARK"
            fam_pref["family_id"] = family_id

            db_scenario_id = db.record_scenario(
                run_id, scenario_id, category,
                num_pois=0, num_hotels=1,
                family_size=fam_pref["members"],
                duration=len(base_itin["days"]),
            )

            t0 = time.time()
            result = None
            failure_cat = None
            exception = None

            try:
                with tempfile.TemporaryDirectory() as temp_dir:
                    pref_path = os.path.join(temp_dir, "fam_pref.json")
                    with open(pref_path, "w") as f:
                        json.dump([fam_pref], f)

                    base_path = os.path.join(temp_dir, "base_itin.json")
                    with open(base_path, "w") as f:
                        json.dump(base_itin, f)

                    from ml_or.itinerary_optimizer import ItineraryOptimizer
                    optimizer = ItineraryOptimizer(
                        locations_file="ml_or/data/locations.json",
                        hotels_file="ml_or/data/hotels.json",
                        transport_file="ml_or/data/transport_graph.json",
                        base_itinerary_file=base_path,
                        family_prefs_file=pref_path,
                    )

                    optimizer.alpha = alpha
                    optimizer.beta = beta
                    optimizer.gamma = gamma

                    result = optimizer.optimize_single_family_single_day(
                        family_id=family_id,
                        day_index=0,
                        max_pois=12,
                        time_limit_seconds=time_limit_seconds,
                    )
            except Exception as e:
                exception = e
                traceback.print_exc()

            elapsed = time.time() - t0

            status = result.get("metrics", {}).get("solver_status", "").upper() if result else ""
            if status in ("OPTIMAL", "FEASIBLE"):
                failure_cat = None
                batch_successes += 1
            else:
                failure_cat = _classify_failure(result, exception)
                batch_failures += 1

            metrics = _build_metrics_dict(result, elapsed, failure_cat or "OPTIMAL")
            # Overwrite solver_status to reflect classification
            if failure_cat:
                metrics["solver_status"] = failure_cat

            db.record_metrics(run_id, db_scenario_id, config_id, metrics)

            if scenario_num % 50 == 0 or scenario_num == target_size:
                pct = scenario_num / target_size * 100
                print(f"  [{scenario_num}/{target_size}] {pct:.0f}% | "
                      f"Success: {batch_successes} | Fail: {batch_failures} | "
                      f"Last: {elapsed:.2f}s")

        batch_elapsed = time.time() - batch_start
        total_executed = target_size

        # --- Verification Gate ---
        passed, gate_report = verify_batch(db, run_id)
        failure_report = generate_failure_report(db, run_id)

        batch_summary = {
            "target_size": target_size,
            "executed": batch_count,
            "run_id": run_id,
            "elapsed_seconds": round(batch_elapsed, 2),
            "verification": gate_report,
            "failure_analysis": failure_report,
        }
        cumulative_summary["batches"].append(batch_summary)

        # Save intermediate report
        report_path = os.path.join(output_dir, "benchmark_progress.json")
        with open(report_path, "w") as f:
            json.dump(cumulative_summary, f, indent=2)

        print(f"\n  Verification Gate @ {target_size}:")
        print(f"    Success Rate:     {gate_report['success_rate']:.2%}")
        print(f"    Crash Rate:       {gate_report['crash_rate']:.2%}")
        print(f"    Avg Constraint:   {gate_report['avg_constraint_satisfaction']:.2%}")
        print(f"    Avg Runtime:      {gate_report['avg_runtime_seconds']:.3f}s")
        print(f"    Gate Passed:      {'OK' if passed else 'X ABORT'}")

        if not passed:
            print(f"\n  ! ABORTING: {', '.join(gate_report['abort_reasons'])}")
            break

    # Final summary
    summary_path = os.path.join(output_dir, "benchmark_summary.json")
    with open(summary_path, "w") as f:
        json.dump(cumulative_summary, f, indent=2)
    print(f"\nBenchmark complete. Summary saved to {summary_path}")

    return cumulative_summary


if __name__ == "__main__":
    import sys
    db_file = os.path.join(os.path.dirname(__file__), "benchmark.db")
    
    if len(sys.argv) > 1:
        custom_batches = [int(x) for x in sys.argv[1:]]
        run_progressive_benchmarks(db_file, batch_sizes=custom_batches)
    else:
        run_progressive_benchmarks(db_file)
