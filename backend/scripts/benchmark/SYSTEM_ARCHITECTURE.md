# MerYDiaN System Architecture

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
