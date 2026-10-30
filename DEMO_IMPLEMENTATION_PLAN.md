# Production Demo Implementation Plan

This plan details how to wire up the existing Merydian demo artifacts into a fully functional, production-like environment without inventing new UI logic or duplicating services.

## User Review Required

> [!WARNING]
> We will remove all mock data (e.g., hardcoded budgets and default trip IDs) from the frontend. This means the frontend will break if the database is empty. You must run the new database seed script to view the frontend correctly. 

## Open Questions

> [!IMPORTANT]
> Where should the "Demo Persona Selector" live in the UI? The easiest approach is to add a dropdown to the `LoginPage` or a special "Demo Utilities" card on the `CustomerDashboardPage` to trigger the backend seed endpoint. I plan to put it on the `CustomerDashboardPage` as a dedicated action button unless you advise otherwise.

## Proposed Changes

### Backend: Database Seeding & Demo Endpoints

Currently, `backend/scripts/generate_demo_data.py` outputs JSON to the filesystem. `api/demo.py` loads this JSON, but does not inject it into PostgreSQL tables, meaning standard APIs like `GET /trips` return empty lists. 

#### [MODIFY] [demo.py](file:///d:/Projects/Merydian/backend/app/api/demo.py)
- **Reason**: We need the demo loading endpoint to inject the JSON data into the actual database models (`User`, `Family`, `TripSession`, `Itinerary`) instead of just returning the JSON.
- **Changes**: Modify `load_demo_data` to parse the JSON, create a mock `User`, a `Family`, and use `TripService` or direct SQLModel inserts to persist the `TripSession` and `Itinerary`.
- **Impact**: Enables all existing REST APIs to naturally fetch demo data.

#### [NEW] [seed_demo_db.py](file:///d:/Projects/Merydian/backend/scripts/seed_demo_db.py)
- **Reason**: We need a CLI script to prepopulate the database with the personas defined in `demo_data` prior to running the server.
- **Changes**: Create a script that loops through `demo_data/*_trip.json` and populates the PostgreSQL database maintaining foreign key integrity.
- **Dependencies**: Depends on existing schemas in `app/models`.

---

### Frontend: Remove Mock Data & Bind to APIs

The frontend must use real backend DTOs and rely entirely on standard API calls.

#### [MODIFY] [TripOverviewPage.tsx](file:///d:/Projects/Merydian/frontend%20V2/src/pages/TripOverviewPage.tsx)
- **Reason**: Currently uses a hardcoded `'default-trip'` ID and dummy budget stats.
- **Changes**: 
  - Remove `const actualTripId = tripId || 'default-trip';` and handle the undefined case by redirecting or showing an error.
  - Map the backend `TripDetailResponse` accurately instead of overriding with a hardcoded `budget` and `optimizationHealth` object. (If these fields don't exist in the DTO, we will omit them from the UI rather than hardcoding, or calculate them from `Itinerary` stats).
- **Impact**: The UI will accurately reflect the database state.

#### [MODIFY] [CustomerDashboardPage.tsx](file:///d:/Projects/Merydian/frontend%20V2/src/pages/CustomerDashboardPage.tsx)
- **Reason**: Needs a way to initialize demo personas and view actual active trips.
- **Changes**: 
  - Implement a `useTrips` fetch to list active DB trips.
  - Add a "Load Demo Persona" action that hits `POST /demo/load/{persona}` and invalidates the trip list query on success.
- **Impact**: Demonstrators can reset and inject personas dynamically from the UI.

## Verification Plan

### Automated Tests
- Run backend pytest suite to ensure no existing routing or service logic breaks.
- `pytest tests/api/test_demo.py` (To be created) to verify DB seed endpoint accurately populates relationships.

### Manual Verification
1. Drop database and run `python scripts/seed_demo_db.py`.
2. Start the backend and frontend servers.
3. Log in to the frontend. Ensure the Customer Dashboard lists the populated trips.
4. Click on a trip and verify that `TripOverviewPage` loads without dummy data and correctly fetches stats from standard endpoints.
