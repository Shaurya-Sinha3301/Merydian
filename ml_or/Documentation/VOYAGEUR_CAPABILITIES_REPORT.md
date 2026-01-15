# 📊 Voyageur Optimizer Agent: Capabilities Report

**Date**: January 15, 2026
**Version**: 1.0 (Core Engine Complete)

---

## 1. Executive Summary
The Voyageur Optimizer is a specialized AI agent designed to solve the **Multi-Family, Multi-Day Itinerary Problem**. Unlike standard TSP solvers, it handles the complex social dynamics of group travel, allowing families to split up ("Diverge") based on interest/budget while forcing them to reunite for key shared experiences ("Synchronization").

## 2. What The Agent CAN Do (Verified Features)

### A. Complex Group Dynamics
- **Handle Conflicting Interests**: Can optimize for groups with opposing traits (e.g., "History Buffs" vs "Nightlife Lovers" vs "Budget Travelers") simultaneously.
- **Divergence Logic**: Automatically decides when families should split up.
    - *Example*: FAM_A goes to Akshardham ($$), FAM_B waits or does a free activity because they hate temples.
- **Strict Synchronization**: Enforces "Shared Bus" logic. Even if families split, they must reunite at specific "Skeleton" locations at the exact same time.

### B. Time & Space Constraints
- **Multi-Day Sequencing**: Generates itineraries spanning 3+ days, respecting "Hotel Anchors" (Starts/Ends at hotel daily).
- **Strict Time Windows**: Enforces mandatory windows for specific events.
    - *Example*: "Lunch MUST start between 12:30 and 13:00".
    - *Example*: "Dinner MUST happen between 19:30 and 21:00".
- **Physical Reality**: Uses real-world travel times and costs (Metro vs Cab) derived from a Transport Graph.

### C. Economic Reliability
- **Budget Sensitivity**: Respects each family's budget multiplier. Will drop expensive optional POIs for budget-conscious families.
- **Wait vs Pay**: Can calculate if it's "cheaper" (in utility) for a family to wait for 1 hour than to pay entrance fees for a site they dislike.

---

## 3. What The Agent CANNOT Do (Limitations)

### A. Real-Time Adaptability
- **❌ No Live Traffic**: The engine uses static averages found in [transport_graph.json](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/data/transport_graph.json). It does not query Google Maps API in real-time.
- **❌ No Dynamic Rescheduling**: If a family is 15 minutes late, the agent cannot "adjust" the plan on the fly without a full re-optimization run.

### B. Deep Psychological Modeling
- **❌ Simplified Fatigue**: While it tracks "Day Duration", it does not have a complex "Energy Bar" that depletes per meter walked.
- **❌ No "Soft" Windows**: Time Windows (Lunch) are strict hard constraints. It cannot intelligently "squeeze" a quick lunch if the schedule is tight—it will simply fail (return Infeasible).

### C. Output & Visualization
- **❌ No Maps**: It produces data (JSON/Text), not visual map images.
- **❌ No Natural Language Generation**: It is a math engine. It outputs `arrival_time: 12:30`. It does not write "Enjoy a lovely lunch at Connaught Place." (That is the job of the LLM wrapping it).

---

## 4. Technical Specifications

| Feature | Status | Implementation |
| :--- | :--- | :--- |
| **Algorithm** | CP-SAT | Google OR-Tools Constraint Solver |
| **Input** | JSON | [family_preferences.json](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/data/family_preferences.json), [base_itinerary.json](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/data/base_itinerary.json) |
| **Output** | JSON | [final_optimized_trip.json](file:///c:/Amlan/Codes/Voyageur_Studio/ml_or/data/final_optimized_trip.json) |
| **Scale** | ~3-5 Families | Verified with 3 distinct families |
| **Duration** | ~3-7 Days | Verified with 3 Days |

---

## 5. Conclusion
The Voyageur Optimizer is a **Production-Ready Backend Engine**. It solves the mathematical heavy lifting of group coordination, freeing up the frontend/LLM to focus on user experience and description.
