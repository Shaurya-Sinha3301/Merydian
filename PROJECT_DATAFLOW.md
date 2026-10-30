# Merydian Project Dataflow

## E2E Optimization and Feedback Loop

```mermaid
flowchart TD
    User([User / Traveller]) -->|1. Submits Feedback| Feedback(Frontend Feedback Component)
    
    Feedback -->|2. API Call| Backend(Backend API: /events)
    
    Backend -->|3. Event Stored & Queued| Redis[(Redis Pub/Sub & Queue)]
    
    Redis -->|4. Trigger Async Task| Celery(Celery Worker: agent_tasks)
    
    Celery -->|5. ML Computation| Optimizer(Optimizer: ml_or engine)
    
    Optimizer -->|6. Calculate Differences| Diff(Diff Generator)
    
    Diff -->|7. Generate Reasoning| Explainability(Explainability Pipeline)
    
    Explainability -->|8. Push New Version| DB[(PostgreSQL)]
    
    DB -->|9. Notify Frontend via WebSocket| Approval(Frontend Diff Viewer / Approval)
    
    Approval -->|10. User Approves| User
    
    Approval -->|11. Finalize Itinerary| Timeline(Timeline Update)
```

## Detailed Steps
1. **User**: Provides feedback (e.g., "We prefer a more relaxed pace", or "Add Taj Mahal to the trip").
2. **Feedback**: The `FeedbackPage.tsx` sends a structured request to the backend.
3. **Backend**: `event_service.py` receives the feedback, updates the `PreferenceHistory`, and publishes an event.
4. **Optimizer**: The Celery worker picks up the event, passes constraints to `itinerary_optimizer.py`.
5. **Diff**: The new solution is compared against the `current_itinerary_id` to generate structural diffs.
6. **Explainability**: `explainability_service.py` uses context to map diffs to human-readable explanations.
7. **Approval**: The user reviews the changes in `DiffViewerPage.tsx`.
8. **Timeline Update**: Upon approval, the new itinerary version becomes active, updating `TimelinePage.tsx` and pushing final updates via WebSockets.
