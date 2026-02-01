# 🏗️ Agent System Architecture Deep Dive

**Version**: 1.0  
**Date**: January 31, 2026

---

## System Overview

The Voyageur Agent System is an **event-driven orchestration layer** that coordinates your existing optimizer and explainability pipeline. It follows a clean separation of concerns where each agent has a single, well-defined responsibility.

### Core Principle

> **Agents do not optimize. Agents do not explain.**  
> **Agents decide *when* to call tools.**

Your optimizer and explainability stack already do the hard thinking. The agent layer handles orchestration + policy decisions.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│                    (Website / Chat / API)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Controller                            │
│                   (Orchestration Layer)                         │
│                                                                 │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Feedback    │→ │   Decision   │→ │  Optimizer   │       │
│  │     Agent     │  │ Policy Agent │  │    Agent     │       │
│  │   (Gemini)    │  │ (Rule-based) │  │  (Wrapper)   │       │
│  └───────────────┘  └──────────────┘  └──────┬───────┘       │
│                                               │                 │
│                                               ▼                 │
│                                        ┌──────────────┐         │
│                                        │Explainability│         │
│                                        │    Agent     │         │
│                                        │   (Gemini)   │         │
│                                        └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Existing Optimizer System                     │
│                (CP-SAT, Explainability Pipeline)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Four Agents

### 1. Feedback Agent (LLM-Powered)

**Role**: Natural Language → Structured Events

**Technology**: Google Gemini API

**Input Example**:
```
"We loved Akshardham, we definitely want to visit it tomorrow."
```

**Output Example**:
```json
{
  "agent": "FeedbackAgent",
  "family_id": "FAM_B",
  "event_type": "MUST_VISIT_ADDED",
  "poi_id": "LOC_006",
  "poi_name": "Akshardham Temple",
  "confidence": "HIGH",
  "raw_input": "..."
}
```

**Key Characteristics**:
- Only place where free-form language enters
- No downstream calls
- Pure extraction + normalization
- Validates output against Pydantic schema
- Falls back to keyword matching if no API key

---

### 2. Decision/Policy Agent (Rule-Based)

**Role**: Event → Action Decision

**Technology**: Pure Python (no LLM)

**Input**: FeedbackEvent from Feedback Agent

**Output**:
```json
{
  "agent": "DecisionPolicyAgent",
  "action": "RUN_OPTIMIZER",
  "reason": "Hard constraint changed: MUST_VISIT_ADDED",
  "requires_approval": false
}
```

**Decision Logic**:

| Event Type | Action | Rationale |
|------------|--------|-----------|
| `MUST_VISIT_ADDED`<br>`NEVER_VISIT_ADDED` | `RUN_OPTIMIZER` | Hard constraint changed |
| `POI_RATING`<br>`DAY_RATING` | `UPDATE_PREFERENCES_ONLY` | Soft preference |
| `DELAY_REPORTED`<br>`TRANSPORT_ISSUE` | `NO_ACTION` | Acknowledged, not yet handled |

**Key Characteristics**:
- Deterministic, fast, predictable
- No machine learning
- Easy to debug and extend
- This is the "brainstem" of the system

---

### 3. Optimizer Agent (Wrapper)

**Role**: Thin adapter around existing optimizer

**Technology**: Python wrapper

**Responsibilities**:
- Accept updated preferences/constraints
- Call existing optimizer code
- Return paths to generated files

**Output**:
```python
{
  "optimized_solution": Path("optimized_solution.json"),
  "decision_traces": Path("decision_traces.json"),
  "enriched_diffs": Path("enriched_diffs.json")
}
```

**Key Characteristics**:
- No new optimizer implementation
- Just connects existing code
- Handles file I/O and paths
- Stateless (each run is independent)

---

### 4. Explainability Agent (LLM-Powered)

**Role**: Decision Payloads → Human-Readable Text

**Technology**: Google Gemini API

**Input**: Decision payload from explainability pipeline
```json
{
  "change_type": "visit_added",
  "poi_name": "Akshardham Temple",
  "day": 2,
  "reason": "User expressed strong interest",
  "details": {"preference_score": 9.2}
}
```

**Output**:
```
"Added Akshardham Temple to Day 2 visit list because family 
preference score increased to 9.2/10 after positive feedback."
```

**Key Characteristics**:
- Processes one payload at a time
- Never infers causality beyond payload
- Concise, actionable summaries
- Falls back to templates if no API key

---

## The Orchestration Flow

The Agent Controller implements a **linear, deterministic pipeline**:

```
┌─────────────────┐
│   User Input    │  "We loved Akshardham..."
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Feedback Agent  │  Parse → Structured Event
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Policy Agent   │  Event → Decision (Action)
└────────┬────────┘
         │
         ▼
    [Decision?]
         │
         ├─→ RUN_OPTIMIZER
         │      │
         │      ▼
         │  ┌─────────────────┐
         │  │ Optimizer Agent │  Run optimizer
         │  └────────┬────────┘
         │           │
         │           ▼
         │  ┌─────────────────┐
         │  │Explainability   │  Generate summaries
         │  │     Agent       │
         │  └────────┬────────┘
         │           │
         │           ▼
         │      [Summary Text]
         │
         ├─→ UPDATE_PREFERENCES_ONLY
         │      → Acknowledge
         │
         └─→ NO_ACTION
                → Log & Skip
```

**No loops. No autonomy. No racing conditions.**

---

## Design Decisions

### Why Event-Driven?

- **Testability**: Each stage can be tested independently
- **Observability**: Clear logging at each step
- **Extensibility**: Easy to add new event types or actions
- **Debuggability**: Linear flow is easy to trace

### Why No LangGraph (Yet)?

LangGraph adds value when you need:
- Multiple competing agents
- Approval workflows
- Retries and escalation
- Background loops

Right now, the flow is **linear and obvious**. Plain Python is clearer and safer. You can migrate to LangGraph later when you add:
- Hive Mind (multiple families coordinating)
- User approval for high-impact changes
- Autonomous monitoring and recovery

### Why Pydantic Schemas?

- **Type Safety**: Catch errors at runtime
- **Validation**: Ensure data integrity across boundaries
- **Documentation**: Self-documenting data structures
- **IDE Support**: Autocomplete and type hints

### Why Demo Mode?

- **Development**: Work without API key during testing
- **CI/CD**: Run tests without secrets
- **Fallback**: Graceful degradation if API fails
- **Cost Control**: Don't burn API credits during development

---

## Responsibilities Matrix

| Agent | Sees | Decides | Calls | Output |
|-------|------|---------|-------|--------|
| **Feedback** | User text | Nothing | Gemini API | Structured event |
| **Policy** | Event | Action type | Nothing | Action command |
| **Optimizer** | Preferences | Nothing | Your optimizer | File paths |
| **Explainability** | Payload | Nothing | Gemini API | Text summary |
| **Controller** | Everything | Flow logic | All agents | Complete result |

**Clear separation → Easy testing → Reliable system**

---

## Extension Points

### Adding New Event Types

1. Add to `EventType` enum in `schemas.py`
2. Update Gemini prompt in `feedback_agent.py`
3. Add decision rule in `decision_policy_agent.py`

```python
# schemas.py
class EventType(str, Enum):
    # ... existing types
    WEATHER_ALERT = "WEATHER_ALERT"  # New!

# decision_policy_agent.py
REAL_TIME_EVENTS = {
    EventType.DELAY_REPORTED,
    EventType.TRANSPORT_ISSUE,
    EventType.WEATHER_ALERT  # New!
}
```

### Adding Approval Workflows

```python
# decision_policy_agent.py
def decide(self, event: FeedbackEvent) -> PolicyDecision:
    # High-impact changes require approval
    if event.event_type == EventType.MUST_VISIT_ADDED:
        if self._is_high_impact(event):
            return PolicyDecision(
                action=ActionType.RUN_OPTIMIZER,
                reason="High-impact change detected",
                requires_approval=True  # ← New flag
            )
```

### Adding Multi-Agent Competition

```python
# Multiple agents propose solutions, best one wins
solutions = [
    optimizer_agent_v1.run(),
    optimizer_agent_v2.run(),
    optimizer_agent_ml.run()
]

best_solution = judge_agent.select_best(solutions)
```

**This is where LangGraph becomes useful.**

---

## Performance Characteristics

### Latency Breakdown (Estimated)

| Stage | Time | Bottleneck |
|-------|------|------------|
| Feedback Agent | 1-2s | Gemini API call |
| Policy Agent | <10ms | Pure Python |
| Optimizer Agent | 2-10s | CP-SAT solving |
| Explainability Agent | 1-2s | Gemini API call |
| **Total** | **4-15s** | Optimizer + LLM calls |

### Optimization Opportunities

1. **Parallel LLM Calls**: Run Feedback + Explainability concurrently
2. **Streaming**: Stream explanations as they're generated
3. **Caching**: Cache Gemini responses for similar inputs
4. **Async**: Make controller fully async

---

## Error Handling Strategy

### Graceful Degradation

```python
# If Gemini fails → Fall back to demo mode
# If optimizer fails → Return last known solution
# If parsing fails → Return UNKNOWN event + LOW confidence
```

### Validation at Boundaries

```python
# Every agent output is validated by Pydantic
event = FeedbackEvent(**parsed_data)  # Throws if invalid
```

### Comprehensive Logging

```python
# Every stage logs:
# - Input received
# - Decision made
# - Output generated
# - Errors encountered
```

---

## Testing Strategy

### Unit Tests (Per Agent)

```bash
python -m agents.feedback_agent     # Test Gemini integration
python -m agents.decision_policy_agent  # Test decision rules
```

### Integration Tests (Controller)

```bash
python -m agents.agent_controller  # Test full pipeline
```

### End-to-End (Demo)

```bash
python agents/demo.py  # Interactive scenarios
```

---

## Future Roadmap

### Phase 1: MVP (Current)
- ✅ Linear pipeline
- ✅ 4 core agents
- ✅ Demo mode
- ✅ Documentation

### Phase 2: Production Ready
- ⬜ REST API
- ⬜ Authentication
- ⬜ Rate limiting
- ⬜ Monitoring

### Phase 3: Advanced Features
- ⬜ Hive Mind (multi-family coordination)
- ⬜ Approval workflows
- ⬜ Background monitoring
- ⬜ LangGraph migration

### Phase 4: Scale
- ⬜ Async everywhere
- ⬜ Distributed tracing
- ⬜ Multi-tenant
- ⬜ A/B testing framework

---

## File Structure

```
agents/
├── __init__.py                 # Package init
├── config.py                   # Configuration management
├── schemas.py                  # Pydantic models
├── feedback_agent.py           # NLP parser
├── decision_policy_agent.py    # Decision logic
├── optimizer_agent.py          # Optimizer wrapper
├── explainability_agent.py     # Explanation generator
├── agent_controller.py         # Orchestration layer
├── demo.py                     # Demo script
└── Documentation/
    ├── QUICK_START_GUIDE.md
    ├── AGENT_API_REFERENCE.md
    ├── WEBSITE_INTEGRATION_GUIDE.md
    └── AGENT_ARCHITECTURE.md (this file)
```

---

**Philosophy**: Keep each agent stupid-but-correct. The *system* will look smart.

This is how real-world agentic systems are built.
