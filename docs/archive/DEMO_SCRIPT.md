# End-to-End Demo Script

This script outlines the API calls necessary to execute a flawless demonstration of the Merydian optimization platform. It simulates a realistic user journey using the `Family_Vacation` deterministic data.

## 1. Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
     -d "username=demo_user&password=password123"
# Returns { "access_token": "..." }
```

## 2. Initialize Deterministic Demo
Bypasses manual trip initialization and loads pre-computed optimization outputs.
```bash
curl -X POST http://localhost:8000/api/v1/demo/load/Family_Vacation \
     -H "Authorization: Bearer <TOKEN>"
# Returns { "status": "SUCCESS", "data": { "trip_id": "..." } }
```

## 3. View Current Itinerary
Display the day-by-day flat timeline view.
```bash
curl -X GET http://localhost:8000/api/v1/itinerary/<trip_id>/timeline \
     -H "Authorization: Bearer <TOKEN>"
# Returns TimelineDTO format
```

## 4. Submit Feedback
User complains about a specific POI (e.g. "Too crowded, switch this to something relaxing").
```bash
curl -X POST http://localhost:8000/api/v1/itinerary/feedback/agent \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"message": "I do not want to visit Akshardham, it is too crowded."}'
# Returns { "job_id": "...", "status": "QUEUED" }
```

## 5. Poll Optimization Job
Frontend shows a progress bar polling every 2 seconds.
```bash
curl -X GET http://localhost:8000/api/v1/jobs/<job_id> \
     -H "Authorization: Bearer <TOKEN>"
# Returns JobDTO indicating PENDING -> OPTIMIZING -> COMPLETED
```

## 6. View Explanations & Diff
After job completion, frontend fetches the explanation cards and before/after diffs.
```bash
curl -X GET http://localhost:8000/api/v1/itinerary/explanations/trip/<trip_id> \
     -H "Authorization: Bearer <TOKEN>"
# Returns array of ExplanationDTO

curl -X GET "http://localhost:8000/api/v1/itinerary/diff?version_a=1&version_b=2" \
     -H "Authorization: Bearer <TOKEN>"
# Returns categorized DiffDTO (added, removed, modified)
```

## 7. Approve Itinerary
User clicks "Approve changes".
```bash
curl -X POST http://localhost:8000/api/v1/agent/itinerary/approve \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"trip_id": "<trip_id>", "version": 2}'
```
