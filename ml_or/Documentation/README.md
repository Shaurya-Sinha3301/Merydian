# Voyageur Agentic Optimizer Documentation

This directory contains comprehensive documentation for the **Agentic Re-Optimization System** - a production-ready workflow for processing user feedback and dynamically updating travel itineraries.

---

## 📚 Documentation Index

### **Start Here** 🎯

**[AGENTIC_WORKFLOW_COMPLETE_GUIDE.md](./AGENTIC_WORKFLOW_COMPLETE_GUIDE.md)**  
*Complete implementation guide with all critical fixes and backend integration steps*

This is your **primary resource** for understanding how the system works, including:
- Step-by-step workflow
- Critical fixes (cumulative preferences, preference files)
- Backend integration patterns
- Common issues & solutions
- Testing & verification

---

### Backend Integration

**[Backend_Integration_Guide.md](./Backend_Integration_Guide.md)**  
*REST API, WebSocket, and async processing patterns*

Learn how to integrate the agentic system into your backend:
- FastAPI/Flask REST endpoints
- WebSocket real-time chat
- Database session management
- Deployment with Docker
- **INCLUDES**: Troubleshooting section for common issues

**[PRODUCTION_API_GUIDE.md](./PRODUCTION_API_GUIDE.md)**  
*Understanding base itinerary vs. optimized solutions*

Clarifies the difference between:
- Base itinerary (structural constraints)
- Family preferences (user inputs)
- Optimized solutions (output results)
- How to handle re-optimization correctly

---

### Architecture & Capabilities

**[VOYAGEUR_ARCHITECTURE_DEEP_DIVE.md](./VOYAGEUR_ARCHITECTURE_DEEP_DIVE.md)**  
*Deep dive into the optimizer architecture*

Technical details on:
- CP-SAT constraint solver
- Dynamic POI expansion
- Synchronization constraints
- History tracking

**[VOYAGEUR_DATA_FLOW_REPORT.md](./VOYAGEUR_DATA_FLOW_REPORT.md)**  
*Data flow through the system*

**[VOYAGEUR_CAPABILITIES_REPORT.md](./VOYAGEUR_CAPABILITIES_REPORT.md)**  
*System capabilities overview*

**[VOYAGEUR_AGENT_HANDBOOK.md](./VOYAGEUR_AGENT_HANDBOOK.md)**  
*Agent architecture reference*

---

## 🚀 Quick Start for Backend Developers

### 1. Understand the Workflow
Read [AGENTIC_WORKFLOW_COMPLETE_GUIDE.md](./AGENTIC_WORKFLOW_COMPLETE_GUIDE.md) sections:
- System Architecture
- Critical Implementation Details
- Complete Workflow

### 2. Run the Demo
```bash
cd c:\Amlan\Codes\Voyageur_Studio
python ml_or\demos\reopt_hard_constraints\run_demo.py
```

### 3. Implement REST API
Follow patterns in [Backend_Integration_Guide.md](./Backend_Integration_Guide.md):
- REST API Pattern (section)
- WebSocket Integration (section)
- Database Integration (section)

### 4. Test & Verify
Use troubleshooting section in [Backend_Integration_Guide.md](./Backend_Integration_Guide.md) to resolve common issues.

---

## ⚠️ Critical Implementation Requirements

**These are MUST-HAVE for production:**

1. ✅ **Pass `current_prefs_path` to OptimizerAgent**  
   Without this, must-visit/never-visit constraints won't work!

2. ✅ **Use correct field names**  
   `must_visit_locations` and `never_visit_locations` (NOT `must_visit`/`never_visit`)

3. ✅ **Single preference file per iteration**  
   Only `family_preferences_updated.json` should be generated

4. ✅ **Load from OptimizerAgent output**  
   Copy files from OptimizerAgent, don't save session state separately

See [AGENTIC_WORKFLOW_COMPLETE_GUIDE.md § Critical Implementation Details](./AGENTIC_WORKFLOW_COMPLETE_GUIDE.md#critical-implementation-details) for details.

---

## 🔧 Common Issues

| Issue | See |
|-------|-----|
| Must-visit not enforced | [Backend Guide § Troubleshooting #1](./Backend_Integration_Guide.md#issue-1-must-visit-constraints-not-enforced) |
| Duplicate preference files | [Backend Guide § Troubleshooting #2](./Backend_Integration_Guide.md#issue-2-multiple-preference-files-with-different-content) |
| Empty explanations | [Backend Guide § Troubleshooting #3](./Backend_Integration_Guide.md#issue-3-empty-explanations) |
| Wrong field names | [Backend Guide § Troubleshooting #4](./Backend_Integration_Guide.md#issue-4-wrong-field-names) |

---

## 📦 What's Included in the System

### Agents
- **FeedbackAgent**: Parse natural language → structured events
- **DecisionPolicyAgent**: Decide when to optimize vs. acknowledge
- **OptimizerAgent**: Run constraint solver + generate outputs
- **ExplainabilityAgent**: Create natural language explanations

### Session Management
- **TripSessionManager**: Track state across iterations
- **FeedbackProcessor**: Stateless processing pipeline

### Outputs per Iteration
- `family_preferences_updated.json` - Updated cumulative preferences
- `optimized_solution.json` - New itinerary
- `llm_payloads.json` - Structured change data for LLM
- `explanations.md` - Natural language explanations
- `enriched_diffs.json` - Technical diff details
- `decision_traces.json` - Optimizer decision log

---

## 📅 Version History

### Version 2.0 (2026-02-03) - **CURRENT**
- ✅ Fixed cumulative preferences bug
- ✅ Fixed duplicate preference files issue
- ✅ Corrected field names documentation
- ✅ Added comprehensive troubleshooting
- ✅ Created complete workflow guide

### Version 1.0 (2026-02-02)
- Initial production-ready implementation
- Backend integration patterns
- Demo implementation

---

## 🆘 Support

For questions or issues:
1. Check [AGENTIC_WORKFLOW_COMPLETE_GUIDE.md § Common Issues & Solutions](./AGENTIC_WORKFLOW_COMPLETE_GUIDE.md#common-issues--solutions)
2. Review conversation logs in `artifacts/` directory
3. Run demo script to verify setup

---

**Last Updated**: 2026-02-03  
**Status**: Production-Ready with Critical Fixes
