import sqlite3
import json
from typing import Dict, Any, List

class BenchmarkDB:
    def __init__(self, db_path: str = "benchmark.db"):
        self.db_path = db_path
        
    def init_db(self, schema_path: str):
        with open(schema_path, 'r') as f:
            schema = f.read()
            
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript(schema)
            
    def record_run(self, seed: int, opt_version: str, dataset_version: str, git_hash: str, suite_version: str) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO benchmark_runs (random_seed, optimizer_version, dataset_version, git_hash, benchmark_suite_version) VALUES (?, ?, ?, ?, ?)",
                (seed, opt_version, dataset_version, git_hash, suite_version)
            )
            return cursor.lastrowid
            
    def record_scenario(self, run_id: int, scenario_id: str, category: str, num_pois: int, num_hotels: int, family_size: int, duration: int) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO benchmark_scenarios (run_id, scenario_id, category, num_pois, num_hotels, family_size, trip_duration_days) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (run_id, scenario_id, category, num_pois, num_hotels, family_size, duration)
            )
            return cursor.lastrowid
            
    def record_config(self, config_name: str, alpha: float, beta: float, gamma: float, fatigue: bool, time_windows: bool, walking: bool, priorities: dict) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO optimizer_configurations (config_name, alpha, beta, gamma, fatigue_enabled, time_windows_enabled, walking_enabled, constraint_priorities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (config_name, alpha, beta, gamma, fatigue, time_windows, walking, json.dumps(priorities))
            )
            return cursor.lastrowid
            
    def record_metrics(self, run_id: int, scenario_id: int, config_id: int, metrics: Dict[str, Any]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO optimization_metrics (
                    run_id, scenario_id, config_id,
                    runtime_seconds, cpu_time_seconds, memory_mb, objective_score, solver_status,
                    travel_distance_km, walking_distance_km, travel_time_min, hotel_cost,
                    activities_completed, activities_skipped, unused_time_min, itinerary_density,
                    hard_constraint_sat_pct, soft_constraint_sat_pct, soft_constraints_relaxed, relaxed_constraints, dropped_constraints,
                    satisfaction_score, budget_adherence, accessibility_score, fatigue_score, time_window_compliance,
                    solver_optimality_gap, candidate_pois_evaluated, itinerary_utilization_pct, total_waiting_time_min,
                    avg_travel_time_min, preference_coverage_pct, budget_utilization_pct, schedule_efficiency_pct, travel_efficiency_pct
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id, scenario_id, config_id,
                    metrics.get('runtime_seconds', 0), metrics.get('cpu_time_seconds', 0), metrics.get('memory_used_mb', 0), metrics.get('objective_score', 0), metrics.get('solver_status', 'UNKNOWN'),
                    metrics.get('travel_distance_km', 0), metrics.get('walking_distance_km', 0), metrics.get('travel_time_min', 0), metrics.get('hotel_cost', 0),
                    metrics.get('activities_scheduled', 0), metrics.get('activities_skipped', 0), metrics.get('unused_time_min', 0), metrics.get('itinerary_density', 0),
                    metrics.get('constraint_satisfaction_rate', 1.0), metrics.get('soft_constraint_sat_pct', 1.0), metrics.get('soft_constraints_relaxed', 0), json.dumps(metrics.get('relaxed_constraints', [])), json.dumps(metrics.get('dropped_constraints', [])),
                    metrics.get('satisfaction_score', 0), metrics.get('budget_adherence', 1.0), metrics.get('accessibility_score', 1.0), metrics.get('fatigue_score', 0), metrics.get('time_window_compliance', 1.0),
                    metrics.get('solver_optimality_gap', 0), metrics.get('candidate_pois_evaluated', 0), metrics.get('itinerary_utilization_pct', 0), metrics.get('total_waiting_time_min', 0),
                    metrics.get('avg_travel_time_min', 0), metrics.get('preference_coverage_pct', 0), metrics.get('budget_utilization_pct', 0), metrics.get('schedule_efficiency_pct', 0), metrics.get('travel_efficiency_pct', 0)
                )
            )
            
    def fetch_all_metrics(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM optimization_metrics")
            return [dict(row) for row in cursor.fetchall()]
