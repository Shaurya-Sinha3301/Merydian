# Frontend Integration Guide

This guide details how the frontend should integrate with the Merydian optimization backend API. The API is designed to return stable, presentation-ready DTOs (Data Transfer Objects) mapping directly to frontend UI components.

## 1. Authentication Flow
- **Login Endpoint:** `POST /api/v1/auth/login`
- **Mechanism:** Standard OAuth2 Password Bearer flow.
- **Usage:** Include the access token in the `Authorization` header for all requests: `Bearer <token>`.
- The token securely encodes the user context and the `family_id` to route requests automatically.

## 2. API Sequence Diagrams

### Trip Initialization
1. Frontend calls `POST /api/v1/initialize-with-optimization` with destination/dates.
2. Backend creates a job and returns the `trip_id` and `job_id`.
3. Frontend begins polling `GET /api/v1/jobs/{job_id}`.

### Feedback Loop
1. User provides feedback on a specific activity.
2. Frontend calls `POST /api/v1/itinerary/feedback/agent` with the feedback string.
3. Backend schedules an agentic workflow and returns a `job_id`.
4. Frontend polls `GET /api/v1/jobs/{job_id}`.
5. When `status == "COMPLETED"`, frontend fetches the updated timeline and explainability diffs.

## 3. Polling Workflow
We have established a unified `/jobs/{id}` endpoint to prevent UI locking and give deterministic progress indication.
- **Endpoint:** `GET /api/v1/jobs/{job_id}`
- **Response Format:**
  ```json
  {
    "job_id": "uuid",
    "status": "PROCESSING",
    "current_stage": "OPTIMIZING",
    "progress_percentage": 50,
    "description": "Running ML Optimizer.",
    "result_available": false
  }
  ```
- **Stages:** `PENDING` -> `UNDERSTANDING_FEEDBACK` -> `GENERATING_CONSTRAINTS` -> `OPTIMIZING` -> `GENERATING_EXPLANATION` -> `COMPLETED` / `FAILED`.

## 4. Explainability & Diff Payloads
The Explainability and Diff APIs deliver fully processed data that requires zero frontend transformations.

### Explainability (`GET /api/v1/itinerary/explanations/{itinerary_id}`)
Returns ready-to-render explanation cards:
```json
{
  "explanations": [
    {
      "activity_changed": "Taj Mahal",
      "reason": "modified",
      "human_explanation": "Shifted to morning due to lower heat and better lighting."
    }
  ]
}
```

### Diffs (`GET /api/v1/itinerary/diff?version_a=1&version_b=2`)
Returns categorized arrays for before/after comparison views:
```json
{
  "added_activities": [...],
  "removed_activities": [...],
  "time_changes": [...]
}
```

## 5. Error Handling
All errors follow the `ApiErrorResponse` schema:
```json
{
  "status": "FAILED",
  "error_code": "INFEASIBLE_CONSTRAINTS",
  "title": "Optimization Failed",
  "message": "The requested itinerary cannot satisfy all mandatory locations.",
  "suggestions": [
    "Remove one must-visit location"
  ]
}
```
The frontend should display `title` and `message` to the user and render `suggestions` as actionable buttons.
