import time
import os
from dataclasses import dataclass, field
from typing import Dict, Any, List

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

@dataclass
class OptimizationMetrics:
    runtime_seconds: float = 0.0
    cpu_time_seconds: float = 0.0
    memory_used_mb: float = 0.0
    solver_status: str = "UNKNOWN"
    objective_score: float = 0.0
    constraint_satisfaction_rate: float = 1.0
    travel_distance_km: float = 0.0
    travel_time_min: float = 0.0
    hotel_cost: float = 0.0
    activities_scheduled: int = 0
    activities_skipped: int = 0
    cache_hit_rate: float = 0.0
    satisfaction_score: float = 0.0
    solver_optimality_gap: float = 0.0
    soft_constraints_relaxed: int = 0
    candidate_pois_evaluated: int = 0
    itinerary_utilization_pct: float = 0.0
    total_waiting_time_min: float = 0.0
    avg_travel_time_min: float = 0.0
    preference_coverage_pct: float = 0.0
    budget_utilization_pct: float = 0.0
    schedule_efficiency_pct: float = 0.0
    travel_efficiency_pct: float = 0.0
    
class OptimizationMetricsCollector:
    """
    Dedicated collector for AI optimization metrics.
    Ensures measurements are strictly separated from optimization logic.
    """
    def __init__(self):
        self.start_time = 0.0
        self.start_cpu = 0.0
        self.start_memory = 0.0
        self.metrics = OptimizationMetrics()
        
    def start_measurement(self):
        """Starts timing and resource profiling."""
        self.start_time = time.time()
        self.start_cpu = time.process_time()
        if HAS_PSUTIL:
            process = psutil.Process(os.getpid())
            self.start_memory = process.memory_info().rss / (1024 * 1024)
        
    def stop_measurement(self, solver_status: str, objective_score: float):
        """Stops timing and records core solver metrics."""
        self.metrics.runtime_seconds = time.time() - self.start_time
        self.metrics.cpu_time_seconds = time.process_time() - self.start_cpu
        if HAS_PSUTIL:
            process = psutil.Process(os.getpid())
            end_memory = process.memory_info().rss / (1024 * 1024)
            self.metrics.memory_used_mb = max(0.0, end_memory - self.start_memory)
        self.metrics.solver_status = solver_status
        self.metrics.objective_score = float(objective_score)
        
    def record_solution_details(self, 
                                travel_distance_km: float, 
                                travel_time_min: float,
                                hotel_cost: float,
                                activities_scheduled: int,
                                activities_skipped: int,
                                constraint_satisfaction: float = 1.0,
                                cache_hit_rate: float = 0.0,
                                satisfaction_score: float = 0.0,
                                solver_optimality_gap: float = 0.0,
                                soft_constraints_relaxed: int = 0,
                                candidate_pois_evaluated: int = 0,
                                itinerary_utilization_pct: float = 0.0,
                                total_waiting_time_min: float = 0.0,
                                avg_travel_time_min: float = 0.0,
                                preference_coverage_pct: float = 0.0,
                                budget_utilization_pct: float = 0.0,
                                schedule_efficiency_pct: float = 0.0,
                                travel_efficiency_pct: float = 0.0):
        """Records business metrics derived from the solution."""
        self.metrics.travel_distance_km = float(travel_distance_km)
        self.metrics.travel_time_min = float(travel_time_min)
        self.metrics.hotel_cost = float(hotel_cost)
        self.metrics.activities_scheduled = int(activities_scheduled)
        self.metrics.activities_skipped = int(activities_skipped)
        self.metrics.constraint_satisfaction_rate = float(constraint_satisfaction)
        self.metrics.cache_hit_rate = float(cache_hit_rate)
        self.metrics.satisfaction_score = float(satisfaction_score)
        self.metrics.solver_optimality_gap = float(solver_optimality_gap)
        self.metrics.soft_constraints_relaxed = int(soft_constraints_relaxed)
        self.metrics.candidate_pois_evaluated = int(candidate_pois_evaluated)
        self.metrics.itinerary_utilization_pct = float(itinerary_utilization_pct)
        self.metrics.total_waiting_time_min = float(total_waiting_time_min)
        self.metrics.avg_travel_time_min = float(avg_travel_time_min)
        self.metrics.preference_coverage_pct = float(preference_coverage_pct)
        self.metrics.budget_utilization_pct = float(budget_utilization_pct)
        self.metrics.schedule_efficiency_pct = float(schedule_efficiency_pct)
        self.metrics.travel_efficiency_pct = float(travel_efficiency_pct)
        
    def get_metrics_dict(self) -> Dict[str, Any]:
        """Returns the metrics as a dictionary."""
        return self.metrics.__dict__
