# 🤖 Voyageur Agent System - Quick Start Guide

**Version**: 1.0  
**Date**: January 31, 2026

---

## What is the Agent System?

The Voyageur Agent System is a **demo-ready, event-driven orchestration layer** that sits on top of your existing optimizer and explainability pipeline. It converts natural language user feedback into structured actions and explanations.

### Core Philosophy

> **Agents do not optimize. Agents do not explain.**  
> **Agents decide *when* to call tools.**

Each agent has a single, clear responsibility:
- **Feedback Agent**: Parse natural language → structured events
- **Decision/Policy Agent**: Event type → action decision (rule-based)
- **Optimizer Agent**: Wrapper around your existing optimizer
- **Explainability Agent**: Decision payload → human-readable summary

---

## Quick Start

### 1. Installation

```bash
# Navigate to project root
cd c:\Amlan\Codes\Voyageur_Studio

# Install dependencies
pip install -r requirements_agents.txt
```

### 2. Configuration

Edit `.env` file and add your Groq API key:

```env
GROQ_API_KEY=your_actual_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
LOG_LEVEL=INFO
```

### 3. Run the Demo

```bash
# Run the interactive demo
python agents/demo.py

# Or test individual agents
python -m agents.feedback_agent
python -m agents.decision_policy_agent
python -m agents.agent_controller
```

---

## System Architecture

```
User Input (Natural Language)
        ↓
┌───────────────────────┐
│   Feedback Agent      │  Groq Llama 3.1-powered NLP parsing
│   (LLM)               │  Input: "We loved Akshardham"
└───────────────────────┘  Output: Structured JSON event
        ↓
┌───────────────────────┐
│ Decision/Policy Agent │  Rule-based decision logic
│ (Deterministic)       │  Maps event types to actions
└───────────────────────┘
        ↓
┌───────────────────────┐
│   Optimizer Agent     │  Runs if hard constraints changed
│   (Tool Wrapper)      │  Generates optimized itinerary
└───────────────────────┘
        ↓
┌───────────────────────┐
│ Explainability Agent  │  Groq Llama 3.1-powered explanation
│   (LLM)               │  Converts payloads to text
└───────────────────────┘
        ↓
   Human-Readable Summary
```

---

## Event Types

The system recognizes these event types:

| Event Type | Description | Action Triggered |
|------------|-------------|------------------|
| `MUST_VISIT_ADDED` | User wants to visit a location | Run Optimizer (hard constraint) |
| `NEVER_VISIT_ADDED` | User wants to exclude a location | Run Optimizer (hard constraint) |
| `POI_RATING` | User rates a specific POI | Update Preferences Only |
| `DAY_RATING` | User rates their day experience | Update Preferences Only |
| `DELAY_REPORTED` | User reports being delayed | Acknowledged (not yet handled) |
| `TRANSPORT_ISSUE` | User reports transport problem | Acknowledged (not yet handled) |

---

## Usage Examples

### Example 1: Add Must-Visit Location

```python
from agents.agent_controller import AgentController

controller = AgentController()

result = controller.process_user_input(
    "We loved Akshardham, we definitely want to visit it tomorrow.",
    context={"family_id": "FAM_B"}
)

# Result includes:
# - event: Parsed FeedbackEvent
# - decision: PolicyDecision
# - optimizer_output: Paths to generated files
# - explanations: List of human-readable summaries
```

### Example 2: Exclude Location

```python
result = controller.process_user_input(
    "Please skip the Red Fort, we're not interested.",
    context={"family_id": "FAM_A"}
)
# This triggers optimizer re-run with updated constraints
```

### Example 3: Rate Experience (Soft Preference)

```python
result = controller.process_user_input(
    "I'd rate today a 9 out of 10!",
    context={"family_id": "FAM_C", "day": 1}
)
# This updates preferences without re-running optimizer
```

---

## API Reference

See [AGENT_API_REFERENCE.md](AGENT_API_REFERENCE.md) for complete API documentation.

---

## Website Integration

### REST API Endpoint Design

For website integration, expose the agent system via a REST API:

```python
# Example Flask endpoint
from flask import Flask, request, jsonify
from agents.agent_controller import AgentController

app = Flask(__name__)
controller = AgentController()

@app.route('/api/feedback', methods=['POST'])
def process_feedback():
    data = request.json
    result = controller.process_user_input(
        user_input=data['text'],
        context=data.get('context')
    )
    
    return jsonify({
        'event_type': result['event'].event_type,
        'action': result['decision'].action,
        'explanations': [exp.summary for exp in result['explanations']]
    })
```

### WebSocket for Real-Time Updates

```python
# Example WebSocket handler
from socketio import Server

sio = Server()

@sio.on('user_feedback')
def handle_feedback(sid, data):
    result = controller.process_user_input(data['text'], data.get('context'))
    
    # Emit real-time updates
    sio.emit('event_parsed', {'event_type': result['event'].event_type}, room=sid)
    sio.emit('decision_made', {'action': result['decision'].action}, room=sid)
    
    if result['optimizer_output']:
        sio.emit('optimizer_running', room=sid)
        # ... emit progress updates
        sio.emit('optimizer_complete', room=sid)
    
    sio.emit('explanations', {
        'summaries': [exp.summary for exp in result['explanations']]
    }, room=sid)
```

---

## Demo Mode

The system includes a **demo mode** that works without a Groq API key:

- Feedback Agent uses keyword matching instead of LLM
- Explainability Agent uses simple templates
- Perfect for testing the orchestration flow

To use demo mode, simply leave `GROQ_API_KEY` as `your_api_key_here` in `.env`.

---

## Troubleshooting

### Issue: "GROQ_API_KEY not set"

**Solution**: Edit `.env` file and add your API key from https://console.groq.com/keys, or use demo mode.

### Issue: Optimizer files not found

**Solution**: The optimizer agent currently uses demo data from `ml_or/tests/solved/3fam3daypref/`. Update `optimizer_agent.py` to integrate with your actual optimizer.

### Issue: Import errors

**Solution**: Make sure you're in the project root and have installed dependencies:
```bash
cd c:\Amlan\Codes\Voyageur_Studio
pip install -r requirements_agents.txt
```

---

## Next Steps

1. ✅ Test the demo (`python agents/demo.py`)
2. ⬜ Add your Groq API key to `.env`
3. ⬜ Integrate with actual optimizer code
4. ⬜ Build REST API for website integration
5. ⬜ Add authentication
6. ⬜ Deploy to production

For detailed implementation guidance, see:
- [AGENT_API_REFERENCE.md](AGENT_API_REFERENCE.md) - Complete API docs
- [WEBSITE_INTEGRATION_GUIDE.md](WEBSITE_INTEGRATION_GUIDE.md) - Integration patterns
- [AGENT_ARCHITECTURE.md](AGENT_ARCHITECTURE.md) - Deep dive into design

---

**Questions?** Check the documentation or review the inline code comments. Each agent file includes test functions you can run standalone.
