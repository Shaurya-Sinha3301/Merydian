"""
Phase 4C: Automated Objective Weight Tuning.

Searches for improved weight configurations using the FROZEN benchmark suite.
Evaluates each candidate using a composite score across multiple objectives.
Only keeps configurations that pass regression protection AND demonstrate
statistically significant improvements.
"""
import os
import sys
import json
import itertools
from pathlib import Path
from typing import Dict, List, Any, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from backend.scripts.benchmark.runner import run_progressive_benchmarks
from backend.scripts.benchmark.analysis import BenchmarkAnalyzer
from backend.scripts.benchmark.db import BenchmarkDB


# Weight grid: each parameter gets a small set of candidate values
WEIGHT_GRID = {
    "alpha":  [1.0, 2.0],         # travel time weight
    "beta":   [0.05],        # travel cost weight
    "gamma":  [100.0],       # missed-POI penalty weight
}

# Composite score formula weights (for evaluating a configuration)
COMPOSITE_WEIGHTS = {
    "objective_score":        0.30,
    "hard_constraint_sat_pct": 0.25,
    "satisfaction_score":      0.15,
    "runtime_seconds":        -0.10,  # negative = lower is better
    "fatigue_score":          -0.05,
    "accessibility_score":     0.10,
    "soft_constraint_sat_pct": 0.05,
}


def compute_composite_score(stats: Dict[str, Any]) -> float:
    """Compute a weighted composite score from full statistics."""
    score = 0.0
    for metric, weight in COMPOSITE_WEIGHTS.items():
        if metric in stats and "mean" in stats[metric]:
            score += weight * stats[metric]["mean"]
    return round(score, 6)


def run_tuning_campaign(
    db_path: str,
    baseline_config_name: str = "Baseline",
    baseline_alpha: float = 1.0,
    baseline_beta: float = 0.05,
    baseline_gamma: float = 100.0,
    scenarios_per_config: int = 10,
    time_limit_seconds: int = 1,
) -> Dict[str, Any]:
    """
    Run the weight tuning campaign.

    1. Run baseline on the frozen suite.
    2. Generate candidate configurations from WEIGHT_GRID.
    3. Run each candidate on the SAME frozen suite.
    4. Evaluate composite score.
    5. Check regression protection.
    6. Check statistical significance.
    7. Record everything; only promote if passes all checks.
    """
    output_dir = os.path.dirname(__file__)
    analyzer = BenchmarkAnalyzer(db_path)

    # Step 1: Run baseline
    print("\n" + "=" * 70)
    print(" TUNING: Running Baseline Configuration")
    print("=" * 70)
    baseline_summary = run_progressive_benchmarks(
        db_path=db_path,
        config_name=baseline_config_name,
        alpha=baseline_alpha,
        beta=baseline_beta,
        gamma=baseline_gamma,
        batch_sizes=[scenarios_per_config],
        time_limit_seconds=time_limit_seconds,
        output_dir=output_dir,
    )
    baseline_config_id = baseline_summary["config_id"]

    # Step 2: Generate candidates (skip the baseline itself)
    candidates = []
    for alpha, beta, gamma in itertools.product(
        WEIGHT_GRID["alpha"], WEIGHT_GRID["beta"], WEIGHT_GRID["gamma"]
    ):
        if (alpha, beta, gamma) == (baseline_alpha, baseline_beta, baseline_gamma):
            continue
        candidates.append({
            "name": f"A{alpha}_B{beta}_G{gamma}",
            "alpha": alpha,
            "beta": beta,
            "gamma": gamma,
        })

    results = {
        "baseline": {
            "config_id": baseline_config_id,
            "config_name": baseline_config_name,
            "alpha": baseline_alpha,
            "beta": baseline_beta,
            "gamma": baseline_gamma,
        },
        "candidates": [],
        "best_config": None,
    }

    best_composite = compute_composite_score(
        analyzer.generate_statistics(config_id=baseline_config_id)
    )
    best_config = results["baseline"]

    print(f"\nBaseline composite score: {best_composite}")
    print(f"Evaluating {len(candidates)} candidate configurations...\n")

    for i, cand in enumerate(candidates):
        print(f"\n--- Candidate {i+1}/{len(candidates)}: {cand['name']} ---")

        cand_summary = run_progressive_benchmarks(
            db_path=db_path,
            config_name=cand["name"],
            alpha=cand["alpha"],
            beta=cand["beta"],
            gamma=cand["gamma"],
            batch_sizes=[scenarios_per_config],
            time_limit_seconds=time_limit_seconds,
            output_dir=output_dir,
        )
        cand_config_id = cand_summary["config_id"]

        # Compute composite score
        cand_stats = analyzer.generate_statistics(config_id=cand_config_id)
        cand_composite = compute_composite_score(cand_stats)

        # Check regression
        safe, violations = analyzer.check_regression(
            production_config_id=baseline_config_id,
            candidate_config_id=cand_config_id,
        )

        # Check significance
        comparison = analyzer.compare_configs(
            baseline_config_id=baseline_config_id,
            challenger_config_id=cand_config_id,
            experiment_name=f"Tuning_{cand['name']}_vs_{baseline_config_name}",
        )

        # Count significantly improved metrics
        sig_improvements = sum(
            1 for m, data in comparison.items()
            if data.get("statistically_significant") and data.get("delta", 0) > 0
        )

        entry = {
            "config_id": cand_config_id,
            "config_name": cand["name"],
            "alpha": cand["alpha"],
            "beta": cand["beta"],
            "gamma": cand["gamma"],
            "composite_score": cand_composite,
            "regression_safe": safe,
            "regression_violations": violations,
            "significant_improvements": sig_improvements,
            "promoted": False,
        }

        # Promotion criteria
        if cand_composite > best_composite and safe and sig_improvements > 0:
            entry["promoted"] = True
            best_composite = cand_composite
            best_config = entry
            print(f"  ✓ PROMOTED (composite={cand_composite}, sig_improvements={sig_improvements})")
        else:
            reasons = []
            if cand_composite <= best_composite:
                reasons.append(f"composite {cand_composite} <= best {best_composite}")
            if not safe:
                reasons.append(f"regressions: {violations}")
            if sig_improvements == 0:
                reasons.append("no statistically significant improvements")
            print(f"  ✗ REJECTED ({'; '.join(reasons)})")

        results["candidates"].append(entry)

    results["best_config"] = best_config

    # Save tuning results
    tuning_path = os.path.join(output_dir, "tuning_results.json")
    with open(tuning_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nTuning complete. Results saved to {tuning_path}")

    return results


if __name__ == "__main__":
    db_file = os.path.join(os.path.dirname(__file__), "benchmark.db")
    run_tuning_campaign(db_file, scenarios_per_config=100)
