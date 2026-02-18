# Demo Run File Usage Report

This report outlines the files involved in the execution of `run_demo.py`. The demo orchestrates a complete flow from user feedback to itinerary optimization and explanation generation.

## 1. Entry Point
- **`run_demo.py`**: The main script that simulates user scenarios, invokes the agent controller, and orchestrates the demo flow.

## 2. Agent Framework (`agents/`)
These files define the autonomous agents that handle logic, decision making, and orchestration.

| File | Role |
|------|------|
| **`agent_controller.py`** | **Conductor**. Orchestrates the entire pipeline (Feedback → Decision → Optimizer → Explanation). |
| **`feedback_agent.py`** | **Parser**. Uses LLM to convert natural language input into structured `FeedbackEvent` objects. |
| **`decision_policy_agent.py`** | **Brain**. Deterministic rule-based agent that decides whether to run the optimizer or just update preferences. |
| **`optimizer_agent.py`** | **Bridge**. connects the agent system to the core ML/OR optimization logic. Handles data preparation and execution. |
| **`explainability_agent.py`** | **Translator**. Uses LLM to convert technical optimization changes into human-readable text. |

## 3. Core Utilities & Configuration (`agents/`)
Supporting files providing shared functionality.

| File | Role |
|------|------|
| **`config.py`** | Manages environment variables (API keys, paths). Loads `.env`. |
| **`schemas.py`** | Defines Pydantic models for type safety (`FeedbackEvent`, `PolicyDecision`, etc.). |
| **`llm_client.py`** | Provides a shared Groq client instance. |
| **`poi_mapper.py`** | Maps human-readable POI names (e.g., "Akshardham") to IDs ("LOC_006"). |
| **`preference_builder.py`** | Updates family preference JSON structures based on events. |
| **`transport_graph_modifier.py`** | Dynamically modifies the transport graph when transport disruptions are reported. |

## 4. Core Optimization Logic (`ml_or/`)
The heavy-lifting mathematical optimization and routing engine.

| File | Role |
|------|------|
| **`itinerary_optimizer.py`** | **Core Algorithm**. Performs the mathematical optimization (MIP/Heuristics) to generate itineraries. |

### Explainability Pipeline (`ml_or/explainability/`)
Logic to analyze *why* the itinerary changed.

| File | Role |
|------|------|
| **`diff_engine.py`** | Compares the baseline itinerary vs. the new optimized itinerary to find changes. |
| **`causal_tagger.py`** | Assigns "reasons" (tags) to changes (e.g., `INTEREST_VECTOR_DOMINANCE`, `METRO_UNAVAILABLE`). |
| **`delta_engine.py`** | Calculates cost and satisfaction metrics for the changes. |
| **`payload_builder.py`** | Formats the technical analysis into a clean JSON payload for the LLM. |

## 5. Data Files (`ml_or/data/`)
Static and dynamic data used during execution.

- **`locations.json`**: Database of all Points of Interest (POIs).
- **`transport_graph.json`**: Network graph defining connectivity between locations.
- **`base_itinerary_final.json`**: The starting point/skeleton itinerary.
- **`family_preferences_3fam_strict.json`**: default preferences for the families.

## 6. Generated Artifacts
Files created during the run (saved in `agents/tests/run_<timestamp>/`).

- `optimized_solution.json`: Final itinerary.
- `decision_traces.json`: Log of optimizer decisions.
- `enriched_diffs.json`: Detailed comparison of changes.
- `llm_payloads.json`: Data sent to the Explainability Agent.
- `family_preferences_updated.json`: Updated user preferences.

## 7. Verification of Specific Components

The user requested verification of specific components related to trip state management and geographic look-ahead.

### Trip Session Management
- **Files Checked**:
    - `ml_or/demos/reopt_hard_constraints/trip_session_manager.py`
    - `ml_or/demos/reopt_hard_constraints/trip_session_manager_disruption_methods.py`
    - `ml_or/demos/reopt_hard_constraints/feedback_processor.py`
- **Status**: **NOT USED** in `run_demo.py`.
- **Analysis**: The `OptimizerAgent` has support for a `session_manager` parameter, but `run_demo.py` (via `AgentController`) does **not** instantiate or pass a `TripSessionManager`. The logic for trip state management is present in the `ml_or` code but is dormant in this specific demo.

### POI Selector (`find_best_day_for_poi`)
- **Function**: `ItineraryOptimizer.find_best_day_for_poi` in `ml_or/itinerary_optimizer.py`.
- **Status**: **AVAILABLE BUT NOT CALLED** in `run_demo.py`.
- **Analysis**:
    - The function exists and is correctly implemented in `itinerary_optimizer.py`.
    - It is intended to be called within `OptimizerAgent.run` inside the "Geographic Look-Ahead" block.
    - However, this block is guarded by `if session_manager and trip_id and preferences:`.
    - Since `session_manager` is not passed by `AgentController`, this specific look-ahead logic—and thus `find_best_day_for_poi`—is **skipped** during the demo execution.
