# 📖 Voyageur Agent System - Documentation Index

**Version**: 1.0  
**Last Updated**: January 31, 2026

---

## Welcome

This documentation covers the Voyageur Agent System - a demo-ready, event-driven orchestration layer for travel itinerary optimization.

---

## Documentation Structure

### 🚀 [Quick Start Guide](QUICK_START_GUIDE.md)
**Start here** if you're new to the system.

- Installation instructions
- Configuration setup
- Running the demo
- Basic usage examples
- Troubleshooting

**Time to read**: 10 minutes

---

### 📚 [API Reference](AGENT_API_REFERENCE.md)
Complete API documentation for all agents and schemas.

- All classes and methods
- Parameter descriptions
- Return types
- Code examples
- Error handling

**Use for**: Development and integration

---

### 🌐 [Website Integration Guide](WEBSITE_INTEGRATION_GUIDE.md)
How to integrate the agent system into your web application.

- REST API patterns
- WebSocket real-time updates
- Authentication & rate limiting
- Deployment strategies
- Monitoring & logging

**Use for**: Production deployment

---

### 🏗️ [Architecture Deep Dive](AGENT_ARCHITECTURE.md)
In-depth explanation of system design and decisions.

- Core principles
- Agent responsibilities
- Orchestration flow
- Design decisions
- Extension points
- Future roadmap

**Use for**: Understanding the "why" behind the design

---

## Quick Reference

### Agent System Flow

```
User Input → Feedback Agent → Decision Agent → Optimizer Agent → Explainability Agent → Output
```

### Core Agents

| Agent | Role | Technology |
|-------|------|------------|
| **Feedback** | Natural language → Events | Gemini (LLM) |
| **Decision/Policy** | Events → Actions | Rule-based |
| **Optimizer** | Run optimizer | Wrapper |
| **Explainability** | Payloads → Summaries | Gemini (LLM) |

### Event Types

- `MUST_VISIT_ADDED` - User wants to visit location
- `NEVER_VISIT_ADDED` - User wants to exclude location
- `POI_RATING` - User rates a POI
- `DAY_RATING` - User rates their day
- `DELAY_REPORTED` - User reports delay (mocked)
- `TRANSPORT_ISSUE` - Transport problem (mocked)

### Action Types

- `RUN_OPTIMIZER` - Triggers optimizer re-run
- `UPDATE_PREFERENCES_ONLY` - Updates preferences
- `NO_ACTION` - No action needed

---

## File Locations

```
Voyageur_Studio/
├── .env                          # API keys and config
├── requirements_agents.txt       # Dependencies
├── agents/
│   ├── __init__.py
│   ├── config.py                 # Configuration
│   ├── schemas.py                # Data models
│   ├── feedback_agent.py         # NLP parsing
│   ├── decision_policy_agent.py  # Decision logic
│   ├── optimizer_agent.py        # Optimizer wrapper
│   ├── explainability_agent.py   # Explanation generation
│   ├── agent_controller.py       # Orchestration
│   ├── demo.py                   # Demo script
│   └── Documentation/
│       ├── README.md (this file)
│       ├── QUICK_START_GUIDE.md
│       ├── AGENT_API_REFERENCE.md
│       ├── WEBSITE_INTEGRATION_GUIDE.md
│       └── AGENT_ARCHITECTURE.md
└── ml_or/                        # Existing optimizer system
```

---

## Common Tasks

### Run the Demo
```bash
python agents/demo.py
```

### Test Individual Agents
```bash
python -m agents.feedback_agent
python -m agents.decision_policy_agent
python -m agents.agent_controller
```

### Process User Feedback (Code)
```python
from agents.agent_controller import AgentController

controller = AgentController()
result = controller.process_user_input(
    "We loved Akshardham!",
    context={"family_id": "FAM_B"}
)
```

### Add API Key
Edit `.env`:
```env
GEMINI_API_KEY=your_actual_key_here
```

---

## Getting Help

### In Order of Preference:

1. **Check this documentation** - Most questions are answered here
2. **Review inline code comments** - All agents have detailed comments
3. **Run test functions** - Each agent file has `__main__` test blocks
4. **Check logs** - System logs all stages with detailed info

---

## Contributing

When extending the system:

1. **Maintain separation of concerns** - Each agent does ONE thing
2. **Add tests** - Include `__main__` test block in new files
3. **Update schemas** - Add new event/action types to `schemas.py`
4. **Document** - Update relevant docs when adding features
5. **Follow patterns** - Match existing code style and structure

---

## Version History

### v1.0 (2026-01-31)
- Initial release
- 4 core agents (Feedback, Decision, Optimizer, Explainability)
- Event-driven orchestration
- Gemini integration with demo mode fallback
- Complete documentation

---

## License

Internal use only - Voyageur Studio

---

**Next Steps**: Read the [Quick Start Guide](QUICK_START_GUIDE.md) to get started!
