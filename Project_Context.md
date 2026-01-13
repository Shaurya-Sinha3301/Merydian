Below is a **clean, complete, copy-pasteable CONTEXT FILE** you can give directly to your coding-IDE agent (Cursor, Copilot, Codeium, etc.).

This file is written as a **single authoritative instruction**, not a chat.
It tells the agent **what the project is**, **what exists**, and **exactly what YOU (Amlan) are coding**.

No fluff. No ambiguity. No scope creep.

---

# 📄 PROJECT CONTEXT FILE

**Project Name:** Agentic Group Travel Optimization System
**Role:** Amlan — Optimization Agent Lead
**Timeline:** Hackathon (4 days)
**Optimization Backend:** Google OR-Tools (CP-SAT)
**Conceptual Model:** GTTRM (Group Tour Trip Recommender Model)
**Implementation Substitute:** OR-Tools + policy-driven enumeration (GACO proxy)

---

## 1. High-Level Project Description

This project is an **agentic travel planning and recovery system** designed for **group travel**.
The system generates **initial itineraries** and **re-optimizes them in real time** when disruptions or dissatisfaction occur.

Key features:

* Group satisfaction–aware itinerary generation
* Strong preference for keeping groups together
* Temporary subgrouping allowed **only when necessary**
* Human-in-the-loop approval for changes
* Event-driven architecture (disruptions, satisfaction updates)

The system consists of **six agents**, orchestrated by a backend API.
I am responsible for **only one agent**: the **Optimization Agent**.

---

## 2. Agent Architecture (for awareness only)

The system has six agents:

1. Monitoring & Feedback Agent
2. Decision & Policy Agent
3. **Optimization Agent (THIS IS MY RESPONSIBILITY)**
4. Knowledge & Context Agent
5. Tool & Integration Agent
6. Communication & Coordination Agent

Agents communicate **only through the backend orchestrator**.
No agent calls another agent directly.

---

## 3. My Responsibility (Strict Scope)

I am implementing the **Optimization Agent**.

### I DO:

* Accept a validated JSON payload from backend
* Run optimization using Google OR-Tools
* Evaluate multiple subgrouping scenarios
* Return 2–3 ranked itinerary plans

### I DO NOT:

* Access databases
* Call external APIs
* Make policy decisions
* Decide whether subgrouping is allowed
* Handle UI or approvals
* Track satisfaction history

The optimizer is **stateless**, **deterministic**, and **replaceable**.

---

## 4. Optimization Philosophy

* OR-Tools does **not** discover subgrouping
* Subgrouping is **enumerated upstream by Policy Agent**
* I optimize **each candidate grouping independently**
* I apply a **split penalty** during scoring
* The best plan is selected by **meta-scoring**, not OR-Tools alone

This simulates **GACO-like behavior** while remaining deterministic.

---

## 5. Input Contract (Guaranteed by Backend)

The Optimization Agent receives **exactly this JSON structure**.

```json
{
  "optimization_id": "OPT_001",
  "users": ["U1","U2","U3","U4","U5"],
  "candidate_groupings": [
    [["U1","U2","U3","U4","U5"]],
    [["U1","U2","U3"],["U4","U5"]]
  ],
  "transport_options": [
    {
      "leg_id": "FL_203",
      "from": "DEL",
      "to": "BLR",
      "departure_time": "10:00",
      "arrival_time": "12:30",
      "duration_minutes": 150,
      "cost_per_person": 4500,
      "reliability_score": 0.92
    },
    {
      "leg_id": "TR_109",
      "from": "DEL",
      "to": "BLR",
      "departure_time": "09:00",
      "arrival_time": "19:30",
      "duration_minutes": 630,
      "cost_per_person": 1800,
      "reliability_score": 0.97
    }
  ],
  "constraints": {
    "latest_arrival_time": "22:00",
    "max_cost_per_person": 5000
  },
  "weights": {
    "time": 0.4,
    "cost": 0.4,
    "split_penalty": 0.2
  }
}
```

If the payload violates this structure, the optimizer should **fail fast**.

---

## 6. Optimization Logic to Implement

### Step 1 — Per-Grouping Optimization (OR-Tools)

For each `candidate_grouping`:

* Decision variable: choose **one transport option**
* Constraint: exactly one option must be selected
* Constraints:

  * cost ≤ max_cost_per_person
  * arrival_time ≤ latest_arrival_time
* Objective:

  * minimize weighted cost + weighted duration

Use **OR-Tools CP-SAT**.

---

### Step 2 — Meta-Scoring (Outside OR-Tools)

After solving each grouping:

```
meta_score =
  w_time  * normalized_duration
+ w_cost  * normalized_cost
+ w_split * (number_of_subgroups - 1)
```

Lower score = better plan.

Splits are always penalized.

---

### Step 3 — Ranking & Labeling

From all feasible plans:

* Sort by `meta_score`
* Return top 2–3 plans
* Assign labels:

  * "fastest"
  * "cheapest"
  * "balanced"

---

## 7. Output Contract

The optimizer must return **machine-readable plans** only.

```json
[
  {
    "plan_id": "PLAN_A",
    "label": "balanced",
    "grouping": [["U1","U2","U3","U4","U5"]],
    "chosen_legs": ["FL_203"],
    "arrival_time": "12:30",
    "total_cost_per_person": 4500,
    "meta_score": 0.81
  },
  {
    "plan_id": "PLAN_B",
    "label": "cheapest",
    "grouping": [["U1","U2","U3"],["U4","U5"]],
    "chosen_legs": ["TR_109","TR_109"],
    "arrival_time": "19:30",
    "total_cost_per_person": 1800,
    "meta_score": 0.73
  }
]
```

If no feasible solution exists:

```json
{
  "status": "NO_FEASIBLE_PLAN"
}
```

---

## 8. Edge Cases to Handle

* No transport satisfies constraints
* Split option worse than non-split
* Equal meta-scores → prefer:

  1. fewer subgroups
  2. earlier arrival

Never force subgrouping.

---

## 9. File Structure to Create

```
optimizer/
 ├── optimizer.py        # main entry point
 ├── model.py            # OR-Tools CP-SAT model
 ├── scorer.py           # meta-scoring logic
 ├── schemas.py          # input/output validation
 ├── utils.py            # helpers (time parsing, normalization)
 └── sample_input.json   # test payload
```

The optimizer must be runnable via:

```bash
python optimizer.py sample_input.json
```

---

## 10. Non-Goals (Do NOT Implement)

* Ant Colony Optimization
* Learning models
* Satisfaction prediction
* Database access
* API servers
* UI formatting
* Logging dashboards

---

## 11. Guiding Principle

> “The Optimization Agent is stateless, policy-driven, and replaceable.”

If a feature violates that sentence, it does not belong here.

---

## 12. Expected Outcome

At the end of implementation:

* Backend can call optimizer as a black box
* Agent UI can show ranked recovery plans
* System demonstrates group-aware optimization
* Judges see real decision intelligence under disruption

---


