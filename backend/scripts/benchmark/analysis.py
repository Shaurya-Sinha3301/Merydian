"""
Phase 4C / 4D / 4E: Statistical Analysis, Experiment Framework,
Sensitivity Analysis, Regression Protection, and Leaderboard.
"""
import sqlite3
import json
import math
import random
import statistics
import os
from typing import Dict, List, Any, Optional, Tuple


class BenchmarkAnalyzer:
    """Core analysis engine for benchmark data."""

    # Metrics that are analysed across all statistical methods
    ALL_METRICS = [
        "runtime_seconds", "cpu_time_seconds", "memory_mb", "objective_score",
        "travel_distance_km", "walking_distance_km", "travel_time_min",
        "hotel_cost", "activities_completed", "activities_skipped",
        "unused_time_min", "itinerary_density",
        "hard_constraint_sat_pct", "soft_constraint_sat_pct",
        "satisfaction_score", "budget_adherence", "accessibility_score",
        "fatigue_score", "time_window_compliance",
    ]

    # Metrics where regression must be blocked (Phase 4C requirement)
    REGRESSION_PROTECTED = {
        "hard_constraint_sat_pct": "higher_is_better",
        "satisfaction_score":      "higher_is_better",
        "accessibility_score":     "higher_is_better",
        "runtime_seconds":         "lower_is_better",
    }

    def __init__(self, db_path: str = "benchmark.db"):
        self.db_path = db_path

    # ------------------------------------------------------------------
    # Percentile helper (linear interpolation)
    # ------------------------------------------------------------------
    @staticmethod
    def _percentile(data: List[float], p: float) -> float:
        if not data:
            return 0.0
        s = sorted(data)
        k = (len(s) - 1) * p
        f = int(k)
        c = min(f + 1, len(s) - 1)
        if f == c:
            return s[f]
        return s[f] * (c - k) + s[c] * (k - f)

    # ------------------------------------------------------------------
    # Phase 4E: Full statistical summary
    # ------------------------------------------------------------------
    import functools
    @functools.lru_cache(maxsize=32)
    def generate_statistics(
        self, run_id: Optional[int] = None, config_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Compute Mean, Median, Min, Max, StdDev, Variance, P50, P95, P99
        and 95% bootstrap confidence intervals for every metric."""

        where_clauses = []
        params: list = []
        if run_id is not None:
            where_clauses.append("run_id = ?")
            params.append(run_id)
        if config_id is not None:
            where_clauses.append("config_id = ?")
            params.append(config_id)

        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM optimization_metrics{where_sql}", params)
            rows = cursor.fetchall()

        if not rows:
            return {}

        result: Dict[str, Any] = {"sample_size": len(rows)}

        for m in self.ALL_METRICS:
            data = [r[m] for r in rows if r[m] is not None]
            if not data:
                continue

            n = len(data)
            mean = statistics.mean(data)
            stdev = statistics.stdev(data) if n > 1 else 0.0
            variance = statistics.variance(data) if n > 1 else 0.0

            # Bootstrap 95% CI for the mean (1000 resamples)
            ci_low, ci_high = self._bootstrap_ci(data, n_resamples=1000, confidence=0.95)

            result[m] = {
                "mean":     round(mean, 6),
                "median":   round(statistics.median(data), 6),
                "min":      round(min(data), 6),
                "max":      round(max(data), 6),
                "stdev":    round(stdev, 6),
                "variance": round(variance, 6),
                "cv_pct":   round((stdev / mean * 100), 2) if mean else 0.0,
                "p50":      round(self._percentile(data, 0.50), 6),
                "p95":      round(self._percentile(data, 0.95), 6),
                "p99":      round(self._percentile(data, 0.99), 6),
                "ci_95":    [round(ci_low, 6), round(ci_high, 6)],
                "n":        n,
            }

        return result

    # ------------------------------------------------------------------
    # Bootstrap confidence interval
    # ------------------------------------------------------------------
    @staticmethod
    def _bootstrap_ci(
        data: List[float], n_resamples: int = 1000, confidence: float = 0.95
    ) -> Tuple[float, float]:
        """Compute a bootstrap confidence interval for the mean."""
        rng = random.Random(12345)  # deterministic for reproducibility
        means: List[float] = []
        n = len(data)
        for _ in range(n_resamples):
            sample = rng.choices(data, k=n)
            means.append(sum(sample) / n)
        means.sort()
        alpha = (1 - confidence) / 2
        lo = int(alpha * n_resamples)
        hi = int((1 - alpha) * n_resamples) - 1
        return means[lo], means[hi]

    # ------------------------------------------------------------------
    # Phase 4C: Statistical significance for A/B comparisons
    # ------------------------------------------------------------------
    @functools.lru_cache(maxsize=32)
    def compare_configs(
        self,
        baseline_config_id: int,
        challenger_config_id: int,
        experiment_name: str = "auto",
        run_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Compare two optimizer configurations with statistical rigour.
        Computes: effect size, confidence intervals, win/loss %, and
        statistical significance via bootstrap hypothesis testing.
        """
        base_stats = self.generate_statistics(run_id=run_id, config_id=baseline_config_id)
        chall_stats = self.generate_statistics(run_id=run_id, config_id=challenger_config_id)

        # Also need raw per-scenario values for win/loss and effect size
        base_rows = self._fetch_metric_rows(baseline_config_id, run_id)
        chall_rows = self._fetch_metric_rows(challenger_config_id, run_id)

        comparison: Dict[str, Any] = {}
        for metric in self.ALL_METRICS:
            if metric not in base_stats or metric not in chall_stats:
                continue

            b = base_stats[metric]
            c = chall_stats[metric]
            delta = c["mean"] - b["mean"]
            pct_change = (delta / b["mean"] * 100) if b["mean"] else 0

            # Cohen's d effect size
            pooled_std = math.sqrt((b["stdev"] ** 2 + c["stdev"] ** 2) / 2) if (b["stdev"] or c["stdev"]) else 1
            effect_size = delta / pooled_std if pooled_std else 0

            # Win/Loss from paired scenarios
            b_vals = [r.get(metric, 0) for r in base_rows]
            c_vals = [r.get(metric, 0) for r in chall_rows]
            min_len = min(len(b_vals), len(c_vals))
            wins = sum(1 for i in range(min_len) if c_vals[i] > b_vals[i])
            losses = sum(1 for i in range(min_len) if c_vals[i] < b_vals[i])
            ties = min_len - wins - losses
            win_pct = wins / min_len * 100 if min_len else 0

            # Bootstrap significance test
            p_value = self._bootstrap_significance(b_vals[:min_len], c_vals[:min_len])
            
            effect_size_interp = "large" if abs(effect_size) > 0.8 else ("medium" if abs(effect_size) > 0.5 else ("small" if abs(effect_size) > 0.2 else "none"))

            comparison[metric] = {
                "baseline_mean":      b["mean"],
                "challenger_mean":    c["mean"],
                "delta":              round(delta, 6),
                "pct_change":         round(pct_change, 4),
                "effect_size":        round(effect_size, 4),
                "effect_size_category": effect_size_interp,
                "baseline_ci_95":     b["ci_95"],
                "challenger_ci_95":   c["ci_95"],
                "wins":               wins,
                "losses":             losses,
                "ties":               ties,
                "win_pct":            round(win_pct, 2),
                "p_value":            p_value,
                "statistically_significant": False, # Placeholder, will be updated by FDR
            }

        # Apply False Discovery Rate (Benjamini-Hochberg) correction
        p_vals = [(m, comparison[m]["p_value"]) for m in comparison]
        p_vals.sort(key=lambda x: x[1])
        m_count = len(p_vals)
        alpha = 0.05
        for rank, (metric, p) in enumerate(p_vals, 1):
            if p <= (rank / m_count) * alpha:
                comparison[metric]["statistically_significant"] = True
            else:
                # Once one fails, the rest fail in step-up (technically BH is step-down from largest, but this is a simplified safe threshold)
                break
        
        # Proper BH step-down from highest p-value
        thresholds = [(rank / m_count) * alpha for rank in range(1, m_count + 1)]
        max_significant_rank = 0
        for rank, (metric, p) in enumerate(p_vals, 1):
            if p <= thresholds[rank-1]:
                max_significant_rank = rank
        
        for rank, (metric, p) in enumerate(p_vals, 1):
            comparison[metric]["statistically_significant"] = (rank <= max_significant_rank)

        payload = json.dumps(comparison)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO experiment_results "
                "(experiment_name, baseline_config_id, challenger_config_id, analysis_payload) "
                "VALUES (?, ?, ?, ?)",
                (experiment_name, baseline_config_id, challenger_config_id, payload),
            )

        return comparison

    def _fetch_metric_rows(
        self, config_id: int, run_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        where = "config_id = ?"
        params: list = [config_id]
        if run_id is not None:
            where += " AND run_id = ?"
            params.append(run_id)

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT * FROM optimization_metrics WHERE {where} ORDER BY scenario_id",
                params,
            )
            return [dict(row) for row in cursor.fetchall()]

    def _bootstrap_significance(
        baseline: List[float], challenger: List[float], n_resamples: int = 2000
    ) -> float:
        """
        Permutation-based test for whether the difference in means
        is statistically significant. Returns the p-value.
        """
        if not baseline or not challenger:
            return 1.0

        observed_diff = sum(challenger)/len(challenger) - sum(baseline)/len(baseline)
        combined = baseline + challenger
        n = len(baseline)
        rng = random.Random(54321)
        count_extreme = 0

        for _ in range(n_resamples):
            rng.shuffle(combined)
            perm_diff = (sum(combined[:n]) - sum(combined[n:])) / n
            if abs(perm_diff) >= abs(observed_diff):
                count_extreme += 1

        p_value = count_extreme / n_resamples
        return p_value

    # ------------------------------------------------------------------
    # Phase 4C: Regression Protection
    # ------------------------------------------------------------------
    def check_regression(
        self,
        production_config_id: int,
        candidate_config_id: int,
        run_id: Optional[int] = None,
        runtime_tolerance: float = 1.50,  # allow up to 50% runtime increase
    ) -> Tuple[bool, List[str]]:
        """
        Check whether a candidate configuration regresses on protected metrics.
        Returns (safe: bool, violations: list of strings).
        """
        prod = self.generate_statistics(run_id=run_id, config_id=production_config_id)
        cand = self.generate_statistics(run_id=run_id, config_id=candidate_config_id)

        violations: List[str] = []

        for metric, direction in self.REGRESSION_PROTECTED.items():
            if metric not in prod or metric not in cand:
                continue

            p_mean = prod[metric]["mean"]
            c_mean = cand[metric]["mean"]

            if direction == "higher_is_better":
                if c_mean < p_mean:
                    violations.append(
                        f"{metric}: candidate {c_mean:.4f} < production {p_mean:.4f}"
                    )
            elif direction == "lower_is_better":
                threshold = p_mean * runtime_tolerance
                if c_mean > threshold:
                    violations.append(
                        f"{metric}: candidate {c_mean:.4f} > {runtime_tolerance:.0%} of production {p_mean:.4f}"
                    )

        # Also check solver success rate
        prod_rows = self._fetch_metric_rows(production_config_id, run_id)
        cand_rows = self._fetch_metric_rows(candidate_config_id, run_id)
        prod_success = sum(1 for r in prod_rows if r.get("solver_status") in ("OPTIMAL", "FEASIBLE")) / max(len(prod_rows), 1)
        cand_success = sum(1 for r in cand_rows if r.get("solver_status") in ("OPTIMAL", "FEASIBLE")) / max(len(cand_rows), 1)
        if cand_success < prod_success:
            violations.append(
                f"solver_success_rate: candidate {cand_success:.2%} < production {prod_success:.2%}"
            )

        return len(violations) == 0, violations

    # ------------------------------------------------------------------
    # Phase 4D: Sensitivity Analysis
    # ------------------------------------------------------------------
    def sensitivity_analysis(self, run_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Measure how sensitive the objective score and runtime are to
        scenario metadata (family_size, trip_duration, category).
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            where = f"WHERE m.run_id = {run_id}" if run_id else ""
            cursor.execute(f"""
                SELECT
                    s.category,
                    s.family_size,
                    s.trip_duration_days,
                    s.num_pois,
                    m.objective_score,
                    m.runtime_seconds,
                    m.hard_constraint_sat_pct,
                    m.fatigue_score,
                    m.satisfaction_score
                FROM optimization_metrics m
                JOIN benchmark_scenarios s ON m.scenario_id = s.id
                {where}
            """)
            rows = cursor.fetchall()

        if not rows:
            return {}

        # Group by category
        by_category: Dict[str, List[Dict]] = {}
        by_family_size: Dict[int, List[Dict]] = {}
        by_duration: Dict[int, List[Dict]] = {}

        for r in rows:
            d = dict(r)
            cat = d["category"]
            by_category.setdefault(cat, []).append(d)
            by_family_size.setdefault(d["family_size"], []).append(d)
            by_duration.setdefault(d["trip_duration_days"], []).append(d)

        def _summarize(groups, key_name):
            result = {}
            for key, items in sorted(groups.items()):
                objs = [i["objective_score"] for i in items if i["objective_score"]]
                rts = [i["runtime_seconds"] for i in items if i["runtime_seconds"]]
                sats = [i["hard_constraint_sat_pct"] for i in items if i["hard_constraint_sat_pct"] is not None]
                result[str(key)] = {
                    "count": len(items),
                    "objective_mean": round(statistics.mean(objs), 4) if objs else 0,
                    "objective_stdev": round(statistics.stdev(objs), 4) if len(objs) > 1 else 0,
                    "runtime_mean": round(statistics.mean(rts), 4) if rts else 0,
                    "constraint_sat_mean": round(statistics.mean(sats), 4) if sats else 0,
                }
            return result

        return {
            "by_category": _summarize(by_category, "category"),
            "by_family_size": _summarize(by_family_size, "family_size"),
            "by_trip_duration": _summarize(by_duration, "trip_duration_days"),
        }

    # ------------------------------------------------------------------
    # Leaderboard
    # ------------------------------------------------------------------
    def generate_leaderboard(self) -> List[Dict[str, Any]]:
        """Rank optimizer configurations by composite score."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    c.id as config_id,
                    c.config_name,
                    COUNT(*)                     as runs,
                    AVG(m.objective_score)        as avg_objective,
                    AVG(m.runtime_seconds)        as avg_runtime,
                    AVG(m.hard_constraint_sat_pct) as avg_hard_sat,
                    AVG(m.soft_constraint_sat_pct) as avg_soft_sat,
                    AVG(m.satisfaction_score)      as avg_satisfaction,
                    AVG(m.fatigue_score)           as avg_fatigue,
                    AVG(m.accessibility_score)     as avg_accessibility,
                    SUM(CASE WHEN m.solver_status IN ('OPTIMAL','FEASIBLE') THEN 1 ELSE 0 END) as successes
                FROM optimization_metrics m
                JOIN optimizer_configurations c ON m.config_id = c.id
                GROUP BY c.id, c.config_name
                ORDER BY avg_objective DESC, avg_runtime ASC
            """)
            rows = cursor.fetchall()

        leaderboard = []
        for rank, row in enumerate(rows, 1):
            total = row["runs"] or 1
            leaderboard.append({
                "rank":                    rank,
                "config_id":               row["config_id"],
                "config_name":             row["config_name"],
                "total_runs":              row["runs"],
                "avg_objective":           round(row["avg_objective"] or 0, 4),
                "avg_runtime":             round(row["avg_runtime"] or 0, 4),
                "success_rate":            round((row["successes"] or 0) / total * 100, 2),
                "avg_hard_constraint_sat": round((row["avg_hard_sat"] or 0) * 100, 2),
                "avg_soft_constraint_sat": round((row["avg_soft_sat"] or 0) * 100, 2),
                "avg_satisfaction":        round(row["avg_satisfaction"] or 0, 4),
                "avg_fatigue":             round(row["avg_fatigue"] or 0, 4),
                "avg_accessibility":       round(row["avg_accessibility"] or 0, 4),
            })

        return leaderboard


if __name__ == "__main__":
    db_file = os.path.join(os.path.dirname(__file__), "benchmark.db")
    if os.path.exists(db_file):
        analyzer = BenchmarkAnalyzer(db_file)
        print("=== Leaderboard ===")
        lb = analyzer.generate_leaderboard()
        for entry in lb:
            print(
                f"  {entry['rank']}. {entry['config_name']} | "
                f"Obj: {entry['avg_objective']} | "
                f"Runtime: {entry['avg_runtime']}s | "
                f"Success: {entry['success_rate']}% | "
                f"Hard Sat: {entry['avg_hard_constraint_sat']}%"
            )
