# 📚 Agent System API Reference

**Version**: 1.0  
**Date**: January 31, 2026

---

## Table of Contents

1. [Schemas](#schemas)
2. [Feedback Agent](#feedback-agent)
3. [Decision/Policy Agent](#decisionpolicy-agent)
4. [Optimizer Agent](#optimizer-agent)
5. [Explainability Agent](#explainability-agent)
6. [Agent Controller](#agent-controller)

---

## Schemas

All data structures use Pydantic for type safety and validation.

### EventType (Enum)

```python
class EventType(str, Enum):
    MUST_VISIT_ADDED = "MUST_VISIT_ADDED"
    NEVER_VISIT_ADDED = "NEVER_VISIT_ADDED"
    POI_RATING = "POI_RATING"
    DAY_RATING = "DAY_RATING"
    DELAY_REPORTED = "DELAY_REPORTED"
    TRANSPORT_ISSUE = "TRANSPORT_ISSUE"
    UNKNOWN = "UNKNOWN"
```

### ConfidenceLevel (Enum)

```python
class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
```

### ActionType (Enum)

```python
class ActionType(str, Enum):
    RUN_OPTIMIZER = "RUN_OPTIMIZER"
    UPDATE_PREFERENCES_ONLY = "UPDATE_PREFERENCES_ONLY"
    NO_ACTION = "NO_ACTION"
```

### FeedbackEvent

Output from Feedback Agent.

```python
class FeedbackEvent(BaseModel):
    agent: str = "FeedbackAgent"
    family_id: Optional[str]  # e.g., "FAM_A", "FAM_B"
    event_type: EventType
    poi_id: Optional[str]  # e.g., "LOC_006"
    poi_name: Optional[str]
    rating: Optional[float]  # 0-10
    day: Optional[int]
    confidence: ConfidenceLevel
    raw_input: str
    metadata: Optional[Dict[str, Any]]
```

**Example:**
```json
{
  "agent": "FeedbackAgent",
  "family_id": "FAM_B",
  "event_type": "MUST_VISIT_ADDED",
  "poi_id": "LOC_006",
  "poi_name": "Akshardham Temple",
  "confidence": "HIGH",
  "raw_input": "We loved Akshardham, we definitely want to visit it tomorrow."
}
```

### PolicyDecision

Output from Decision/Policy Agent.

```python
class PolicyDecision(BaseModel):
    agent: str = "DecisionPolicyAgent"
    action: ActionType
    reason: str
    requires_approval: bool = False
    event_context: Optional[FeedbackEvent]
```

**Example:**
```json
{
  "agent": "DecisionPolicyAgent",
  "action": "RUN_OPTIMIZER",
  "reason": "Hard constraint changed: MUST_VISIT_ADDED",
  "requires_approval": false
}
```

### AgentExplanation

Output from Explainability Agent.

```python
class AgentExplanation(BaseModel):
    agent: str = "ExplainabilityAgent"
    summary: str
    payload_source: Optional[Dict[str, Any]]
```

**Example:**
```json
{
  "agent": "ExplainabilityAgent",
  "summary": "Added Akshardham Temple to Day 2 visit list because family preference score increased to 9.2/10 after positive feedback."
}
```

---

## Feedback Agent

### Class: `FeedbackAgent`

Converts natural language user input into structured events.

#### `__init__()`

Initializes the agent with Groq API.

```python
agent = FeedbackAgent()
```

**Behavior:**
- If `GROQ_API_KEY` is valid: Uses Groq for parsing
- If invalid or missing: Falls back to demo mode (keyword matching)

#### `parse(user_input: str, context: Optional[dict] = None) -> FeedbackEvent`

Parse user input into a structured event.

**Parameters:**
- `user_input` (str): Natural language text from the user
- `context` (dict, optional): Context dictionary with keys:
  - `family_id` (str): Family identifier
  - `current_day` (int): Current day number
  - `poi_candidates` (list): List of POI names/IDs for disambiguation

**Returns:**
- `FeedbackEvent`: Structured event object

**Example:**
```python
event = agent.parse(
    "We loved Akshardham, we definitely want to visit it tomorrow.",
    context={"family_id": "FAM_B", "current_day": 1}
)
print(event.event_type)  # MUST_VISIT_ADDED
print(event.confidence)  # HIGH
```

---

## Decision/Policy Agent

### Class: `DecisionPolicyAgent`

Deterministic decision-making based on event types (rule-based, no LLM).

#### `__init__()`

Initializes the agent.

```python
agent = DecisionPolicyAgent()
```

#### `decide(event: FeedbackEvent) -> PolicyDecision`

Make a decision based on the event type.

**Parameters:**
- `event` (FeedbackEvent): Event from Feedback Agent

**Returns:**
- `PolicyDecision`: Decision with action and reasoning

**Decision Logic:**

| Event Type | Action | Reason |
|------------|--------|--------|
| `MUST_VISIT_ADDED`, `NEVER_VISIT_ADDED` | `RUN_OPTIMIZER` | Hard constraint changed |
| `POI_RATING`, `DAY_RATING` | `UPDATE_PREFERENCES_ONLY` | Soft preference updated |
| `DELAY_REPORTED`, `TRANSPORT_ISSUE` | `NO_ACTION` | Acknowledged but not yet handled |
| `UNKNOWN` | `NO_ACTION` | Unhandled event type |

**Example:**
```python
decision = agent.decide(event)
print(decision.action)  # RUN_OPTIMIZER
print(decision.reason)  # "Hard constraint changed: MUST_VISIT_ADDED"
```

#### `should_run_optimizer(event: FeedbackEvent) -> bool`

Quick check if optimizer should run.

**Parameters:**
- `event` (FeedbackEvent): Event to check

**Returns:**
- `bool`: True if optimizer should run

**Example:**
```python
if agent.should_run_optimizer(event):
    print("Optimizer will run")
```

---

## Optimizer Agent

### Class: `OptimizerAgent`

Wrapper around the existing optimizer system.

#### `__init__()`

Initializes the agent.

```python
agent = OptimizerAgent()
```

#### `run(preferences: Optional[Dict], constraints: Optional[Dict], base_solution_path: Optional[Path]) -> Dict[str, Path]`

Run the optimizer with updated preferences/constraints.

**Parameters:**
- `preferences` (dict, optional): Updated family preferences
- `constraints` (dict, optional): Updated constraints
- `base_solution_path` (Path, optional): Path to base itinerary

**Returns:**
- `dict`: Dictionary with paths to generated files:
  - `optimized_solution`: Path to optimized_solution.json
  - `decision_traces`: Path to decision_traces.json
  - `enriched_diffs`: Path to enriched_diffs.json

**Example:**
```python
result = agent.run()
print(result["optimized_solution"])  # Path to solution file
```

#### `load_solution(solution_path: Path) -> Dict[str, Any]`

Load an optimized solution from file.

**Example:**
```python
solution = agent.load_solution(Path("optimized_solution.json"))
```

#### `load_decision_traces(traces_path: Path) -> Dict[str, Any]`

Load decision traces from file.

#### `load_enriched_diffs(diffs_path: Path) -> Dict[str, Any]`

Load enriched diffs from file.

---

## Explainability Agent

### Class: `ExplainabilityAgent`

Converts decision payloads into human-readable summaries using Groq Llama 3.1.

#### `__init__()`

Initializes the agent with Groq API.

```python
agent = ExplainabilityAgent()
```

#### `explain(payload: Dict[str, Any]) -> AgentExplanation`

Generate a human-readable explanation from a decision payload.

**Parameters:**
- `payload` (dict): Decision payload with keys:
  - `change_type` (str): Type of change
  - `poi_name` (str): Name of affected POI
  - `day` (int): Day number
  - `reason` (str): Reason for change
  - `details` (dict): Additional context

**Returns:**
- `AgentExplanation`: Explanation with summary text

**Example:**
```python
payload = {
    "change_type": "visit_added",
    "poi_name": "Akshardham Temple",
    "day": 2,
    "reason": "User expressed strong interest"
}

explanation = agent.explain(payload)
print(explanation.summary)
# "Added Akshardham Temple to Day 2 visit list because..."
```

#### `explain_batch(payloads: List[Dict[str, Any]]) -> List[AgentExplanation]`

Generate explanations for multiple payloads.

**Example:**
```python
explanations = agent.explain_batch([payload1, payload2, payload3])
for exp in explanations:
    print(exp.summary)
```

---

## Agent Controller

### Class: `AgentController`

Main orchestration layer coordinating all agents.

#### `__init__()`

Initializes the controller and all agents.

```python
controller = AgentController()
```

#### `process_user_input(user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]`

Process user input through the complete agent pipeline.

**Parameters:**
- `user_input` (str): Natural language text from user
- `context` (dict, optional): Context information

**Returns:**
- `dict`: Result dictionary with keys:
  - `event` (FeedbackEvent): Parsed event
  - `decision` (PolicyDecision): Decision made
  - `optimizer_output` (dict): Optimizer output paths (if run)
  - `explanations` (list): List of AgentExplanation objects

**Complete Example:**
```python
controller = AgentController()

result = controller.process_user_input(
    "We loved Akshardham, we definitely want to visit it tomorrow.",
    context={"family_id": "FAM_B"}
)

# Access results
print(f"Event: {result['event'].event_type}")
print(f"Action: {result['decision'].action}")

if result['optimizer_output']:
    print("Optimizer ran successfully")
    
for exp in result['explanations']:
    print(f"- {exp.summary}")
```

#### `run_demo_scenarios()`

Run preset demo scenarios to showcase the system.

**Example:**
```python
controller.run_demo_scenarios()
```

---

## Error Handling

All agents include built-in error handling:

- **Invalid API Key**: Falls back to demo mode
- **Parsing Errors**: Returns `UNKNOWN` event type with LOW confidence
- **File Not Found**: Logs warning and returns empty dict
- **Groq API Errors**: Catches exceptions and returns fallback responses

---

## Type Hints

All functions include full type hints for IDE support and type checking:

```python
def parse(self, user_input: str, context: Optional[dict] = None) -> FeedbackEvent:
    ...
```

Use with mypy or similar tools:
```bash
mypy agents/
```

---

## Testing

Each agent file includes a `__main__` block for standalone testing:

```bash
# Test individual agents
python -m agents.feedback_agent
python -m agents.decision_policy_agent
python -m agents.optimizer_agent
python -m agents.explainability_agent

# Test full pipeline
python -m agents.agent_controller
```

---

**Next**: See [WEBSITE_INTEGRATION_GUIDE.md](WEBSITE_INTEGRATION_GUIDE.md) for integration patterns.
