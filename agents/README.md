# Voyageur Agent System

A **demo-ready agentic AI system** for travel itinerary optimization using Google Gemini.

## Overview

Event-driven orchestration layer that coordinates your existing optimizer and explainability pipeline. Converts natural language user feedback into structured actions and explanations.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements_agents.txt

# 2. Add your Gemini API key to .env
GEMINI_API_KEY=your_api_key_here

# 3. Run the demo
python agents/demo.py
```

## Architecture

```
User Input → Feedback Agent → Decision Agent → Optimizer Agent → Explainability Agent → Output
```

### Core Agents

- **Feedback Agent** - Natural language → structured events (Gemini)
- **Decision/Policy Agent** - Event types → actions (rule-based)
- **Optimizer Agent** - Wrapper around existing optimizer
- **Explainability Agent** - Decision payloads → human-readable summaries (Gemini)

## Documentation

See [agents/Documentation/](agents/Documentation/) for complete docs:

- **[Quick Start Guide](agents/Documentation/QUICK_START_GUIDE.md)** - Installation & usage
- **[API Reference](agents/Documentation/AGENT_API_REFERENCE.md)** - Complete API docs
- **[Website Integration Guide](agents/Documentation/WEBSITE_INTEGRATION_GUIDE.md)** - Production integration
- **[Architecture Deep Dive](agents/Documentation/AGENT_ARCHITECTURE.md)** - Design decisions

## Usage Example

```python
from agents.agent_controller import AgentController

controller = AgentController()

result = controller.process_user_input(
    "We loved Akshardham, we definitely want to visit it tomorrow.",
    context={"family_id": "FAM_B"}
)

print(f"Event: {result['event'].event_type}")
print(f"Action: {result['decision'].action}")
```

## Features

✅ Event-driven architecture  
✅ Type-safe with Pydantic schemas  
✅ Gemini integration with demo mode fallback  
✅ Comprehensive error handling  
✅ Production-ready patterns (REST API, WebSocket)  
✅ Extensive documentation

## System Requirements

- Python 3.10+
- Google Gemini API key
- Dependencies in `requirements_agents.txt`

## Project Structure

```
agents/
├── feedback_agent.py           # NLP parsing
├── decision_policy_agent.py    # Decision logic
├── optimizer_agent.py          # Optimizer wrapper
├── explainability_agent.py     # Explanation generation
├── agent_controller.py         # Orchestration
├── demo.py                     # Demo script
├── config.py                   # Configuration
├── schemas.py                  # Data models
└── Documentation/              # Complete docs
```

## License

Internal use only - Voyageur Studio

---

**Get Started**: See [Quick Start Guide](agents/Documentation/QUICK_START_GUIDE.md)
