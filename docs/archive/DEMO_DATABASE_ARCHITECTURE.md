# Merydian Demo Database Architecture

## Overview

The Demo Database Architecture establishes a fully relational, stateful environment without altering the system's core database models or polluting production architectures. 
The system uses pre-generated immutable JSON fixtures located in `backend/demo_data/*.json` as the seed configuration for dynamically generating rich relational data.

## Key Components

### 1. Immutable Fixtures (`backend/demo_data/*.json`)
These JSON files act as the canonical input configuration for different personas. They dictate the `trip_id`, baseline summaries, and the persona's configuration (travelers, budget, constraints) without directly storing all downstream entities like jobs or detailed family structures.

### 2. Demo Provisioning Service (`app/services/demo_provision_service.py`)
This service parses the immutable fixtures and `PERSONAS` from `scripts/generate_demo_data.py` to create real relational database records for:
- **Users**: Creating authenticated traveler users (e.g., `family_vacation@demo.merydian.com`) and a global `admin@demo.merydian.com`.
- **Families**: Creating family groups with populated `family_code` and `preferences`.
- **TripSessions**: Establishing the central trip entity required by the optimizer.
- **Itineraries**: Generating baseline (v1) and optimized (v2) itinerary paths to populate history.
- **AgentJobs**: Simulating completed and pending agent tasks to populate the Agent Dashboard.

### 3. Demo API (`app/api/demo.py`)
Provides deterministic endpoints for demo interaction:
- `POST /demo/reset`: Completely clears demo data and re-provisions it using the Demo Provisioning Service.
- `POST /demo/load/{persona}`: Loads a specific persona, generating and returning an access token (JWT) to immediately drop the user into the authenticated UI, establishing isolated session state.

### 4. Real-time Notifications (Redis Pub/Sub & WebSockets)
The `execute_agent_job_task` Celery worker publishes a `JOB_COMPLETED` event to the `booking_notifications` and `traveller_notifications` Redis channels. 
The FastAPI WebSocket manager (`app/core/websocket.py`) forwards this to connected React clients via the `useWebSockets.ts` hook. The hook reacts by calling `queryClient.invalidateQueries` which triggers a live UI update on the dashboards.

## Data Flow Diagram

```mermaid
graph TD
    A[demo_data/*.json] -->|Parsed by| B(DemoProvisionService)
    B -->|Inserts| C[(PostgreSQL DB)]
    C -->|Creates| U[Users]
    C -->|Creates| F[Families]
    C -->|Creates| T[TripSessions & Itineraries]
    C -->|Creates| J[AgentJobs]
    
    D[POST /demo/load/{persona}] -->|Authenticates| E[Returns JWT]
    E -->|Frontend hook| F2[useAuthStore]
    
    W[Celery Worker] -->|Publish| R[Redis]
    R -->|Subscribe| WS[FastAPI WS Manager]
    WS -->|JOB_COMPLETED| UI[useWebSockets.ts]
    UI -->|Invalidates| Q[React Query]
```
