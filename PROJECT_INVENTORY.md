# Merydian Project Inventory

## Existing Pages (Frontend V2)
- `AgentDashboardPage.tsx`
- `ApiPlayground.tsx`
- `CustomerDashboardPage.tsx`
- `DiffViewerPage.tsx`
- `ExplainabilityPage.tsx`
- `FeedbackPage.tsx`
- `HealthCheck.tsx`
- `LoginPage.tsx`
- `OptimizationProgressPage.tsx`
- `SettingsPage.tsx`
- `TimelinePage.tsx`
- `TripOverviewPage.tsx`

## Existing Components (Frontend V2)
- Layouts: `GuestLayout.tsx`, `AuthenticatedLayout.tsx`
- Common UI: `Breadcrumbs.tsx`, `Button.tsx` (and other standard UI atoms in `src/components`)
- Features: `TripCard.tsx` (under `src/features/trips`)

## Existing APIs (Backend Routes)
- `/auth` (Authentication)
- `/health` (Health Checks)
- `/events` (Event streaming & feedback)
- `/itinerary` (Itinerary management)
- `/agent` (Agent Dashboard)
- `/bookings` (Booking statuses)
- `/flights` (Flight searches & management)
- `/users` (User management)
- `/families` (Family groups)
- `/jobs` (Celery job tracking)
- `/demo` (Demo data loading endpoints)

## Existing DTOs & Schemas (Backend `app/schemas`)
- `auth.py`, `booking.py`, `events.py`, `family.py`, `flight.py`
- `frontend_dto.py` (Specific UI payload formatting)
- `itinerary.py`, `itinerary_diff.py`
- `policy.py`, `user.py`

## Existing Services (Backend `app/services`)
- `agent_service.py`, `agent_job_service.py`, `agent_workflow_service.py`
- `booking_service.py`, `tbo_service.py`, `tbo_air_service.py` (3rd party integrations)
- `city_code_cache.py`, `conflict_resolver.py`, `constraint_validator.py`
- `event_service.py`
- `explainability_service.py`, `explanation_service.py`
- `family_service.py`, `user_service.py`
- `itinerary_service.py`, `itinerary_option_service.py`
- `optimizer_service.py`
- `policy_service.py`, `preference_service.py`
- `travel_data_provider.py`
- `trip_service.py`

## Existing Services / API Clients (Frontend V2 `src/services`)
- `agents.service.ts`
- `auth.ts`
- `client.ts` (Axios base instance)
- `diff.ts`
- `explainability.service.ts`, `explainability.ts`
- `feedback.service.ts`, `feedback.ts`
- `jobs.ts`
- `optimization.service.ts`
- `settings.ts`
- `timeline.ts`
- `trips.service.ts`, `trips.ts`

## Existing Hooks (Frontend V2 `src/hooks`)
- `useTrips` (React Query hook for trip fetching)
- *(And associated query hooks mapped to the services above)*

## Existing Models (Database `app/models`)
- `agent_job.py`, `booking_job.py`
- `event.py`
- `family.py`, `user.py`
- `flight_booking.py`, `hotel_booking.py`
- `itinerary.py`, `itinerary_explanation.py`, `itinerary_option.py`
- `policy.py`
- `preference.py`, `preference_history.py`
- `token_blacklist.py`
- `trip_session.py`, `user_session.py`

## Existing Scripts (`backend/scripts`)
- `generate_demo_data.py`: Generates JSON fixture files for predefined trip personas.
- `init_auth_db.py`: Initializes auth related database schemas/users.
- `init_db.py` (in root/app): General DB initialization.

## Existing Seed Files (`backend/demo_data`)
- `Family_Vacation_trip.json`
- `Luxury_Couple_trip.json`
- `Budget_Backpacker_trip.json`
- `Elderly_Travelers_trip.json`
- `Accessibility_Trip_trip.json`

## Existing Demo Functionality
- Endpoint `POST /demo/load/{persona}` loads pre-calculated deterministic JSON data directly from `backend/demo_data` to simulate a fully populated trip without needing the LLM/ML optimizer to run live.
