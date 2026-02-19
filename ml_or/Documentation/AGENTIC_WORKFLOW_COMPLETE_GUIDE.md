# Agentic Re-Optimization Workflow: Complete Implementation Guide

**Version**: 2.0  
**Last Updated**: 2026-02-03  
**Status**: Production-Ready with Critical Fixes

---

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Critical Implementation Details](#critical-implementation-details)
- [Complete Workflow](#complete-workflow)
- [Backend Integration](#backend-integration)
- [Common Issues & Solutions](#common-issues--solutions)
- [Testing & Verification](#testing--verification)

---

## Overview

This guide documents the **complete agentic re-optimization workflow** as implemented and tested. It includes all critical fixes and considerations discovered during development.

### What This System Does

✅ **Natural Language Feedback** → Parse user intent (e.g., "We loved Akshardham!")  
✅ **Intelligent Decision Making** → Decide when to re-optimize vs. acknowledge  
✅ **Cumulative Preference Tracking** → Maintain must-visit/never-visit across iterations  
✅ **Real-Time Optimization** → Run constraint-based solver with updated preferences  
✅ **Explainable Results** → Generate natural language explanations with costs & reasoning

---

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                     USER FEEDBACK                        │
│  "We're not interested in Lodhi Gardens, skip it"       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              FeedbackProcessor (Stateless)               │
│  • Load session state                                    │
│  • Pass to AgentController                               │
│  • Save updated state                                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  AgentController Pipeline                 │
│                                                           │
│  FeedbackAgent → DecisionAgent → OptimizerAgent →       │
│  ExplainabilityAgent                                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                     OUTPUTS                              │
│  • Updated itinerary                                     │
│  • Natural language explanations                         │
│  • Cost/satisfaction metrics                             │
└─────────────────────────────────────────────────────────┘
```

---

## Critical Implementation Details

### 1. **Cumulative Preferences (CRITICAL FIX)**

**Problem**: OptimizerAgent was always loading base preferences, ignoring cumulative updates.

**Solution**: Pass `current_prefs_path` from context to OptimizerAgent.

**Implementation**:

```python
# In AgentController.process_user_input()
optimizer_output = self.optimizer_agent.run(
    preferences=preferences,  # Delta (new event)
    current_prefs_path=context.get('current_preferences_path'),  # Cumulative state ✅
    output_dir=output_dir_path
)
```

```python
# In OptimizerAgent.run()
def run(self, current_prefs_path: Optional[Path] = None, ...):
    # Load cumulative preferences, not base
    prefs_file = current_prefs_path if current_prefs_path else self.base_prefs_path
    base_prefs = load_base_preferences(prefs_file)  # ✅ Uses cumulative
```

**Why This Matters**: Without this, must-visit/never-visit requests are stored but never enforced by the optimizer.

---

### 2. **Preference File Architecture (CRITICAL FIX)**

**Problem**: Two preference files were being generated, one was stale.

**Files Generated Per Iteration**:
- ❌ `preferences_updated.json` - **REMOVED** (was stale from session state)
- ✅ `preferences_input.json` - Input preferences before applying event
- ✅ `family_preferences_updated.json` - **SOURCE OF TRUTH** after applying event

**Implementation**:

```python
# OptimizerAgent returns the updated preferences path
return {
    "optimized_solution": solution_path,
    "family_preferences": updated_prefs_path,  # ✅ Source of truth
    "llm_payloads": payloads_path,
    ...
}

# FeedbackProcessor copies from OptimizerAgent output
if optimizer_outputs.get('family_preferences'):
    prefs_src = Path(optimizer_outputs['family_preferences'])
    prefs_dst = iteration_dir / "family_preferences_updated.json"
    shutil.copy(prefs_src, prefs_dst)  # ✅ One consistent file
```

---

### 3. **Correct Field Names**

**CRITICAL**: Use `must_visit_locations` and `never_visit_locations`, NOT `must_visit`/`never_visit`.

**Correct Preference Structure**:
```json
{
  "family_id": "FAM_A",
  "must_visit_locations": ["LOC_006"],  ✅
  "never_visit_locations": ["LOC_013"],  ✅
  "interest_vector": {...}
}
```

---

## Complete Workflow

### Step-by-Step Process

#### 1. **Session Initialization**
```python
from ml_or.demos.reopt_hard_constraints.trip_session_manager import TripSessionManager

session_manager = TripSessionManager(storage_dir="./sessions")
session = session_manager.create_session(
    trip_id="trip_123",
    baseline_itinerary_path="path/to/baseline.json",
    family_ids=["FAM_A", "FAM_B", "FAM_C"]
)
```

#### 2. **Process User Feedback**
```python
from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor

processor = FeedbackProcessor()
result = processor.process_feedback(
    trip_id="trip_123",
    family_id="FAM_B",
    message="We're not interested in Lodhi Gardens, please skip it.",
    session_manager=session_manager,
    output_dir=Path("./output")
)
```

#### 3. **What Happens Internally**

**A. FeedbackAgent** parses message:
- Event type: `NEVER_VISIT_ADDED`
- POI: "Lodhi Gardens" → `LOC_013`
- Confidence: `HIGH`

**B. DecisionAgent** decides action:
- Hard constraint changed → `RUN_OPTIMIZER`

**C. OptimizerAgent** runs optimization:
1. Loads current cumulative preferences from `current_prefs_path` ✅
2. Applies new event (adds LOC_013 to never_visit_locations)
3. Saves updated preferences to `family_preferences_updated.json`
4. Runs ItineraryOptimizer with updated preferences
5. Generates diff, traces, and LLM payloads

**D. ExplainabilityAgent** generates explanations:
- Uses LLM payloads from OptimizerAgent
- Creates natural language explanations with real POI names

#### 4. **Access Results**
```python
if result['itinerary_updated']:
    # Get updated itinerary
    new_itinerary_path = result['optimizer_output']['optimized_solution']
    
    # Get explanations
    for explanation in result['explanations']:
        print(explanation.summary)
        
    # Example output:
    # "For Family FAM_B on Day 1, we removed Lodhi Gardens from their 
    #  itinerary. This change saved 105.26 INR in transportation costs."
```

---

## Backend Integration

### REST API Pattern

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# Initialize once
processor = FeedbackProcessor()
session_manager = TripSessionManager(storage_dir="./sessions")

class FeedbackRequest(BaseModel):
    trip_id: str
    family_id: str
    message: str

@app.post("/api/trips/{trip_id}/feedback")
async def handle_feedback(trip_id: str, request: FeedbackRequest):
    """Process user feedback and return updated itinerary + explanations."""
    
    try:
        result = processor.process_feedback(
            trip_id=trip_id,
            family_id=request.family_id,
            message=request.message,
            session_manager=session_manager,
            output_dir=Path(f"./output/{trip_id}")
        )
        
        return {
            "success": True,
            "itinerary_updated": result["itinerary_updated"],
            "explanations": [exp.summary for exp in result.get("explanations", [])],
            "iteration": result.get("iteration", 0)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Key Context Parameters

**CRITICAL**: Always pass these in context:

```python
context = {
    "family_id": family_id,
    "trip_id": trip_id,
    "current_preferences_path": str(prefs_path),  # ✅ Cumulative prefs
    "base_itinerary": session.baseline_itinerary_path,  # Skeleton
    "previous_solution": str(previous_solution),  # For comparison
    "output_dir": str(iteration_dir)  # Where to save outputs
}
```

---

## Common Issues & Solutions

### Issue 1: Must-Visit Not Enforced

**Symptom**: User requests "Add Akshardham" but it doesn't appear in itinerary.

**Cause**: OptimizerAgent not receiving cumulative preferences.

**Solution**: Ensure `current_prefs_path` is passed in context:
```python
context = {
    "current_preferences_path": str(prefs_path),  # ✅ REQUIRED
    ...
}
```

---

### Issue 2: Empty Explanations

**Symptom**: LLM payloads are empty `[]`, no explanations generated.

**Cause**: No changes between iterations (e.g., POI was already in itinerary).

**Solution**: This is expected behavior. Only generate explanations when actual changes occur.

---

### Issue 3: Stale Preferences

**Symptom**: Two preference files with different content.

**Cause**: Old implementation saved session state separately.

**Solution**: Fixed in latest version. Only `family_preferences_updated.json` is generated now.

---

### Issue 4: Wrong Field Names

**Symptom**: `TypeError: FamilyPreference() got unexpected keyword argument 'must_visit'`

**Cause**: Using old field names `must_visit` instead of `must_visit_locations`.

**Solution**: Always use:
- `must_visit_locations` ✅
- `never_visit_locations` ✅

---

## Testing & Verification

### Run Demo Script

```bash
cd c:\Amlan\Codes\Voyageur_Studio
python ml_or\demos\reopt_hard_constraints\run_demo.py
```

### Verify Outputs

Check each iteration directory for:
- ✅ `family_preferences_updated.json` - Updated preferences
- ✅ `optimized_solution.json` - New itinerary
- ✅ `llm_payloads.json` - Structured change data
- ✅ `explanations.md` - Natural language explanations
- ❌ `preferences_updated.json` - Should NOT exist (removed)

### Verify Preferences Are Cumulative

```python
# iteration_2/family_preferences_updated.json
{
  "family_id": "FAM_A",
  "must_visit_locations": ["LOC_006"]  # ✅ From iteration 1
}

# iteration_3/family_preferences_updated.json  
{
  "family_id": "FAM_A",
  "must_visit_locations": ["LOC_006"],  # ✅ Still present
  "never_visit_locations": ["LOC_013"]  # ✅ Added in iteration 3
}
```

---

## Summary

### Critical Success Factors

1. ✅ **Pass `current_prefs_path` to OptimizerAgent** - Ensures cumulative preferences
2. ✅ **Use correct field names** - `must_visit_locations`, not `must_visit`
3. ✅ **Single source of truth** - Only `family_preferences_updated.json` per iteration
4. ✅ **Load actual LLM payloads** - Use OptimizerAgent's output, not fallback

### Production Checklist

- [ ] OptimizerAgent receives `current_prefs_path` parameter
- [ ] Preference files use `must_visit_locations` / `never_visit_locations`
- [ ] Only one preference file generated per iteration
- [ ] ExplainabilityAgent loads from `llm_payloads.json`
- [ ] Session state persists across API calls (use database, not files)
- [ ] Environment variables set (`GROQ_API_KEY`)

---

## See Also

- [Backend Integration Guide](./Backend_Integration_Guide.md) - REST/WebSocket patterns
- [Production API Guide](./PRODUCTION_API_GUIDE.md) - Base itinerary vs. optimized solutions
- [Demo Script](../demos/reopt_hard_constraints/run_demo.py) - Working implementation

**For questions or issues, refer to the conversation logs in the artifacts directory.**
