CREATE TABLE IF NOT EXISTS benchmark_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    random_seed INTEGER,
    optimizer_version TEXT,
    dataset_version TEXT,
    git_hash TEXT,
    benchmark_suite_version TEXT
);

CREATE TABLE IF NOT EXISTS benchmark_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    scenario_id TEXT,
    category TEXT,
    num_pois INTEGER,
    num_hotels INTEGER,
    family_size INTEGER,
    trip_duration_days INTEGER,
    FOREIGN KEY(run_id) REFERENCES benchmark_runs(id)
);

CREATE TABLE IF NOT EXISTS optimizer_configurations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_name TEXT,
    alpha REAL,
    beta REAL,
    gamma REAL,
    fatigue_enabled BOOLEAN,
    time_windows_enabled BOOLEAN,
    walking_enabled BOOLEAN,
    constraint_priorities TEXT -- JSON string
);

CREATE TABLE IF NOT EXISTS optimization_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    scenario_id INTEGER,
    config_id INTEGER,
    
    -- Solver
    runtime_seconds REAL,
    cpu_time_seconds REAL,
    memory_mb REAL,
    objective_score REAL,
    solver_status TEXT,
    
    -- Optimization
    travel_distance_km REAL,
    walking_distance_km REAL,
    travel_time_min REAL,
    hotel_cost REAL,
    activities_completed INTEGER,
    activities_skipped INTEGER,
    unused_time_min REAL,
    itinerary_density REAL,
    
    -- Constraints
    hard_constraint_sat_pct REAL,
    soft_constraint_sat_pct REAL,
    soft_constraints_relaxed INTEGER,
    relaxed_constraints TEXT, -- JSON string
    dropped_constraints TEXT, -- JSON string
    
    -- Quality
    satisfaction_score REAL,
    budget_adherence REAL,
    accessibility_score REAL,
    fatigue_score REAL,
    time_window_compliance REAL,
    solver_optimality_gap REAL,
    candidate_pois_evaluated INTEGER,
    itinerary_utilization_pct REAL,
    total_waiting_time_min REAL,
    avg_travel_time_min REAL,
    preference_coverage_pct REAL,
    budget_utilization_pct REAL,
    schedule_efficiency_pct REAL,
    travel_efficiency_pct REAL,
    
    FOREIGN KEY(run_id) REFERENCES benchmark_runs(id),
    FOREIGN KEY(scenario_id) REFERENCES benchmark_scenarios(id),
    FOREIGN KEY(config_id) REFERENCES optimizer_configurations(id)
);

CREATE TABLE IF NOT EXISTS experiment_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_name TEXT,
    baseline_config_id INTEGER,
    challenger_config_id INTEGER,
    analysis_payload TEXT, -- JSON string containing statistical comparisons
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(baseline_config_id) REFERENCES optimizer_configurations(id),
    FOREIGN KEY(challenger_config_id) REFERENCES optimizer_configurations(id)
);
