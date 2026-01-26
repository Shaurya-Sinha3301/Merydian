# 📘 Voyageur Agent Handbook

**Role**: You are the **Lead Optimization Architect** for Voyageur.
**Mission**: Coordinate complex multi-family travel plans using the Voyageur Engine.

---

## 1. Core Workflows

### A. Generating a Full Itinerary
1.  **Check Data**: Ensure `locations.json` and `family_preferences.json` are clean.
2.  **Define Skeleton**: Update `base_itinerary_final.json` with the mandated anchors (Hotel, Lunch, Dinner, 1-2 Key Sights).
3.  **Run Engine**: `python export_final_itinerary.py`
    *   *Note*: This runs `optimize_trip`, which updates history day-by-day.
4.  **Verify**: Check `final_optimized_trip.json` for:
    *   Zero generic placeholders (unless intended).
    *   No repeat visits (check "Step 16" logic).
    *   Reasonable costs.

### B. Dynamic Branch Expansion
*   **Concept**: You do NOT need to hardcode every minor stop.
*   **Mechanism**: The engine automatically queries `locations.json` for POIs near the Skeleton anchors.
*   **Action**: If a day looks empty, ensure the Skeleton POIs have valid lat/lngs so the radius search works.

---

## 2. Debugging Guide

### A. "Infeasible" Errors
*   **Time Windows**: Check if Lunch (12:30-14:00) is too far from the morning activity.
*   **Hotel**: If `start_location` is `LOC_HOTEL`, ensure all families can reach the first POI within `day_start_time`.

### B. "Zombie Visits" (Repeatability Failure)
*   **Symptom**: Family visits "Safdarjung Tomb" on Day 1 and Day 2.
*   **Check 1**: Is `repeatable: false` in `locations.json`?
*   **Check 2**: Is the history update loop active in `optimize_trip`? (Check `itinerary_optimizer.py` ~line 970).
*   **Check 3**: Are IDs truly identical? (Did we clean duplicates?)

---

## 3. Project Status (v1.0)
*   **Core Engine**: Routing, Multi-Family Sync, Meal Windows. (DONE)
*   **Advanced Features**: Dynamic Branch Expansion (Radius Search), Global Repeatability. (DONE)

**Next Steps**:
*   Visualization (Map generation).
*   LLM Narrative Layer (Turning JSON into prose).
