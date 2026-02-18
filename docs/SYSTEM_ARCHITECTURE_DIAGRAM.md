# Complete System Architecture - Initial Setup to Optimization

```mermaid
graph TB
    subgraph "PHASE 1: Initial Setup"
        A[Frontend: Trip Setup Form] --> B[User Inputs]
        B --> C[Trip Details]
        B --> D[Family 1 Preferences]
        B --> E[Family 2 Preferences]
        
        C --> F{Form Validation}
        D --> F
        E --> F
        
        F -->|Valid| G[POST /trips/initialize]
        F -->|Invalid| H[Show Errors]
    end
    
    subgraph "PHASE 2: Backend Processing"
        G --> I[TripService.initialize_trip]
        I --> J[Validate All Preferences]
        J --> K[Generate trip_id]
        K --> L[Convert to Optimizer Format]
        L --> M[Create TripSession]
        M --> N[Save to Supabase]
    end
    
    subgraph "PHASE 3: Database Storage"
        N --> O[(Supabase trip_sessions)]
        O --> P[initial_preferences]
        O --> Q[current_preferences]
        O --> R[Trip metadata]
        
        P -.->|Never modified| P
        Q -.->|Updated by feedback| S[Feedback Loop]
    end
    
    subgraph "PHASE 4: Response"
        N --> T[Return trip_id]
        T --> U[Frontend: Navigate to /trip/trip_id]
    end
    
    subgraph "PHASE 5: Feedback & Optimization"
        U --> V[User Views Baseline]
        V --> W[User: 'Add Akshardham']
        W --> X[POST /itinerary/feedback/agent]
        X --> Y[OptimizerService]
        
        Y --> Z[Load current_preferences]
        Z --> AA[Parse Feedback]
        AA --> AB[Merge Preferences]
        AB --> AC[current_preferences += feedback]
        
        AC --> AD[Save to File: preferences.json]
        AD --> AE[ML Optimizer]
        AE --> AF[optimized_solution.json]
        AE --> AG[enriched_diffs.json]
        
        AF --> AH[Update TripSession]
        AH --> AI[Return Results]
    end
    
    subgraph "PHASE 6: Analysis"
        AG --> AJ[Extract Cost Analysis]
        AF --> AK[Generate Explanations]
        AJ --> AL[Frontend: Display Changes]
        AK --> AL
    end
    
    style A fill:#e1f5e1
    style G fill:#ffe1e1
    style N fill:#e1e5ff
    style AE fill:#fff3e1
    style AL fill:#f0e1ff
```

---

## Data Transformation Example

### Frontend Form Data:
```json
{
  "trip_name": "Delhi Tour",
  "families": [
    {
      "family_id": "FAM_A",
      "members": 4,
      "interest_vector": {"history": 0.9, ...},
      "must_visit_locations": ["LOC_008"]
    }
  ]
}
```

### Database (initial_preferences):
```json
{
  "FAM_A": {
    "family_id": "FAM_A",
    "members": 4,
    "budget_sensitivity": 0.9,
    "interest_vector": {"history": 0.9, ...},
    "must_visit_locations": ["LOC_008"],
    "never_visit_locations": []
  }
}
```

### Database (current_preferences) - Initially Same:
```json
{
  "FAM_A": {
    "family_id": "FAM_A",
    "members": 4,
    "budget_sensitivity": 0.9,
    "interest_vector": {"history": 0.9, ...},
    "must_visit_locations": ["LOC_008"],
    "never_visit_locations": []
  }
}
```

### After Feedback ("Add Akshardham"):
```json
{
  "FAM_A": {
    "family_id": "FAM_A",
    "members": 4,
    "budget_sensitivity": 0.9,
    "interest_vector": {"history": 0.9, ...},
    "must_visit_locations": ["LOC_008", "LOC_006"],  // ← Added
    "never_visit_locations": []
  }
}
```

### File Saved for ML Optimizer:
```json
{
  "family_id": "FAM_A",
  "members": 4,
  "children": 2,
  "budget_sensitivity": 0.9,
  "energy_level": 0.6,
  "pace_preference": "relaxed",
  "interest_vector": {
    "history": 0.9,
    "architecture": 0.8,
    ...
  },
  "must_visit_locations": ["LOC_008", "LOC_006"],  
  "never_visit_locations": [],
  "notes": "Budget sensitive. History buffs."
}
```

### ML Optimizer Output:
```json
{
  "days": [
    {
      "day": 1,
      "families": {
        "FAM_A": {
          "pois": [
            {"location_id": "LOC_008", "arrival_time": "09:30", ...},
            {"location_id": "LOC_006", "arrival_time": "14:00", ...}
          ]
        }
      }
    }
  ]
}
```

### Cost Analysis Extracted:
```json
{
  "total_cost_change": 150.0,
  "changes": [
    {
      "poi_name": "Akshardham",
      "cost_delta": 150.0,
      "reason": "User requested must-visit"
    }
  ]
}
```

### Final Response to Frontend:
```json
{
  "success": true,
  "explanations": [
    "We added Akshardham Temple to Day 1 at 2:00 PM. This costs ₹150 but increases satisfaction by 1.8 points."
  ],
  "cost_analysis": {
    "total_cost_change": 150.0,
    "changes": [...]
  },
  "itinerary_updated": true
}
```

---

## Complete System Summary

| Phase | Component | Input | Output | Storage |
|-------|-----------|-------|--------|---------|
| **1. Setup** | Frontend Form | User interactions | Trip data | Browser state |
| **2. Initialize** | TripService | Trip request | trip_id | Supabase |
| **3. Store** | Database | Preferences | Records | trip_sessions |
| **4. Display** | Frontend | trip_id | Baseline view | UI state |
| **5. Feedback** | FeedbackAgent | NL message | Structured event | Memory |
| **6. Merge** | OptimizerService | Event + current | Updated prefs | Database |
| **7. Optimize** | ML Optimizer | Preferences | Itinerary | Files |
| **8. Analyze** | CostAnalyzer | Diffs | Analysis | Memory |
| **9. Explain** | ExplainabilityAgent | Analysis | NL explanations | Files |
| **10. Display** | Frontend | Results | Updated UI | Browser state |

---

**Generated**: 2026-02-03  
**Purpose**: Visual system architecture overview
