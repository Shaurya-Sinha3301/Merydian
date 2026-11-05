# Merydian Project Architecture

## Backend Architecture
The backend is built with **FastAPI** (Python) and uses a layered architecture:
1. **API Routers (`app/api`)**: Expose REST endpoints (e.g., `/trips`, `/itinerary`, `/feedback`, `/demo`).
2. **Services (`app/services`)**: Encapsulate business logic. Key services include:
   - `trip_service.py`: Handles trip initialization and family preference management.
   - `optimizer_service.py`: Interfaces with the ML Operations (`ml_or`) for itinerary and hotel optimization.
   - `event_service.py`: Manages the event-driven feedback stream.
   - `explainability_service.py`: Generates reasoning for optimization diffs.
3. **Data Access (`app/models`)**: Uses **SQLModel** (SQLAlchemy) for PostgreSQL interaction. Models like `TripSession`, `Itinerary`, `Preference`, and `Event` represent the schema.
4. **Task Queue (`app/workers`)**: Uses **Celery** + **Redis** for asynchronous processing, primarily running the heavy optimizer tasks (`agent_tasks.py`).
5. **Real-time Notifications**: WebSockets (`main.py`) provide live updates to agents and travellers, brokered via Redis Pub/Sub.

## Frontend Architecture (V2)
The frontend is a **React Single Page Application (SPA)** built with **Vite** and **TypeScript**:
1. **Routing**: Uses `react-router-dom` (`src/router/index.tsx`) with layout wrappers (`AuthenticatedLayout`, `GuestLayout`).
2. **State Management**: Uses **Zustand** stores (`auth.store.ts`, `trip.store.ts`, `ui.store.ts`) for global state.
3. **Data Fetching**: Axios clients (`src/services/*.ts`) map to backend APIs.
4. **Structure**: Feature-based architecture under `src/features/` and page-level components under `src/pages/`.
5. **Styling**: Tailwind CSS (configured in `index.css`).

## Optimizer Flow
1. A trip is initialized via `TripService.initialize_trip` which sets up the baseline.
2. Preferences are gathered and sent to the ML optimizer (`ml_or/itinerary_optimizer.py`).
3. Optimization runs asynchronously via Celery (`optimizer_service.py`).
4. Output is saved as a new `Itinerary` version linked to the `TripSession`.

## Feedback Flow
1. User submits feedback on the frontend (`FeedbackPage`).
2. Request hits `/feedback` endpoint, mapped to `feedback.service.ts`.
3. Backend converts feedback to an Event via `event_service.py`.
4. Event triggers a Celery background task to re-run the optimizer with updated constraints.

## Explainability Flow
1. Once the optimizer generates a new itinerary, it is compared with the previous version.
2. Diffs are extracted (`schemas/itinerary_diff.py`).
3. `explainability_service.py` generates natural language explanations for the changes (e.g., "Added Akshardham due to high interest in architecture").
4. Frontend consumes this via `/explainability` API and displays it in `ExplainabilityPage`.

## Authentication Flow
1. User logs in via `LoginPage.tsx`.
2. Backend `/auth` route authenticates and returns JWTs.
3. Frontend stores tokens in `auth.store.ts` and uses Axios interceptors to attach the Bearer token to subsequent requests.
4. WebSocket connections authenticate using tokens or query params.

## Optimization Lifecycle
1. **Baseline**: Initial skeleton itinerary generation.
2. **Feedback**: User interactions trigger constraint updates.
3. **Optimize**: Asynchronous Celery task runs the ML optimization.
4. **Diff**: System calculates structural differences between versions.
5. **Approval**: User reviews and approves/rejects the suggested changes.
6. **Timeline Update**: Finalized schedule is published to the `TimelinePage`.
