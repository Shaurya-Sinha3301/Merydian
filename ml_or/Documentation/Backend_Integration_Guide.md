# Agentic Itinerary Re-Optimization: Backend Integration Guide

## Table of Contents
- [Overview](#overview)
- [What We Built](#what-we-built)
- [Architecture](#architecture)
- [Backend Integration Patterns](#backend-integration-patterns)
- [API Endpoints Design](#api-endpoints-design)
- [WebSocket Integration](#websocket-integration)
- [Database Integration](#database-integration)
- [Deployment Guide](#deployment-guide)
- [Example Implementations](#example-implementations)

---

## Overview

This document describes the **agentic itinerary re-optimization system** and provides patterns for integrating it into a production backend/website. The system enables users to provide natural language feedback about their travel itinerary, which automatically triggers optimization and generates detailed explanations.

### Key Capabilities

✅ **Natural Language Understanding**: Parse user feedback like "We loved Akshardham!" → structured events  
✅ **Intelligent Decision Making**: Determine when to re-optimize vs. acknowledge  
✅ **Real-Time Optimization**: Integrate with constraint-based itinerary optimizer  
✅ **Explainable AI**: Generate human-readable explanations with POI names, costs, and reasoning  
✅ **Session Management**: Track cumulative preferences across multiple feedback iterations  
✅ **Backend-Ready**: Stateless processing, session-based state, API-ready design  

---

## What We Built

### Components

#### 1. **Agents** (`agents/`)

**FeedbackAgent** ([feedback_agent.py](file:///c:/Amlan/Codes/Voyageur_Studio/agents/feedback_agent.py))
- Parses natural language feedback using Groq LLM
- Extracts: event type, POI name, family ID, confidence
- Example: "We're not interested in Akshardham" → `NEVER_VISIT_ADDED, POI=Akshardham, FAM_B`

**DecisionPolicyAgent** ([decision_policy_agent.py](file:///c:/Amlan/Codes/Voyageur_Studio/agents/decision_policy_agent.py))
- Decides action based on event type
- Hard constraints (must/never visit) → trigger optimizer
- Soft feedback (ratings) → acknowledge only

**OptimizerAgent** ([optimizer_agent.py](file:///c:/Amlan/Codes/Voyageur_Studio/agents/optimizer_agent.py))
- Wraps `ItineraryOptimizer` with explainability pipeline
- Generates: optimized solution, decision traces, enriched diffs, LLM payloads
- Saves all artifacts to specified output directory

**ExplainabilityAgent** ([explainability_agent.py](file:///c:/Amlan/Codes/Voyageur_Studio/agents/explainability_agent.py))
- Converts technical payloads → natural language explanations
- Uses Groq LLM with causal reasoning
- Includes POI names, costs, satisfaction metrics
- Example: "We removed Akshardham from your Day 2 itinerary due to optimization tradeoffs, saving 43 INR"

**AgentController** ([agent_controller.py](file:///c:/Amlan/Codes/Voyageur_Studio/agents/agent_controller.py))
- Orchestrates the complete pipeline: Feedback → Decision → Optimization → Explanation
- Manages data flow between agents

#### 2. **Session Management** (`ml_or/demos/reopt_hard_constraints/`)

**TripSessionManager** ([trip_session_manager.py](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/demos/reopt_hard_constraints/trip_session_manager.py))
- Manages trip state (preferences, itineraries, feedback history)
- Session-based design for multi-user support
- File-based storage for demo, easily replaced with database

**FeedbackProcessor** ([feedback_processor.py](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/demos/reopt_hard_constraints/feedback_processor.py))
- **Stateless** processor for handling user feedback
- Reusable across demo, REST API, WebSocket
- Loads state from session manager, processes feedback, saves results

#### 3. **Explainability Pipeline** (`ml_or/explainability/`)

- **DiffEngine**: Compares baseline vs. optimized itineraries
- **CausalTagger**: Tags changes with reasoning (e.g., "INTEREST_VECTOR_DOMINANCE")
- **DeltaEngine**: Calculates cost/satisfaction deltas
- **PayloadBuilder**: Creates structured LLM payloads with POI names

---

## Architecture

### System Flow

```
┌─────────────────┐
│   User Input    │ "We're not interested in Akshardham"
│  (Website Chat) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ REST API / WS   │ POST /trips/{trip_id}/feedback
│    Endpoint     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FeedbackProcessor│ (Stateless)
│                 │ - Load session
│                 │ - Process via AgentController
│                 │ - Save updated state
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│           AgentController Pipeline              │
│                                                 │
│  FeedbackAgent → DecisionAgent → OptimizerAgent│
│       ↓              ↓                ↓         │
│   Parse Event   Decide Action   Run Optimizer  │
│                                       ↓         │
│                            ExplainabilityAgent  │
│                                  ↓              │
│                          Generate Explanations  │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Response to Web │ {itinerary_updated: true,
│                 │  explanations: ["We removed..."]}
└─────────────────┘
```

### Data Flow

```
Session State (from DB/File)
    ↓
┌─────────────────────────────────┐
│ Current Preferences + Itinerary │
└─────────────────────────────────┘
    ↓
AgentController.process_user_input(message, context)
    ↓
┌─────────────────────────────────┐
│ OptimizerAgent Output:          │
│ - optimized_solution.json       │
│ - llm_payloads.json             │
│ - enriched_diffs.json           │
│ - decision_traces.json          │
└─────────────────────────────────┘
    ↓
ExplainabilityAgent.explain_batch(payloads)
    ↓
┌─────────────────────────────────┐
│ Natural Language Explanations   │
│ + Updated Itinerary             │
└─────────────────────────────────┘
    ↓
Save to Session (DB/File)
```

---

## Backend Integration Patterns

### Pattern 1: REST API Integration

**Recommended for**: Standard web applications with request-response model

```python
# FastAPI Example
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor
from ml_or.demos.reopt_hard_constraints.trip_session_manager import TripSessionManager

app = FastAPI()

# Initialize once at startup
processor = FeedbackProcessor()
session_manager = TripSessionManager(storage_dir="./trip_sessions")

class FeedbackRequest(BaseModel):
    trip_id: str
    family_id: str
    message: str

@app.post("/api/trips/{trip_id}/feedback")
async def process_feedback(trip_id: str, request: FeedbackRequest):
    """
    Process user feedback and return updated itinerary + explanations.
    """
    try:
        # Process feedback (stateless)
        result = processor.process_feedback(
            trip_id=trip_id,
            family_id=request.family_id,
            message=request.message,
            session_manager=session_manager,
            output_dir=Path(f"./output/{trip_id}")
        )
        
        return {
            "success": result["success"],
            "event_type": result["event_type"],
            "itinerary_updated": result["itinerary_updated"],
            "explanations": result["explanations"],
            "iteration": result["iteration"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trips/{trip_id}/itinerary")
async def get_itinerary(trip_id: str):
    """
    Retrieve current itinerary for a trip.
    """
    session = session_manager.get_session(trip_id)
    if not session:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Load latest itinerary
    latest_itinerary_path = session_manager.get_latest_itinerary(trip_id)
    with open(latest_itinerary_path, 'r') as f:
        itinerary = json.load(f)
    
    return {
        "trip_id": trip_id,
        "iteration": session.iteration_count,
        "itinerary": itinerary
    }
```

### Pattern 2: WebSocket Integration

**Recommended for**: Real-time chat interfaces, live updates

```python
# FastAPI WebSocket Example
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/trips/{trip_id}/chat")
async def websocket_chat(websocket: WebSocket, trip_id: str):
    """
    WebSocket endpoint for real-time feedback processing.
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            # Process feedback
            result = processor.process_feedback(
                trip_id=trip_id,
                family_id=data["family_id"],
                message=data["message"],
                session_manager=session_manager,
                output_dir=Path(f"./output/{trip_id}")
            )
            
            # Send immediate acknowledgment
            await websocket.send_json({
                "type": "ack",
                "event_type": result["event_type"]
            })
            
            # If optimizer ran, send updates
            if result["itinerary_updated"]:
                await websocket.send_json({
                    "type": "itinerary_update",
                    "iteration": result["iteration"],
                    "explanations": result["explanations"]
                })
    
    except WebSocketDisconnect:
        print(f"Client disconnected from trip {trip_id}")
```

### Pattern 3: Background Task Processing

**Recommended for**: Expensive operations, async processing

```python
from celery import Celery

celery_app = Celery('voyageur', broker='redis://localhost:6379')

@celery_app.task
def process_feedback_async(trip_id: str, family_id: str, message: str):
    """
    Process feedback asynchronously in background.
    """
    processor = FeedbackProcessor()
    session_manager = TripSessionManager(storage_dir="./trip_sessions")
    
    result = processor.process_feedback(
        trip_id=trip_id,
        family_id=family_id,
        message=message,
        session_manager=session_manager,
        output_dir=Path(f"./output/{trip_id}")
    )
    
    # Notify user via webhook/websocket/notification service
    notify_user(trip_id, result)
    
    return result

@app.post("/api/trips/{trip_id}/feedback/async")
async def process_feedback_endpoint(trip_id: str, request: FeedbackRequest):
    """
    Trigger async processing, return immediately.
    """
    task = process_feedback_async.delay(
        trip_id=trip_id,
        family_id=request.family_id,
        message=request.message
    )
    
    return {"task_id": task.id, "status": "processing"}
```

---

## API Endpoints Design

### Recommended Endpoints

#### 1. **Create Trip Session**
```
POST /api/trips
Body: {
  "trip_name": "Delhi 3-Day Tour",
  "families": ["FAM_A", "FAM_B", "FAM_C"],
  "base_itinerary_id": "delhi_3day_template"
}
Response: {
  "trip_id": "trip_abc123",
  "created_at": "2026-02-02T12:00:00Z"
}
```

#### 2. **Submit Feedback**
```
POST /api/trips/{trip_id}/feedback
Body: {
  "family_id": "FAM_B",
  "message": "We loved Akshardham, add it to our itinerary!"
}
Response: {
  "success": true,
  "event_type": "MUST_VISIT_ADDED",
  "itinerary_updated": true,
  "explanations": [
    "Added Akshardham to FAM_B's Day 2 itinerary (needed for group coordination). This addition will incur an extra cost of ₹43."
  ],
  "iteration": 2
}
```

#### 3. **Get Current Itinerary**
```
GET /api/trips/{trip_id}/itinerary
Response: {
  "trip_id": "trip_abc123",
  "iteration": 2,
  "itinerary": { /* full itinerary JSON */ },
  "preferences": { /* current family preferences */ }
}
```

#### 4. **Get Feedback History**
```
GET /api/trips/{trip_id}/history
Response: {
  "trip_id": "trip_abc123",
  "iterations": [
    {
      "iteration": 1,
      "timestamp": "2026-02-02T12:05:00Z",
      "message": "We loved Akshardham!",
      "event_type": "MUST_VISIT_ADDED",
      "explanations": [...]
    }
  ]
}
```

---

## WebSocket Integration

### Chat Interface Design

```javascript
// Frontend Example (JavaScript)
const ws = new WebSocket('ws://localhost:8000/ws/trips/trip_abc123/chat');

ws.onopen = () => {
  console.log('Connected to trip chat');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'ack') {
    // Show "Processing..." indicator
    showProcessingIndicator(data.event_type);
  }
  
  if (data.type === 'itinerary_update') {
    // Display explanations and refresh itinerary
    showExplanations(data.explanations);
    refreshItinerary(data.iteration);
  }
};

function sendFeedback(message) {
  ws.send(JSON.stringify({
    family_id: 'FAM_B',
    message: message
  }));
}
```

---

## Database Integration

### Replace File-Based Session Manager

The demo uses `TripSessionManager` with file-based storage. For production, implement a `DatabaseSessionManager`:

```python
from sqlalchemy import create_engine, Column, String, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class TripSession(Base):
    __tablename__ = 'trip_sessions'
    
    trip_id = Column(String, primary_key=True)
    baseline_itinerary_path = Column(String)
    latest_itinerary_path = Column(String, nullable=True)
    iteration_count = Column(Integer, default=0)
    preferences = Column(JSON)  # Serialized preferences
    feedback_history = Column(JSON)  # List of feedback entries
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class DatabaseSessionManager:
    def __init__(self, db_url: str):
        self.engine = create_engine(db_url)
        self.Session = sessionmaker(bind=self.engine)
    
    def get_session(self, trip_id: str) -> TripSession:
        session = self.Session()
        return session.query(TripSession).filter_by(trip_id=trip_id).first()
    
    def create_session(self, trip_id: str, baseline_itinerary_path: str, ...):
        session = self.Session()
        trip_session = TripSession(
            trip_id=trip_id,
            baseline_itinerary_path=baseline_itinerary_path,
            ...
        )
        session.add(trip_session)
        session.commit()
        return trip_session
    
    def update_preferences(self, trip_id: str, family_id: str, event_type: str, poi_id: str):
        # Load session, update preferences JSON, save
        ...
```

Replace in your API:
```python
# Instead of:
session_manager = TripSessionManager(storage_dir="./sessions")

# Use:
session_manager = DatabaseSessionManager(db_url="postgresql://user:pass@localhost/voyageur")
```

---

## Deployment Guide

### Environment Variables

```bash
# API Keys (required for LLM agents)
export GROQ_API_KEY="your_groq_api_key"
export GEMINI_API_KEY="your_gemini_api_key"  # Optional, Groq is primary

# Database (if using DatabaseSessionManager)
export DATABASE_URL="postgresql://user:pass@localhost/voyageur"

# Storage
export SESSION_STORAGE_DIR="/var/voyageur/sessions"
export OUTPUT_DIR="/var/voyageur/outputs"
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy code
COPY agents/ ./agents/
COPY ml_or/ ./ml_or/

# Expose API port
EXPOSE 8000

# Run server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Scaling Considerations

1. **Optimizer Performance**: Itinerary optimization can take 5-30 seconds
   - Use async/background tasks (Celery, RQ)
   - Cache common configurations
   
2. **LLM Rate Limits**: Groq free tier has rate limits
   - Implement request queuing
   - Use demo mode as fallback
   
3. **State Management**: Sessions must persist across restarts
   - Use Redis/PostgreSQL instead of files
   - Consider session expiry policies

---

## Example Implementations

### Complete Flask Example

See [ml_or/demos/reopt_hard_constraints/run_demo.py](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/demos/reopt_hard_constraints/run_demo.py) for a working demonstration of:
- Session initialization
- Simulated chat interface
- Feedback processing
- Iteration management
- Output organization

### Testing the System

```bash
# Run the demo
cd c:\Amlan\Codes\Voyageur_Studio
python ml_or\demos\reopt_hard_constraints\run_demo.py

# Check outputs
ls ml_or/demos/reopt_hard_constraints/output/demo_trip_*/iteration_*
```

Each iteration directory contains:
- `llm_payloads.json` - Structured data for LLM
- `explanations.md` - Natural language explanations
- `optimized_solution.json` - Updated itinerary
- `enriched_diffs.json` - Technical change details
- `decision_traces.json` - Optimizer decision log

---

## Summary

### What We Achieved

✅ **End-to-End Agentic Workflow**: Feedback → Optimization → Explanation  
✅ **Production-Ready Architecture**: Stateless processing, session management  
✅ **Explainable AI**: Real POI names, costs, causal reasoning  
✅ **Backend Compatible**: REST, WebSocket, async patterns  
✅ **Tested & Documented**: Working demo + integration guide  

### Next Steps for Production

1. **Implement Database Session Manager** replacing file-based storage
2. **Create REST API** using FastAPI/Flask patterns above
3. **Add WebSocket Support** for real-time chat
4. **Deploy with Docker** and configure environment variables
5. **Monitor & Scale** based on optimizer performance and LLM usage

### Support & Resources

- **Demo Code**: [ml_or/demos/reopt_hard_constraints/](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/demos/reopt_hard_constraints/)
- **Agent Implementations**: [agents/](file:///c:/Amlan/Codes/Voyageur_Studio/agents/)
- **Explainability Pipeline**: [ml_or/explainability/](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/explainability/)
- **README**: [ml_or/demos/reopt_hard_constraints/README.md](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/demos/reopt_hard_constraints/README.md)

---

**Last Updated**: 2026-02-02  
**Version**: 1.0  
**Status**: Production-Ready for Backend Integration
