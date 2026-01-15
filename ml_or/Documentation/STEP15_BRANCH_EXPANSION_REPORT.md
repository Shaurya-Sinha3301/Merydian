# 🚀 Step 15: Preference-Driven Branch Expansion Report

**Feature**: Dynamic Discovery of Optional POIs.
**Status**: INSTALLED & VERIFIED.

---

## 1. The Upgrade
Previously, the Voyageur Optimizer was a "router" — it only optimized the specific locations you gave it in `base_itinerary.json`.
Now, it is a "planner". It actively **scans the world** (`locations.json`) to find relevant additions.

## 2. How It Works
Before creating the optimization model for any Day, the engine runs this pre-processing logic:

1.  **Anchoring**: Calculates the geographic center (Lat/Lng) of the day's mandatory "Skeleton" POIs (e.g., Red Fort).
2.  **Geofencing**: Finds all locations within **5.0 km** of this center.
3.  **Personalized Scoring**: Scores these neighbors against each family's `interest_vector`.
4.  **Ranking**: Selects the top **5 unique candidates** that are NOT already in the plan.
5.  **Injection**: Dynamically adds them to the Candidate List with `role="BRANCH"`.

## 3. Verification Test
We ran a test case (`test_branch_expansion.py`) with a minimal input:
*   **Input**: Day 1 = ONLY [Red Fort] (Skeleton).
*   **Families**: FAM_A (History), FAM_B (Nightlife).
*   **Result**:
    *   The engine automatically pulled in **LOC_003 (India Gate)** and **LOC_046 (Hauz Khas)**.
    *   It successfully scheduled them as optional stops.
    *   Total candidates expanded from 4 (Skeleton+Anchors) to ~8.

## 4. Safety Mechanisms
To prevent "blowing up" the solver (exponential complexity):
*   **Cap**: Max **12** total candidates per day.
*   **Radius**: Fixed at 5km (configurable) to prevent cross-city wild jumps.
*   **Filter**: Excludes `never_visit` locations completely.

## 5. Conclusion
The engine now exhibits "Product-Grade" behavior. You give it the "Must-Sees", and it fills in the gaps with "Nice-to-Sees" tailored to the users.
