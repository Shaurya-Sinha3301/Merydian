# Agent System Architecture Documentation

> **Comprehensive guide to all agent-related files and their interactions**

This document explains every file involved in the agent-to-database integration, showing how the agentic workflow system connects to the backend API and database.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Backend Integration Layer](#backend-integration-layer)
- [Agent System (Core)](#agent-system-core)
- [ML Optimizer Integration](#ml-optimizer-integration)
- [Data Flow Examples](#data-flow-examples)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React/Next.js)                   │
│                  Customer submits feedback                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  itinerary.py: POST /api/v1/itinerary/feedback/agent    │   │
│  │  - Receives natural language feedback                    │   │
│  │  - Validates user authentication                         │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND SERVICE LAYER                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  optimizer_service.py                                    │   │
│  │  - Main orchestration point                              │   │
│  │  - Loads trip session from database                      │   │
│  │  - Coordinates agent pipeline                            │   │
│  │  - Saves results back to database                        │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                          │
│  ┌────────────────────┴─────────────────────────────────────┐   │
│  │  agent_service.py                                        │   │
│  │  - Process event-based feedback                          │   │
│  │  - Integrates with optimizer_service                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  trip_session.py (Model)                                 │   │
│  │  - Stores session state in PostgreSQL                    │   │
│  │  - Tracks preferences, feedback, iterations              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              AGENT SYSTEM (agents/)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  agent_controller.py                                     │   │
│  │  - Orchestrates agent pipeline                           │   │
│  │  └──▶ feedback_agent.py                                  │   │
│  │       - Parses natural language                          │   │
│  │       └──▶ decision_policy_agent.py                      │   │
│  │            - Decides action (optimize or acknowledge)    │   │
│  │            └──▶ optimizer_agent.py                       │   │
│  │                 - Runs ML optimizer                      │   │
│  │                 └──▶ explainability_agent.py             │   │
│  │                      - Generates explanations            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│           ML OPTIMIZER (ml_or/)                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  feedback_processor.py                                   │   │
│  │  - Stateless processor for feedback                      │   │
│  │  - Works with file-based optimizer                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Integration Layer

### 📄 `backend/app/api/itinerary.py`

**Purpose**: REST API endpoint for agent-based feedback processing

**Key Components**:

#### 1. Request Model
```python
class AgentFeedbackRequest(BaseModel):
    message: str  # Natural language feedback
    trip_id: str  # Trip identifier
```

#### 2. Response Model
```python
class AgentFeedbackResponse(BaseModel):
    success: bool
    event_type: str           # MUST_VISIT_ADDED, NEVER_VISIT_ADDED, etc.
    action_taken: str         # RUN_OPTIMIZER, ACKNOWLEDGED, etc.
    explanations: List[str]   # Natural language explanations
    itinerary_updated: bool
    iteration: int
    cost_analysis: Optional[Dict]  # Cost changes
```

#### 3. Endpoint Handler
```python
@router.post("/feedback/agent", response_model=AgentFeedbackResponse)
async def process_agent_feedback(
    feedback: AgentFeedbackRequest,
    current_user: TokenPayload = Depends(get_current_user)
)
```

**What it does**:
1. ✅ Validates user authentication via JWT token
2. ✅ Extracts family_id from current user
3. ✅ Calls `OptimizerService.process_feedback_with_agents()`
4. ✅ Returns structured response with explanations and cost analysis

**Error Handling**:
- `503 Service Unavailable`: Agent system not installed
- `404 Not Found`: Trip session doesn't exist
- `500 Internal Server Error`: Processing failure

---

### 📄 `backend/app/services/optimizer_service.py`

**Purpose**: Main orchestration service bridging backend database with agent system

**Architecture**: Hybrid approach combining database persistence with file-based optimizer compatibility

#### Key Methods:

##### 1. `create_trip_session()`
```python
def create_trip_session(
    trip_id: str,
    family_ids: List[str],
    baseline_itinerary_path: str,
    trip_name: Optional[str] = None
) -> TripSession
```

**What it does**:
- Creates directory structure for session storage
- Creates output directory for optimizer results
- Initializes TripSession in PostgreSQL database
- Sets up empty preferences and feedback history

**Database Transaction**:
```python
with get_db_session() as db:
    db.add(trip_session)
    db.flush()           # Write to DB
    db.refresh(trip_session)  # Get generated ID
    db.expunge(trip_session)  # Detach from session (avoid errors)
```

---

##### 2. `get_trip_session()`
```python
def get_trip_session(trip_id: str) -> Optional[TripSession]
```

**What it does**:
- Queries PostgreSQL for trip session by trip_id
- Returns detached instance (safe to use outside transaction)

**Why detach?**
```python
db.expunge(session)  # Prevents "DetachedInstanceError" when accessing outside transaction
```

---

##### 3. `update_trip_session()`
```python
def update_trip_session(trip_session: TripSession) -> TripSession
```

**What it does**:
- Updates `updated_at` timestamp
- Saves changes to database
- Returns refreshed instance

---

##### 4. `process_feedback_with_agents()` ⭐ **MAIN INTEGRATION POINT**

```python
def process_feedback_with_agents(
    trip_id: str,
    family_id: str,
    message: str
) -> Dict[str, Any]
```

**Complete Flow**:

```python
# Step 1: Load trip session from database
trip_session = OptimizerService.get_trip_session(trip_id)

# Step 2: Create adapter to bridge DB session with file-based processor
session_manager = DatabaseSessionManagerAdapter(trip_session)

# Step 3: Initialize FeedbackProcessor (from ml_or/)
from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor
processor = FeedbackProcessor()

# Step 4: Process through agent pipeline
result = processor.process_feedback(
    trip_id=trip_id,
    family_id=family_id,
    message=message,
    session_manager=session_manager,
    output_dir=Path(trip_session.output_dir)
)

# Step 5: Update database
trip_session = session_manager.get_db_session()
OptimizerService.update_trip_session(trip_session)

# Step 6: Extract cost analysis from optimizer outputs
cost_analysis = OptimizerService._extract_cost_analysis(iteration_dir)

# Step 7: Return results
return {
    "success": True,
    "event_type": result["event_type"],
    "action_taken": result["action_taken"],
    "explanations": result["explanations"],
    "itinerary_updated": result["itinerary_updated"],
    "iteration": result["iteration"],
    "cost_analysis": cost_analysis
}
```

**Graceful Fallback**:
```python
except ImportError as e:
    logger.warning("Agent integration not available")
    # Returns acknowledgment instead of processing
    return {
        "success": True,
        "event_type": "ACKNOWLEDGED",
        "explanations": [message],
        "itinerary_updated": False
    }
```

---

##### 5. `_extract_cost_analysis()`
```python
def _extract_cost_analysis(iteration_dir: Path) -> Optional[Dict]
```

**What it does**:
- Reads `enriched_diffs.json` from optimizer output
- Extracts cost deltas for each change
- Calculates total cost change
- Returns structured cost analysis

**Output Format**:
```json
{
  "total_cost_change": -43.50,
  "changes": [
    {
      "poi_name": "Akshardham",
      "day": 2,
      "cost_delta": -43.50,
      "reason": "Removed due to optimization"
    }
  ]
}
```

---

#### Helper Class: `DatabaseSessionManagerAdapter`

**Purpose**: Bridges database-backed TripSession with file-based FeedbackProcessor

**Why needed?**
- FeedbackProcessor expects file-based session manager interface
- TripSession is database-backed
- Adapter implements required interface while using database underneath

**Key Methods**:

```python
class DatabaseSessionManagerAdapter:
    def __init__(self, trip_session: TripSession):
        self.trip_session = trip_session
    
    def get_session(self, trip_id: str):
        """Returns SessionAdapter wrapping database session"""
        return SessionAdapter(self.trip_session)
    
    def get_latest_itinerary(self, trip_id: str):
        """Returns path to latest optimized itinerary"""
        return Path(self.trip_session.latest_itinerary_path or 
                   self.trip_session.baseline_itinerary_path)
    
    def save_preferences_to_file(self, trip_id: str, file_path: Path):
        """Saves preferences as JSON file for optimizer"""
        with open(file_path, 'w') as f:
            json.dump(self.trip_session.preferences, f, indent=2)
    
    def update_preferences(self, trip_id, family_id, event_type, poi_id):
        """Updates preferences in database session"""
        if event_type == "MUST_VISIT_ADDED":
            self.trip_session.preferences[family_id]["must_visit"].append(poi_id)
        elif event_type == "NEVER_VISIT_ADDED":
            self.trip_session.preferences[family_id]["never_visit"].append(poi_id)
```

---

### 📄 `backend/app/services/agent_service.py`

**Purpose**: Process event-based feedback through agent pipeline

**Key Method**:

```python
def process_feedback_event(event_id: UUID) -> Dict[str, Any]
```

**Complete Flow**:

```python
# Step 1: Load event from database
event = EventService.get_event(event_id)

# Step 2: Extract feedback data
payload = event.payload or {}
comment = payload.get("comment", "")
rating = payload.get("rating")

# Step 3: Try to use OptimizerService
try:
    from app.services.optimizer_service import OptimizerService
    
    # Get or create trip session
    family_id = str(event.family_id)
    trip_id = f"trip_{family_id}"
    
    if not OptimizerService.get_trip_session(trip_id):
        OptimizerService.create_trip_session(
            trip_id=trip_id,
            family_ids=[family_id],
            baseline_itinerary_path="ml_or/data/delhi_3day_skeleton.json"
        )
    
    # Process through agent pipeline
    result = OptimizerService.process_feedback_with_agents(
        trip_id=trip_id,
        family_id=family_id,
        message=comment
    )
    
    # Update event status
    EventService.update_event_status(
        event_id=event_id,
        status=EventStatus.COMPLETED,
        processing_result={
            "agent_processing": True,
            "event_type": result["event_type"],
            "itinerary_updated": result["itinerary_updated"]
        }
    )
    
    return {
        "status": "completed",
        "explanations": result["explanations"],
        "cost_analysis": result.get("cost_analysis")
    }

except ImportError:
    # Fallback mode
    return {"status": "completed", "message": "Acknowledged"}
```

**Integration Points**:
- ✅ Called by event processing system
- ✅ Creates trip sessions on-demand
- ✅ Updates event status in database
- ✅ Returns structured results

---

### 📄 `backend/app/models/trip_session.py`

**Purpose**: SQLModel database model for trip session state

**Database Table**: `trip_sessions`

**Schema**:

```python
class TripSession(SQLModel, table=True):
    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Trip Identifier (unique)
    trip_id: str = Field(unique=True, index=True)
    
    # Related families
    family_ids: list = Field(sa_column=Column(JSON))
    
    # Itinerary Paths (for file-based optimizer)
    baseline_itinerary_path: str
    latest_itinerary_path: Optional[str] = None
    
    # Optimization State
    iteration_count: int = Field(default=0)
    
    # Cumulative Preferences (JSON)
    # Format: {family_id: {must_visit: [], never_visit: [], ratings: {}}}
    preferences: dict = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Feedback History (JSON)
    # Format: [{iteration, timestamp, family_id, message, event_type, action}]
    feedback_history: list = Field(default_factory=list, sa_column=Column(JSON))
    
    # Storage Paths
    session_storage_dir: Optional[str] = None
    output_dir: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
```

**Why JSON fields?**
- **Flexibility**: Preferences structure can evolve without migrations
- **Performance**: PostgreSQL has optimized JSONB support
- **Compatibility**: Easy serialization to/from files for optimizer

**Example Data**:
```json
{
  "trip_id": "delhi_family_trip_001",
  "family_ids": ["FAM_A", "FAM_B"],
  "iteration_count": 2,
  "preferences": {
    "FAM_A": {
      "must_visit": ["LOC_006"],  // Akshardham
      "never_visit": ["LOC_013"], // Lodhi Garden
      "ratings": {"DAY_1": 4}
    }
  },
  "feedback_history": [
    {
      "iteration": 1,
      "timestamp": "2026-02-03T01:00:00Z",
      "family_id": "FAM_A",
      "message": "We loved Akshardham!",
      "event_type": "MUST_VISIT_ADDED",
      "action": "RUN_OPTIMIZER"
    }
  ]
}
```

---

### 📄 `backend/migrations/add_trip_sessions.py`

**Purpose**: Database migration script to create trip_sessions table

**Usage**:
```bash
python backend/migrations/add_trip_sessions.py
```

**What it does**:
```python
def run_migration():
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    SQLModel.metadata.create_all(engine, tables=[TripSession.__table__])
```

**SQL Generated**:
```sql
CREATE TABLE trip_sessions (
    id UUID PRIMARY KEY,
    trip_id VARCHAR NOT NULL UNIQUE,
    family_ids JSON,
    baseline_itinerary_path VARCHAR NOT NULL,
    latest_itinerary_path VARCHAR,
    iteration_count INTEGER DEFAULT 0,
    preferences JSON,
    feedback_history JSON,
    trip_name VARCHAR,
    status VARCHAR DEFAULT 'active',
    session_storage_dir VARCHAR,
    output_dir VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX ix_trip_sessions_trip_id ON trip_sessions(trip_id);
```

---

## Agent System (Core)

### 📄 `agents/agent_controller.py`

**Purpose**: Orchestrates the complete agent pipeline

**Main Method**:

```python
def process_user_input(
    user_input: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]
```

**Pipeline Stages**:

```python
# Stage 1: Parse user input → structured event
event = self.feedback_agent.parse(user_input, context)
# Returns: FeedbackEvent(event_type="MUST_VISIT_ADDED", poi_name="Akshardham", ...)

# Stage 2: Decide action
decision = self.policy_agent.decide(event)
# Returns: PolicyDecision(action="RUN_OPTIMIZER", reason="Hard constraint added")

# Stage 3: Execute action
if decision.action == ActionType.RUN_OPTIMIZER:
    # Prepare preferences
    preferences = {
        "event_type": event.event_type,
        "family_id": event.family_id,
        "poi_name": event.poi_name
    }
    
    # Run optimizer
    optimizer_output = self.optimizer_agent.run(
        preferences=preferences,
        base_solution_path=previous_solution_path,
        output_dir=output_dir_path
    )
    
    # Generate explanations
    with open(optimizer_output["llm_payloads"], 'r') as f:
        payloads = json.load(f)
    
    explanations = self.explainability_agent.explain_batch(payloads)

# Stage 4: Return results
return {
    "event": event,
    "decision": decision,
    "optimizer_output": optimizer_output,
    "explanations": explanations
}
```

**Context Parameters**:
```python
context = {
    "family_id": "FAM_A",
    "trip_id": "delhi_trip_001",
    "current_preferences_path": "path/to/preferences.json",
    "base_itinerary": "ml_or/data/skeleton.json",
    "previous_solution": "path/to/last_solution.json",
    "output_dir": "path/to/iteration_dir"
}
```

---

### 📄 `agents/feedback_agent.py`

**Purpose**: Parse natural language feedback into structured events

**Uses**: Groq LLM (or Gemini as fallback)

**Method**:
```python
def parse(user_input: str, context: Dict) -> FeedbackEvent
```

**Example Transformation**:

**Input**:
```
"We loved Akshardham, we definitely want to visit it tomorrow!"
```

**LLM Prompt**:
```
Parse this user feedback into a structured event:
- Event type: (MUST_VISIT_ADDED, NEVER_VISIT_ADDED, DAY_RATING, etc.)
- POI name: extracted location name
- Family ID: from context
- Confidence: 0.0 to 1.0

Feedback: "We loved Akshardham, we definitely want to visit it tomorrow!"
```

**Output**:
```python
FeedbackEvent(
    event_type="MUST_VISIT_ADDED",
    poi_name="Akshardham",
    poi_id="LOC_006",  # Mapped from POI database
    family_id="FAM_A",
    confidence=0.95,
    raw_message="We loved Akshardham, we definitely want to visit it tomorrow!"
)
```

---

### 📄 `agents/decision_policy_agent.py`

**Purpose**: Decide what action to take based on event type

**Method**:
```python
def decide(event: FeedbackEvent) -> PolicyDecision
```

**Decision Logic**:

```python
# Hard constraints → Always run optimizer
if event.event_type in ["MUST_VISIT_ADDED", "NEVER_VISIT_ADDED"]:
    return PolicyDecision(
        action=ActionType.RUN_OPTIMIZER,
        reason="Hard constraint added, re-optimization required",
        requires_optimizer=True
    )

# Soft preferences → Just update preferences
elif event.event_type in ["DAY_RATING", "POI_RATING"]:
    return PolicyDecision(
        action=ActionType.UPDATE_PREFERENCES_ONLY,
        reason="Soft preference recorded",
        requires_optimizer=False
    )

# Unknown/Low confidence → Acknowledge only
else:
    return PolicyDecision(
        action=ActionType.ACKNOWLEDGE,
        reason="Event acknowledged, no action needed",
        requires_optimizer=False
    )
```

---

### 📄 `agents/optimizer_agent.py`

**Purpose**: Execute ML optimizer and generate explainability artifacts

**Method**:
```python
def run(
    preferences: Dict,
    base_solution_path: Optional[Path] = None,
    output_dir: Optional[Path] = None
) -> Dict[str, Path]
```

**What it does**:

```python
# Step 1: Load base itinerary and preferences
with open(base_itinerary_path) as f:
    base_data = json.load(f)

# Step 2: Update preferences based on event
updated_preferences = self.preference_builder.build_preferences(
    base_preferences,
    event_type=preferences["event_type"],
    family_id=preferences["family_id"],
    poi_id=preferences["poi_id"]
)

# Step 3: Run ML optimizer
from ml_or.itinerary_optimizer import ItineraryOptimizer
optimizer = ItineraryOptimizer(skeleton, updated_preferences)
solution = optimizer.optimize()

# Step 4: Generate explainability artifacts
from ml_or.explainability import DiffEngine, PayloadBuilder

# Compare baseline vs optimized
diffs = DiffEngine.compare(base_solution, solution)

# Create LLM payloads with POI names and costs
payloads = PayloadBuilder.create_payloads(diffs, poi_database)

# Save outputs
output_dir.mkdir(parents=True, exist_ok=True)
save_json(solution, output_dir / "optimized_solution.json")
save_json(payloads, output_dir / "llm_payloads.json")
save_json(diffs, output_dir / "enriched_diffs.json")

return {
    "optimized_solution": output_dir / "optimized_solution.json",
    "llm_payloads": output_dir / "llm_payloads.json",
    "enriched_diffs": output_dir / "enriched_diffs.json",
    "decision_traces": output_dir / "decision_traces.json"
}
```

**Output Files**:
1. **optimized_solution.json**: Complete optimized itinerary
2. **llm_payloads.json**: Structured data for explanation generation
3. **enriched_diffs.json**: Detailed change analysis with reasons
4. **decision_traces.json**: Optimizer decision log

---

### 📄 `agents/explainability_agent.py`

**Purpose**: Generate natural language explanations from optimizer outputs

**Method**:
```python
def explain_batch(payloads: List[Dict]) -> List[Explanation]
```

**Process**:

```python
explanations = []
for payload in payloads:
    # Create prompt for LLM
    prompt = f"""
    Explain this itinerary change in natural language:
    
    Change: {payload['change_type']}
    POI: {payload['poi_name']}
    Day: {payload['day']}
    Cost Delta: ₹{payload['cost_delta']}
    Reason: {payload['reason']}
    
    Generate a customer-friendly explanation with costs and reasoning.
    """
    
    # Call LLM
    response = self.llm_client.generate(prompt)
    
    explanations.append(Explanation(
        summary=response.text,
        change_type=payload['change_type'],
        confidence=0.9
    ))

return explanations
```

**Example Output**:
```
"We removed Akshardham from your Day 2 itinerary due to optimization 
tradeoffs. This change saves ₹43 and improves overall satisfaction by 
accommodating your must-visit preferences while staying within budget 
constraints."
```

---

### 📄 `agents/schemas.py`

**Purpose**: Data models for agent system

**Key Classes**:

```python
@dataclass
class FeedbackEvent:
    """Structured representation of user feedback"""
    event_type: str  # MUST_VISIT_ADDED, NEVER_VISIT_ADDED, etc.
    poi_name: Optional[str] = None
    poi_id: Optional[str] = None
    family_id: Optional[str] = None
    confidence: float = 0.0
    raw_message: str = ""

@dataclass
class PolicyDecision:
    """Decision about what action to take"""
    action: ActionType  # RUN_OPTIMIZER, UPDATE_PREFERENCES_ONLY, ACKNOWLEDGE
    reason: str
    requires_optimizer: bool = False

class ActionType(str, Enum):
    """Possible actions"""
    RUN_OPTIMIZER = "RUN_OPTIMIZER"
    UPDATE_PREFERENCES_ONLY = "UPDATE_PREFERENCES_ONLY"
    ACKNOWLEDGE = "ACKNOWLEDGE"

@dataclass
class Explanation:
    """Natural language explanation"""
    summary: str
    change_type: Optional[str] = None
    confidence: float = 0.0
```

---

### 📄 `agents/config.py`

**Purpose**: Agent system configuration

```python
class Config:
    # LLM Settings
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    PRIMARY_LLM = "groq"  # or "gemini"
    
    # Rate Limiting
    GROQ_RPM_LIMIT = 30  # Requests per minute
    GROQ_TPM_LIMIT = 20000  # Tokens per minute
    
    # Model Names
    GROQ_MODEL = "llama3-8b-8192"
    GEMINI_MODEL = "gemini-1.5-flash"
```

---

## ML Optimizer Integration

### 📄 `ml_or/demos/reopt_hard_constraints/feedback_processor.py`

**Purpose**: Stateless processor for handling user feedback

**Architecture**: Works with any session manager (file-based or database-backed)

**Main Method**:

```python
def process_feedback(
    trip_id: str,
    family_id: str,
    message: str,
    session_manager: Any,  # Can be file-based or DatabaseSessionManagerAdapter
    output_dir: Path
) -> Dict[str, Any]
```

**Complete Process**:

```python
# Step 1: Load session state
session = session_manager.get_session(trip_id)

# Step 2: Create iteration directory
iteration_dir = output_dir / trip_id / f"iteration_{session.iteration_count + 1}"
iteration_dir.mkdir(parents=True, exist_ok=True)

# Step 3: Save current preferences to file (for optimizer)
prefs_path = iteration_dir / "preferences_input.json"
session_manager.save_preferences_to_file(trip_id, prefs_path)

# Step 4: Process through agent controller
from agents.agent_controller import AgentController
controller = AgentController()

previous_solution = session_manager.get_latest_itinerary(trip_id)

result = controller.process_user_input(
    user_input=message,
    context={
        "family_id": family_id,
        "trip_id": trip_id,
        "current_preferences_path": str(prefs_path),
        "base_itinerary": session.baseline_itinerary_path,
        "previous_solution": str(previous_solution),
        "output_dir": str(iteration_dir)
    }
)

# Step 5: Record feedback
session.add_feedback(
    text=message,
    family_id=family_id,
    event_type=result['event'].event_type
)

# Step 6: If optimizer ran, update preferences and itinerary
if result.get('optimizer_output'):
    session_manager.update_preferences(
        trip_id, family_id,
        result['event'].event_type,
        result['event'].poi_id
    )
    
    session.update_itinerary(result['optimizer_output']['optimized_solution'])
    session_manager._save_session(session)

# Step 7: Return results
return {
    "success": True,
    "event_type": result['event'].event_type,
    "action_taken": result['decision'].action,
    "explanations": [exp.summary for exp in result.get('explanations', [])],
    "itinerary_updated": bool(result.get('optimizer_output')),
    "iteration": session.iteration_count
}
```

**Why Stateless?**
- Can be used by REST API, WebSocket, or CLI
- All state comes from session_manager
- Easy to test and maintain

---

## Data Flow Examples

### Example 1: Customer Adds Must-Visit POI

**Input**:
```http
POST /api/v1/itinerary/feedback/agent
{
  "message": "We loved Akshardham, add it to our itinerary!",
  "trip_id": "delhi_trip_001"
}
```

**Flow**:

1. **API Layer** (`itinerary.py`):
   ```python
   process_agent_feedback() receives request
   → Validates authentication
   → Extracts family_id from token
   ```

2. **Service Layer** (`optimizer_service.py`):
   ```python
   process_feedback_with_agents() called
   → Loads TripSession from PostgreSQL
   → Creates DatabaseSessionManagerAdapter
   ```

3. **Processor** (`feedback_processor.py`):
   ```python
   process_feedback() called
   → Saves preferences to file
   → Calls AgentController
   ```

4. **Agent Pipeline** (`agent_controller.py`):
   ```python
   process_user_input() orchestrates:
   
   FeedbackAgent.parse()
   → "We loved Akshardham..." → MUST_VISIT_ADDED
   
   DecisionPolicyAgent.decide()
   → MUST_VISIT_ADDED → RUN_OPTIMIZER
   
   OptimizerAgent.run()
   → Loads skeleton + preferences
   → Runs ML optimizer
   → Generates diffs and payloads
   
   ExplainabilityAgent.explain_batch()
   → Generates natural language explanations
   ```

5. **Database Update** (`optimizer_service.py`):
   ```python
   → Updates TripSession.preferences
   → Updates TripSession.feedback_history
   → Increments TripSession.iteration_count
   → Saves to PostgreSQL
   ```

6. **Response**:
   ```json
   {
     "success": true,
     "event_type": "MUST_VISIT_ADDED",
     "action_taken": "RUN_OPTIMIZER",
     "explanations": [
       "Added Akshardham to FAM_A's Day 2 itinerary. 
        This addition costs ₹150 but increases satisfaction by 15%."
     ],
     "itinerary_updated": true,
     "iteration": 2,
     "cost_analysis": {
       "total_cost_change": 150.0,
       "changes": [
         {
           "poi_name": "Akshardham",
           "day": 2,
           "cost_delta": 150.0,
           "reason": "User requested must-visit"
         }
       ]
     }
   }
   ```

---

### Example 2: Low Rating Feedback (Fallback Mode)

**Input**:
```http
POST /api/v1/itinerary/feedback
{
  "rating": 2,
  "comment": "Red Fort was overcrowded",
  "node_id": "LOC_001"
}
```

**Flow**:

1. **API Layer** (`itinerary.py`):
   ```python
   submit_feedback() creates Event
   ```

2. **Event Processing** (`agent_service.py`):
   ```python
   process_feedback_event() called
   → Tries to import OptimizerService
   → On ImportError, falls back to simple processing
   → Adds AVOID_VISIT preference for rating ≤ 2
   ```

3. **Database**: 
   ```python
   → Creates Preference record
   → Updates Event status to COMPLETED
   ```

---

## Summary

### Backend Integration Files

| File | Purpose | Database? | Agent System? |
|------|---------|-----------|---------------|
| `app/api/itinerary.py` | REST API endpoint | ❌ | ✅ Calls OptimizeService |
| `app/services/optimizer_service.py` | **Main orchestration** | ✅ Reads/writes TripSession | ✅ Calls agents |
| `app/services/agent_service.py` | Event-based processing | ✅ Updates Events | ✅ Calls OptimizerService |
| `app/models/trip_session.py` | Database model | ✅ PostgreSQL table | ❌ |
| `migrations/add_trip_sessions.py` | Database migration | ✅ Creates table | ❌ |

### Agent System Files

| File | Purpose | Called By | Calls |
|------|---------|-----------|-------|
| `agents/agent_controller.py` | **Orchestrator** | FeedbackProcessor | All agents |
| `agents/feedback_agent.py` | Parse NL → Event | AgentController | Groq/Gemini LLM |
| `agents/decision_policy_agent.py` | Decide action | AgentController | None |
| `agents/optimizer_agent.py` | Run ML optimizer | AgentController | ItineraryOptimizer |
| `agents/explainability_agent.py` | Generate explanations | AgentController | Groq/Gemini LLM |
| `agents/schemas.py` | Data models | All agents | None |

### ML Optimizer Files

| File | Purpose | Interface |
|------|---------|-----------|
| `ml_or/demos/.../feedback_processor.py` | Stateless processor | Works with any session manager |

---

## Next Steps

1. **Install Agent Dependencies**:
   ```bash
   pip install groq google-generativeai
   ```

2. **Test Full Pipeline**:
   ```bash
   python backend/test_agent_integration.py
   ```

3. **Build Frontend**:
   - Agent optimizer window
   - Cost analysis display
   - Change history panel

---

**Generated**: 2026-02-03  
**Last Updated**: Agent-ML Optimizer Integration Complete
