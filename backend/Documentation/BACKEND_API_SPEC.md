# 📘 BACKEND API ENDPOINT SPECIFICATION

**Project:** MeiliAi - Multi-Family Travel Coordination Platform  
**Base URL:** `/api/v1`  
**Last Updated:** January 2026

---

## Table of Contents

1. [Authentication Endpoints](#1-authentication-endpoints)
   - [POST /auth/login](#11-post-authlogin---user-login)
2. [Event Endpoints](#2-event-endpoints)
   - [POST /events/](#21-post-events---create-event)
3. [Itinerary Endpoints](#3-itinerary-endpoints)
   - [GET /itinerary/current](#31-get-itinerarycurrent---get-current-itinerary)
   - [POST /itinerary/feedback](#32-post-itineraryfeedback---submit-feedback)
   - [POST /itinerary/poi-request](#33-post-itinerarypoi-request---submit-poi-request)
4. [Agent Dashboard Endpoints](#4-agent-dashboard-endpoints)
   - [GET /agent/itinerary/options](#41-get-agentitineraryoptions---get-itinerary-options)
   - [POST /agent/itinerary/approve](#42-post-agentitineraryapprove---approve-itinerary-option)
5. [Booking Endpoints](#5-booking-endpoints)
   - [POST /bookings/execute](#51-post-bookingsexecute---execute-booking)

---

# 1. Authentication Endpoints

---

## 1.1 POST /auth/login - User Login

### 1️⃣ Endpoint Identity

| Property | Value |
|----------|-------|
| **Endpoint Name** | User Login |
| **Endpoint URL** | `POST /api/v1/auth/login` |
| **Version** | v1 |
| **Owner** | Backend / Auth System |
| **Tags** | `auth` |

---

### 2️⃣ Purpose & Responsibility

This endpoint authenticates users (travellers or agents) and issues JWT access tokens for subsequent API requests. It validates credentials against the user store and returns a bearer token containing the user's identity, role, and family association. The token is used by all protected endpoints to verify identity and authorize actions based on role (traveller vs agent).

---

### 3️⃣ Who Calls This? (Actors)

| Actor | Why |
|-------|-----|
| Traveller (via Mobile/Web App) | Login to access their itinerary and submit requests |
| Travel Agent (via Agent Dashboard) | Login to access agent-specific features like approvals |

---

### 4️⃣ Who Listens / Consumes This? (Downstream)

| Consumer | How |
|----------|-----|
| All Protected Endpoints | Use JWT token for authentication |
| Frontend Applications | Store token for subsequent API calls |

---

### 5️⃣ Request Flow

```
1. HTTP POST request with credentials (OAuth2 form)
2. Credentials validated against user store (currently mocked)
3. JWT token generated with user claims (sub, role, family_id)
4. Token returned immediately (synchronous)
```

**Blocking:** ✅ Yes (synchronous response)

---

### 6️⃣ HTTP Methods & Semantics

| Method | Meaning |
|--------|---------|
| **POST** | Authenticate and create new session token |
| Idempotency | ❌ No (new token each time) |
| Side Effects | ✅ Yes (creates session state in token) |

---

### 7️⃣ Input Schema

**Content-Type:** `application/x-www-form-urlencoded` (OAuth2 Password Flow)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | User email address |
| `password` | string | ✅ | User password |

**Mock Credentials (Development):**
- Traveller: `traveller@example.com` / `password`
- Agent: `agent@example.com` / `password`

---

### 8️⃣ Output Schema

**Schema Name:** `Token`

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT bearer token |
| `token_type` | string | Always "bearer" |

**JWT Payload Contains:**
| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | User ID |
| `role` | string | "traveller" or "agent" |
| `family_id` | string | Family group ID (null for agents) |
| `exp` | int | Token expiration timestamp |

---

### 9️⃣ Database Interaction

| Property | Value |
|----------|-------|
| **DB Touched?** | ❌ No (currently mocked) |
| **Tables/Repos** | `users` (TODO) |
| **Operation Type** | Read-only (credential validation) |

**Implementation Status:** 🟡 MOCKED - Hardcoded credentials, no actual DB lookup

---

### 🔟 Event Emission

| Property | Value |
|----------|-------|
| **Event Emitted?** | ❌ No |

---

### 1️⃣1️⃣ Contracts & Dependencies

**Contracts Used:**
- `app.schemas.auth.Token`
- `app.schemas.auth.TokenPayload`

**External Dependencies:**
- `python-jose` (JWT encoding)
- `passlib` (password hashing - prepared but not used)

---

### 1️⃣2️⃣ Error Scenarios

| Error | Cause | Client Impact |
|-------|-------|---------------|
| 400 Bad Request | Incorrect email or password | User must retry with correct credentials |
| 422 Unprocessable Entity | Missing required fields | User must provide username and password |

---

### 1️⃣3️⃣ Non-Goals

This endpoint does NOT:
- ❌ Register new users
- ❌ Reset passwords
- ❌ Refresh tokens
- ❌ Logout/invalidate tokens
- ❌ Support OAuth2 providers (Google, etc.)

---

### 1️⃣4️⃣ Performance & SLA Expectations

| Metric | Target |
|--------|--------|
| Response Time | < 100ms |
| Processing | Synchronous |
| Throughput | Low (login events) |

---

### 1️⃣5️⃣ Security Considerations

| Aspect | Status |
|--------|--------|
| Password Hashing | ⚠️ Prepared (bcrypt) but not used |
| JWT Signing | ✅ HS256 algorithm |
| Token Expiry | ✅ 30 minutes default |
| Rate Limiting | ❌ Not implemented |
| HTTPS Required | ⚠️ Should be enforced in production |

**⚠️ WARNING:** `SECRET_KEY` is hardcoded - MUST change in production!

---

### 1️⃣6️⃣ Example Timeline

A traveller opens the mobile app → enters email and password → backend validates credentials → JWT token returned → app stores token → all subsequent requests include token in Authorization header.

---

### 1️⃣7️⃣ Implementation Status

| Component | Status |
|-----------|--------|
| Endpoint | ✅ Implemented |
| Credential Validation | 🟡 Mocked (hardcoded users) |
| JWT Generation | ✅ Implemented |
| Database Integration | ❌ Not Implemented |
| Password Hashing | ⚠️ Code exists, not used |

---


# 2. Event Endpoints

---

## 2.1 POST /events/ - Create Event

### 1️⃣ Endpoint Identity

| Property | Value |
|----------|-------|
| **Endpoint Name** | Create Event / Report Incident |
| **Endpoint URL** | `POST /api/v1/events/` |
| **Version** | v1 |
| **Owner** | Backend / Agentic System |
| **Tags** | `events` |

---

### 2️⃣ Purpose & Responsibility

This endpoint ingests real-time operational events (transport cancellations, flight delays, gate changes, feedback, POI requests) reported by travellers or system agents. It validates the event payload, generates a unique event ID, persists the event to the database, and enqueues it for asynchronous processing by the agentic decision pipeline. The endpoint returns immediately with an acknowledgment, allowing the caller to continue while the event is processed in the background.

---

### 3️⃣ Who Calls This? (Actors)

| Actor | Why |
|-------|-----|
| Traveller (via Mobile/Web App) | Report delays, cancellations, or issues |
| Travel Agent (via Dashboard) | Manually report incidents |
| System Monitors | Auto-detected transport failures |
| Other Internal Endpoints | `/itinerary/feedback` and `/itinerary/poi-request` create events internally |

---

### 4️⃣ Who Listens / Consumes This? (Downstream)

| Consumer | How |
|----------|-----|
| Feedback Agent | Normalizes and categorizes the event |
| Decision & Policy Agent | Evaluates thresholds and determines action |
| Optimization Agent | Triggered indirectly to generate options |
| Event Log System | Audit trail and analytics |

---

### 5️⃣ Request Flow

```
1. HTTP POST request hits API Gateway
2. Payload validated against EventCreate schema
3. Unique event_id generated (evt_XXXXXXXX)
4. Event persisted to database (TODO: currently mocked)
5. Async Celery task enqueued (TODO: currently mocked)
6. Immediate ACK returned with event_id and status="queued"
```

**Blocking:** ❌ No (async processing after ACK)

---

### 6️⃣ HTTP Methods & Semantics

| Method | Meaning |
|--------|---------|
| **POST** | Creates a new event record |
| Idempotency | ❌ No (new event_id each call) |
| Side Effects | ✅ Yes (triggers agentic pipeline) |

---

### 7️⃣ Input Schema

**Schema Name:** `EventCreate`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_type` | enum | ✅ | Type of incident |
| `entity_id` | string | ✅ | Affected entity ID (e.g., FLIGHT_123) |
| `reported_by` | string | ✅ | Who reported (traveller, agent, system) |
| `timestamp` | datetime | ❌ | When event occurred (defaults to now) |

**Event Types (enum):**
- `TRANSPORT_CANCELLED`
- `FLIGHT_DELAY`
- `GATE_CHANGE`
- `FEEDBACK`
- `POI_REQUEST`

**Contract File:** `contracts/event.schema.json` (⚠️ Empty - needs population)

---

### 8️⃣ Output Schema

**Schema Name:** `EventResponse`

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | string | Unique event identifier (format: `evt_XXXXXXXX`) |
| `status` | enum | Event status: `queued`, `processed`, `failed` |

---

### 9️⃣ Database Interaction

| Property | Value |
|----------|-------|
| **DB Touched?** | ✅ Yes (intended) |
| **Tables/Repos** | `events`, `event_logs` |
| **Operation Type** | Insert only |
| **Transaction Scope** | Single transaction |

**Implementation Status:** 🟡 MOCKED - Console logging only, no actual DB

---

### 🔟 Event Emission

| Property | Value |
|----------|-------|
| **Event Type Emitted** | `EVENT_REPORTED` (conceptual) |
| **Payload Contains** | `event_id`, `event_type`, `entity_id`, `timestamp` |
| **Consumed By** | Decision Agent, Feedback Agent |

**Implementation Status:** 🟡 MOCKED - Celery task trigger is logged but not executed

---

### 1️⃣1️⃣ Contracts & Dependencies

**Contracts Used:**
- `app.schemas.events.EventCreate`
- `app.schemas.events.EventResponse`
- `app.schemas.events.EventType`
- `app.schemas.events.EventStatus`

**External Dependencies:**
- Redis (queue) - TODO
- Celery (async tasks) - TODO
- Database (PostgreSQL) - TODO

---

### 1️⃣2️⃣ Error Scenarios

| Error | Cause | Client Impact |
|-------|-------|---------------|
| 422 Unprocessable Entity | Invalid payload / missing fields | User must fix request |
| 422 Unprocessable Entity | Invalid event_type enum value | Use valid event type |
| 500 Internal Server Error | Queue unavailable (future) | Retry later |

---

### 1️⃣3️⃣ Non-Goals

This endpoint does NOT:
- ❌ Perform optimization directly
- ❌ Book tickets or make reservations
- ❌ Notify users directly
- ❌ Require authentication (currently open - should be secured)
- ❌ Return optimization results

---

### 1️⃣4️⃣ Performance & SLA Expectations

| Metric | Target |
|--------|--------|
| Response Time | < 200ms |
| Async Processing | Eventual (seconds to minutes) |
| Throughput | Medium (event bursts during incidents) |

---

### 1️⃣5️⃣ Security Considerations

| Aspect | Status |
|--------|--------|
| JWT Required | ❌ Not implemented (SHOULD BE) |
| Role-based Access | ❌ Not implemented |
| Rate Limiting | ❌ Not implemented |
| Input Validation | ✅ Pydantic schema validation |

**⚠️ SECURITY GAP:** This endpoint is currently unprotected!

---

### 1️⃣6️⃣ Example Timeline

A traveller's flight is cancelled → they report via app → event is stored → event queued for processing → Decision Agent evaluates severity → Optimization Agent generates alternatives → Agent receives options in seconds → traveller notified of new plan.

---

### 1️⃣7️⃣ Implementation Status

| Component | Status |
|-----------|--------|
| Endpoint | ✅ Implemented |
| Schema Validation | ✅ Implemented |
| Event ID Generation | ✅ Implemented |
| Database Persistence | ❌ Mocked (TODO comment) |
| Celery Task Trigger | ❌ Mocked (TODO comment) |
| Authentication | ❌ Not Implemented |

---


# 3. Itinerary Endpoints

---

## 3.1 GET /itinerary/current - Get Current Itinerary

### 1️⃣ Endpoint Identity

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get Current Itinerary |
| **Endpoint URL** | `GET /api/v1/itinerary/current` |
| **Version** | v1 |
| **Owner** | Backend / Itinerary System |
| **Tags** | `itinerary` |

---

### 2️⃣ Purpose & Responsibility

This endpoint retrieves the current active ("live") itinerary for the authenticated user. For travellers, it returns the itinerary associated with their family group. For agents, it returns itineraries they are assigned to manage. The response includes the full timeline of events organized by subgroups and families, showing flights, hotel check-ins, activities, and other scheduled items.

---

### 3️⃣ Who Calls This? (Actors)

| Actor | Why |
|-------|-----|
| Traveller (via Mobile/Web App) | View their current trip schedule |
| Travel Agent (via Dashboard) | Monitor active itineraries |
| Frontend Components | Display timeline and schedule UI |

---

### 4️⃣ Who Listens / Consumes This? (Downstream)

| Consumer | How |
|----------|-----|
| None | This is a read-only endpoint |

---

### 5️⃣ Request Flow

```
1. HTTP GET request with JWT token
2. Token validated, user identity extracted
3. Query database for live itinerary (TODO: mocked)
4. Return itinerary data immediately
```

**Blocking:** ✅ Yes (synchronous read)

---

### 6️⃣ HTTP Methods & Semantics

| Method | Meaning |
|--------|---------|
| **GET** | Read-only retrieval of itinerary |
| Idempotency | ✅ Yes |
| Side Effects | ❌ No |
| Triggers Agents | ❌ No |

---

### 7️⃣ Input Schema

**Query Parameters:** None

**Headers Required:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <JWT_TOKEN>` |

---

### 8️⃣ Output Schema

**Schema Name:** `Dict[str, Any]` (untyped - needs formal schema)

| Field | Type | Description |
|-------|------|-------------|
| `itinerary_id` | string | Unique itinerary identifier |
| `status` | string | Itinerary status (e.g., "live") |
| `subgroups` | array | List of subgroup objects |

**Subgroup Object:**
| Field | Type | Description |
|-------|------|-------------|
| `subgroup_id` | string | Subgroup identifier |
| `families` | array[string] | Family IDs in this subgroup |
| `timeline` | array | List of timeline events |

**Timeline Event Object:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Event identifier |
| `type` | string | Event type (FLIGHT, HOTEL_CHECKIN, etc.) |
| `time` | string (ISO8601) | Scheduled time |
| `description` | string | Human-readable description |

**Contract File:** `contracts/itinerary.schema.json` (⚠️ Empty - needs population)

---

### 9️⃣ Database Interaction

| Property | Value |
|----------|-------|
| **DB Touched?** | ✅ Yes (intended) |
| **Tables/Repos** | `itineraries`, `subgroups`, `timeline_events` |
| **Operation Type** | Read-only |
| **Transaction Scope** | Single query with joins |

**Implementation Status:** 🟡 MOCKED - Returns hardcoded data

---

### 🔟 Event Emission

| Property | Value |
|----------|-------|
| **Event Emitted?** | ❌ No |

---

### 1️⃣1️⃣ Contracts & Dependencies

**Contracts Used:**
- `app.schemas.auth.TokenPayload`

**External Dependencies:**
- Database (PostgreSQL) - TODO

---

### 1️⃣2️⃣ Error Scenarios

| Error | Cause | Client Impact |
|-------|-------|---------------|
| 401 Unauthorized | Missing or invalid JWT | Re-authenticate |
| 403 Forbidden | User role not permitted | Contact support |
| 404 Not Found | No active itinerary (future) | No trip in progress |

---

### 1️⃣3️⃣ Non-Goals

This endpoint does NOT:
- ❌ Modify itinerary data
- ❌ Trigger any agents
- ❌ Return historical itineraries
- ❌ Filter by date range

---

### 1️⃣4️⃣ Performance & SLA Expectations

| Metric | Target |
|--------|--------|
| Response Time | < 300ms |
| Processing | Synchronous |
| Throughput | High (frequent polling/refresh) |
| Caching | Should be cached (TODO) |

---

### 1️⃣5️⃣ Security Considerations

| Aspect | Status |
|--------|--------|
| JWT Required | ✅ Yes |
| Role-based Access | ⚠️ Partial (validates token, doesn't filter by role) |
| Data Isolation | ⚠️ Should filter by user's family/assignment |

---

### 1️⃣6️⃣ Example Timeline

Traveller opens app → app requests current itinerary → backend validates JWT → returns family's live itinerary → app displays timeline with flights, hotels, activities.

---

### 1️⃣7️⃣ Implementation Status

| Component | Status |
|-----------|--------|
| Endpoint | ✅ Implemented |
| Authentication | ✅ JWT validation |
| Database Query | ❌ Mocked (hardcoded response) |
| Response Schema | ⚠️ Untyped Dict |
| User Filtering | ❌ Not Implemented |

---

## 3.2 POST /itinerary/feedback - Submit Feedback

### 1️⃣ Endpoint Identity

| Property | Value |
|----------|-------|
| **Endpoint Name** | Submit Traveller Feedback |
| **Endpoint URL** | `POST /api/v1/itinerary/feedback` |
| **Version** | v1 |
| **Owner** | Backend / Feedback System |
| **Tags** | `itinerary` |

---

### 2️⃣ Purpose & Responsibility

This endpoint allows travellers to submit feedback (ratings and comments) for specific itinerary nodes such as hotels, restaurants, or activities. The feedback is converted into an internal event of type `FEEDBACK` and queued for processing. Low ratings may trigger agent workflows to address concerns, while positive feedback is logged for analytics and future recommendations.

---

### 3️⃣ Who Calls This? (Actors)

| Actor | Why |
|-------|-----|
| Traveller (via Mobile/Web App) | Rate and comment on experiences |
| Post-trip Survey System | Collect structured feedback |

---

### 4️⃣ Who Listens / Consumes This? (Downstream)

| Consumer | How |
|----------|-----|
| Feedback Agent | Processes and categorizes feedback |
| Decision Agent | May trigger actions for low ratings |
| Analytics System | Aggregates satisfaction data |

---

### 5️⃣ Request Flow

```
1. HTTP POST request with JWT token and feedback data
2. Token validated, user identity extracted
3. Feedback validated against schema
4. Feedback converted to FEEDBACK event
5. Event queued for processing (TODO: mocked)
6. Acknowledgment returned with event_id
```

**Blocking:** ❌ No (async event processing)

---

### 6️⃣ HTTP Methods & Semantics

| Method | Meaning |
|--------|---------|
| **POST** | Submit new feedback |
| Idempotency | ❌ No (creates new event each time) |
| Side Effects | ✅ Yes (triggers feedback processing) |

---

### 7️⃣ Input Schema

**Schema Name:** `FeedbackRequest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rating` | int | ✅ | Rating from 1 to 5 |
| `comment` | string | ✅ | Feedback comment |
| `node_id` | string | ✅ | ID of the POI or itinerary node |

**Validation Rules:**
- `rating`: Must be between 1 and 5 (inclusive)

---

### 8️⃣ Output Schema

**Schema Name:** `FeedbackResponse`

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Contextual response based on rating |
| `event_created` | EventResponse | Created event details |

**Message Logic:**
- Rating 1-2: "Thank you for your feedback. We're looking into this concern."
- Rating 3: "Thank you for your feedback. We'll work to improve your experience."
- Rating 4-5: "Thank you for your positive feedback!"

---

### 9️⃣ Database Interaction

| Property | Value |
|----------|-------|
| **DB Touched?** | ✅ Yes (intended) |
| **Tables/Repos** | `feedback`, `events` |
| **Operation Type** | Insert |
| **Transaction Scope** | Single transaction |

**Implementation Status:** 🟡 MOCKED - No actual DB writes

---

### 🔟 Event Emission

| Property | Value |
|----------|-------|
| **Event Type Emitted** | `FEEDBACK` |
| **Payload Contains** | `event_type`, `entity_id` (node_id), `reported_by` |
| **Consumed By** | Feedback Agent, Decision Agent |

**Implementation Status:** 🟡 MOCKED - Event created but not queued

---

### 1️⃣1️⃣ Contracts & Dependencies

**Contracts Used:**
- `FeedbackRequest` (inline Pydantic model)
- `FeedbackResponse` (inline Pydantic model)
- `app.schemas.events.EventCreate`
- `app.schemas.events.EventResponse`

**External Dependencies:**
- Event Service (TODO)
- Database (TODO)

---

### 1️⃣2️⃣ Error Scenarios

| Error | Cause | Client Impact |
|-------|-------|---------------|
| 401 Unauthorized | Missing or invalid JWT | Re-authenticate |
| 422 Unprocessable Entity | Invalid rating (not 1-5) | Fix rating value |
| 422 Unprocessable Entity | Missing required fields | Provide all fields |
| 500 Internal Server Error | Processing failure | Retry later |

---

### 1️⃣3️⃣ Non-Goals

This endpoint does NOT:
- ❌ Update existing feedback
- ❌ Delete feedback
- ❌ Return aggregated ratings
- ❌ Directly notify service providers

---

### 1️⃣4️⃣ Performance & SLA Expectations

| Metric | Target |
|--------|--------|
| Response Time | < 200ms |
| Async Processing | Eventual |
| Throughput | Low-medium |

---

### 1️⃣5️⃣ Security Considerations

| Aspect | Status |
|--------|--------|
| JWT Required | ✅ Yes |
| Role Validation | ⚠️ Any authenticated user can submit |
| Node Ownership | ❌ Not validated (should check user's itinerary) |

---

### 1️⃣6️⃣ Example Timeline

Traveller finishes dinner at restaurant → opens app → rates 4 stars with comment → feedback stored → event created → Feedback Agent logs positive experience → data used for future recommendations.

---

### 1️⃣7️⃣ Implementation Status

| Component | Status |
|-----------|--------|
| Endpoint | ✅ Implemented |
| Authentication | ✅ JWT validation |
| Schema Validation | ✅ Pydantic |
| Event Creation | 🟡 Mocked |
| Database Storage | ❌ Not Implemented |
| Event Service | ❌ Not Implemented |

---


## 3.3 POST /itinerary/poi-request - Submit POI Request

### 1️⃣ Endpoint Identity

| Property | Value |
|----------|-------|
| **Endpoint Name** | Submit POI Request |
| **Endpoint URL** | `POST /api/v1/itinerary/poi-request` |
| **Version** | v1 |
| **Owner** | Backend / POI System |
| **Tags** | `itinerary` |

---

### 2️⃣ Purpose & Responsibility

This endpoint allows travellers to request visits to Points of Interest (POIs) during their trip. When a family wants to visit a specific attraction, restaurant, or landmark, they submit a request with an urgency level. The system stores the request, broadcasts it to other families in the same itinerary for coordination, and triggers the Decision Agent to evaluate feasibility and generate scheduling options.

---

### 3️⃣ Who Calls This? (Actors)

| Actor | Why |
|-------|-----|
| Traveller (via Mobile/Web App) | Request to visit a specific POI |
| Family Representative | Coordinate group activities |

---

### 4️⃣ Who Listens / Consumes This? (Downstream)

| Consumer | How |
|----------|-----|
| Decision Agent | Evaluates request feasibility |
| Optimization Agent | Generates scheduling options |
| Other Families | Notified via broadcast (TODO) |
| Communication Agent | Sends notifications |

---

### 5️⃣ Request Flow

```
1. HTTP POST request with JWT token and POI request
2. Token validated, family_id extracted
3. Unique request_id generated
4. POI request stored in database (TODO: mocked)
5. Request broadcast to other families (TODO: mocked)
6. POI_REQUEST event created and queued
7. Acknowledgment returned with request_id
```

**Blocking:** ❌ No (async coordination)

---

### 6️⃣ HTTP Methods & Semantics

| Method | Meaning |
|--------|---------|
| **POST** | Submit new POI request |
| Idempotency | ❌ No (new request each time) |
| Side Effects | ✅ Yes (triggers agents, broadcasts) |

---

### 7️⃣ Input Schema

**Schema Name:** `POIRequest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `poi_name` | string | ✅ | Name of the Point of Interest |
| `urgency` | enum | ✅ | Urgency level: `soft`, `medium`, `high` |

**Urgency Levels:**
- `soft`: Suggestion, coordinate when convenient
- `medium`: Would like to visit, check with others
- `high`: Priority request, notify immediately

**Contract File:** `contracts/poi_request.schema.json` ✅

---

### 8️⃣ Output Schema

**Schema Name:** `POIRequestResponse`

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Contextual response based on urgency |
| `request_id` | string | Unique request identifier (format: `poi_req_<family>_<timestamp>`) |
| `event_created` | EventResponse | Created event details |

**Message Logic by Urgency:**
- `high`: "High priority POI request for '{name}' submitted. Other families will be notified immediately."
- `medium`: "POI request for '{name}' submitted. Checking with other families."
- `soft`: "POI suggestion for '{name}' submitted. Will coordinate with other families when convenient."

**Contract File:** `contracts/poi_request_response.schema.json` ✅

---

### 9️⃣ Database Interaction

| Property | Value |
|----------|-------|
| **DB Touched?** | ✅ Yes (intended) |
| **Tables/Repos** | `poi_requests`, `events` |
| **Operation Type** | Insert |
| **Transaction Scope** | Single transaction |

**Implementation Status:** 🟡 MOCKED - No actual DB writes

---

### 🔟 Event Emission

| Property | Value |
|----------|-------|
| **Event Type Emitted** | `POI_REQUEST` |
| **Payload Contains** | `event_type`, `entity_id` (request_id), `reported_by` (family) |
| **Consumed By** | Decision Agent, Optimization Agent |

**Implementation Status:** 🟡 MOCKED - Event created but not queued

---

### 1️⃣1️⃣ Contracts & Dependencies

**Contracts Used:**
- `POIRequest` (inline Pydantic model)
- `POIRequestResponse` (inline Pydantic model)
- `UrgencyLevel` (inline enum)
- `app.schemas.events.EventCreate`
- `app.schemas.events.EventResponse`
- `contracts/poi_request.schema.json`
- `contracts/poi_request_response.schema.json`

**External Dependencies:**
- POI Request Service (TODO)
- WebSocket/Notification Service (TODO)
- Event Service (TODO)
- Database (TODO)

---

### 1️⃣2️⃣ Error Scenarios

| Error | Cause | Client Impact |
|-------|-------|---------------|
| 401 Unauthorized | Missing or invalid JWT | Re-authenticate |
| 422 Unprocessable Entity | Invalid urgency level | Use valid enum value |
| 422 Unprocessable Entity | Missing poi_name | Provide POI name |
| 500 Internal Server Error | Processing failure | Retry later |

---

### 1️⃣3️⃣ Non-Goals

This endpoint does NOT:
- ❌ Book the POI directly
- ❌ Check POI availability
- ❌ Return scheduling options (that's agent dashboard)
- ❌ Cancel or modify existing requests
- ❌ Validate POI exists in any database

---

### 1️⃣4️⃣ Performance & SLA Expectations

| Metric | Target |
|--------|--------|
| Response Time | < 200ms |
| Async Processing | Seconds to minutes |
| Throughput | Low (occasional requests) |

---

### 1️⃣5️⃣ Security Considerations

| Aspect | Status |
|--------|--------|
| JWT Required | ✅ Yes |
| Family Context | ✅ Uses `family_id` from token |
| Rate Limiting | ❌ Not implemented |
| Input Sanitization | ✅ Pydantic validation |

---

### 1️⃣6️⃣ Example Timeline

Family A wants to visit the Eiffel Tower → submits high-urgency POI request → request stored → other families notified → Decision Agent evaluates schedule impact → Optimization Agent generates options → Agent reviews and approves → all families notified of updated itinerary.

---

### 1️⃣7️⃣ Implementation Status

| Component | Status |
|-----------|--------|
| Endpoint | ✅ Implemented |
| Authentication | ✅ JWT validation |
| Schema Validation | ✅ Pydantic |
| Request ID Generation | ✅ Implemented |
| Database Storage | ❌ Not Implemented |
| Family Broadcast | ❌ Not Implemented |
| Event Creation | 🟡 Mocked |
| Contract Schema | ✅ Defined |

---


# 4. Agent Dashboard Endpoints

---

## 4.1 GET /agent/itinerary/options - Get Itinerary Options

### 1️⃣ Endpoint Identity

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get Itinerary Options |
| **Endpoint URL** | `GET /api/v1/agent/itinerary/options` |
| **Version** | v1 |
| **Owner** | Backend / Agent Dashboard |
| **Tags** | `agent` |

---

### 2️⃣ Purpose & Responsibility

This endpoint provides travel agents with pre-computed itinerary options for a specific event (Human-in-the-Loop pattern). When an incident occurs and the Optimization Agent generates alternative plans, this endpoint retrieves those options for agent review. Each option includes a summary, cost estimate, and predicted satisfaction score, enabling agents to make informed decisions before approving changes.

---

### 3️⃣ Who Calls This? (Actors)

| Actor | Why |
|-------|-----|
| Travel Agent (via Agent Dashboard) | Review options before approval |
| Agent Notification System | Pre-fetch options for display |

---

### 4️⃣ Who Listens / Consumes This? (Downstream)

| Consumer | How |
|----------|-----|
| None | This is a read-only endpoint |

---

### 5️⃣ Request Flow

```
1. HTTP GET request with JWT token and event_id query param
2. Token validated, agent role verified
3. Query database for pre-computed options (TODO: mocked)
4. Return options list immediately
```

**Blocking:** ✅ Yes (synchronous read)

---

### 6️⃣ HTTP Methods & Semantics

| Method | Meaning |
|--------|---------|
| **GET** | Read-only retrieval of options |
| Idempotency | ✅ Yes |
| Side Effects | ❌ No |
| Triggers Agents | ❌ No |

---

### 7️⃣ Input Schema

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event_id` | string | ✅ | Event ID to get options for |

**Headers Required:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <JWT_TOKEN>` (agent role required) |

---

### 8️⃣ Output Schema

**Schema Name:** `ItineraryOptionsResponse`

| Field | Type | Description |
|-------|------|-------------|
| `options` | array | List of ItineraryOption objects |

**ItineraryOption Object:**
| Field | Type | Description |
|-------|------|-------------|
| `option_id` | string | Unique option identifier (format: `opt_*`) |
| `summary` | string | Brief description of the option |
| `cost` | float | Cost associated with this option |
| `satisfaction` | float | Predicted satisfaction score (0.0 to 1.0) |

**Contract File:** `contracts/itinerary_options_response.schema.json` ✅

---

### 9️⃣ Database Interaction

| Property | Value |
|----------|-------|
| **DB Touched?** | ✅ Yes (intended) |
| **Tables/Repos** | `itinerary_options` |
| **Operation Type** | Read-only |
| **Transaction Scope** | Single query |

**Implementation Status:** 🟡 MOCKED - Returns hardcoded options

---

### 🔟 Event Emission

| Property | Value |
|----------|-------|
| **Event Emitted?** | ❌ No |

---

### 1️⃣1️⃣ Contracts & Dependencies

**Contracts Used:**
- `ItineraryOption` (inline Pydantic model)
- `ItineraryOptionsResponse` (inline Pydantic model)
- `app.schemas.auth.TokenPayload`
- `contracts/itinerary_options_response.schema.json`

**External Dependencies:**
- Optimization Service (TODO)
- Database (TODO)

---

### 1️⃣2️⃣ Error Scenarios

| Error | Cause | Client Impact |
|-------|-------|---------------|
| 401 Unauthorized | Missing or invalid JWT | Re-authenticate |
| 403 Forbidden | User is not an agent | Use agent credentials |
| 422 Unprocessable Entity | Missing event_id | Provide event_id param |
| 500 Internal Server Error | Retrieval failure | Retry later |

---

### 1️⃣3️⃣ Non-Goals

This endpoint does NOT:
- ❌ Generate new options (that's Optimization Agent)
- ❌ Approve or execute options
- ❌ Modify existing options
- ❌ Trigger any agents
- ❌ Return options for multiple events

---

### 1️⃣4️⃣ Performance & SLA Expectations

| Metric | Target |
|--------|--------|
| Response Time | < 200ms |
| Processing | Synchronous |
| Throughput | Low (agent queries) |
| Caching | Options should be pre-computed |

---

### 1️⃣5️⃣ Security Considerations

| Aspect | Status |
|--------|--------|
| JWT Required | ✅ Yes |
| Role Validation | ✅ Agent role required |
| Event Ownership | ❌ Not validated (should check agent assignment) |
| Audit Logging | ❌ Not implemented (should log access) |

---

### 1️⃣6️⃣ Example Timeline

Flight delay event created → Optimization Agent generates 3 options → Agent receives notification → Agent opens dashboard → calls this endpoint with event_id → reviews options with costs and satisfaction scores → selects best option → calls approve endpoint.

---

### 1️⃣7️⃣ Implementation Status

| Component | Status |
|-----------|--------|
| Endpoint | ✅ Implemented |
| Authentication | ✅ JWT validation |
| Role Authorization | ✅ Agent role check |
| Database Query | ❌ Mocked (hardcoded) |
| Optimization Service | ❌ Not Implemented |
| Contract Schema | ✅ Defined |

---

## 4.2 POST /agent/itinerary/approve - Approve Itinerary Option

### 1️⃣ Endpoint Identity

| Property | Value |
|----------|-------|
| **Endpoint Name** | Approve Itinerary Option |
| **Endpoint URL** | `POST /api/v1/agent/itinerary/approve` |
| **Version** | v1 |
| **Owner** | Backend / Agent Dashboard |
| **Tags** | `agent` |

---

### 2️⃣ Purpose & Responsibility

This endpoint allows travel agents to approve a specific itinerary option (Human-in-the-Loop decision point). When an agent selects and approves an option, this endpoint records the decision, triggers the Tools Agent to execute necessary bookings and changes, and triggers the Communication Agent to notify affected travellers. This is the critical decision point where human judgment is applied to AI-generated options.

---

### 3️⃣ Who Calls This? (Actors)

| Actor | Why |
|-------|-----|
| Travel Agent (via Agent Dashboard) | Approve selected option |

---

### 4️⃣ Who Listens / Consumes This? (Downstream)

| Consumer | How |
|----------|-----|
| Tools Agent | Executes bookings and changes |
| Communication Agent | Notifies travellers |
| Audit System | Logs agent decisions |

---

### 5️⃣ Request Flow

```
1. HTTP POST request with JWT token and option_id
2. Token validated, agent role verified
3. Option validated (TODO: mocked)
4. Option status updated to 'approved' (TODO: mocked)
5. Tools Agent triggered (TODO: mocked)
6. Communication Agent triggered (TODO: mocked)
7. Confirmation returned
```

**Blocking:** ⚠️ Partially (returns quickly, agents run async)

---

### 6️⃣ HTTP Methods & Semantics

| Method | Meaning |
|--------|---------|
| **POST** | Execute approval action |
| Idempotency | ⚠️ Should be (same option_id = same result) |
| Side Effects | ✅ Yes (triggers agents, updates state) |

---

### 7️⃣ Input Schema

**Schema Name:** `ApproveRequest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `option_id` | string | ✅ | ID of the option to approve |

**Contract File:** `contracts/approve_request.schema.json` ✅

---

### 8️⃣ Output Schema

**Schema Name:** `ApproveResponse`

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Confirmation message |
| `option_id` | string | Approved option ID |
| `tools_agent_triggered` | boolean | Whether Tools Agent was triggered |
| `communication_agent_triggered` | boolean | Whether Communication Agent was triggered |

**Contract File:** `contracts/approve_response.schema.json` ✅

---

### 9️⃣ Database Interaction

| Property | Value |
|----------|-------|
| **DB Touched?** | ✅ Yes (intended) |
| **Tables/Repos** | `itinerary_options`, `agent_decisions` |
| **Operation Type** | Update |
| **Transaction Scope** | Single transaction |

**Implementation Status:** 🟡 MOCKED - No actual DB updates

---

### 🔟 Event Emission

| Property | Value |
|----------|-------|
| **Event Type Emitted** | `OPTION_APPROVED` (conceptual) |
| **Payload Contains** | `option_id`, `agent_id`, `timestamp` |
| **Consumed By** | Tools Agent, Communication Agent |

**Implementation Status:** 🟡 MOCKED - Agents not actually triggered

---

### 1️⃣1️⃣ Contracts & Dependencies

**Contracts Used:**
- `ApproveRequest` (inline Pydantic model)
- `ApproveResponse` (inline Pydantic model)
- `app.schemas.auth.TokenPayload`
- `contracts/approve_request.schema.json`
- `contracts/approve_response.schema.json`

**External Dependencies:**
- Tools Agent (TODO)
- Communication Agent (TODO)
- Database (TODO)

---

### 1️⃣2️⃣ Error Scenarios

| Error | Cause | Client Impact |
|-------|-------|---------------|
| 401 Unauthorized | Missing or invalid JWT | Re-authenticate |
| 403 Forbidden | User is not an agent | Use agent credentials |
| 404 Not Found | Invalid option_id (future) | Use valid option |
| 409 Conflict | Option already approved (future) | Already processed |
| 500 Internal Server Error | Agent trigger failure | Retry or escalate |

---

### 1️⃣3️⃣ Non-Goals

This endpoint does NOT:
- ❌ Generate options (that's Optimization Agent)
- ❌ Execute bookings directly (that's Tools Agent)
- ❌ Notify travellers directly (that's Communication Agent)
- ❌ Allow partial approval
- ❌ Support rejection (only approval)

---

### 1️⃣4️⃣ Performance & SLA Expectations

| Metric | Target |
|--------|--------|
| Response Time | < 500ms |
| Agent Processing | Async (seconds to minutes) |
| Throughput | Low (agent decisions) |

---

### 1️⃣5️⃣ Security Considerations

| Aspect | Status |
|--------|--------|
| JWT Required | ✅ Yes |
| Role Validation | ✅ Agent role required |
| Option Ownership | ❌ Not validated (should check agent assignment) |
| Audit Trail | ❌ Not implemented (CRITICAL for compliance) |
| Double-approval Prevention | ❌ Not implemented |

---

### 1️⃣6️⃣ Example Timeline

Agent reviews 3 options → selects "Split A for 4 hrs" (opt_1) → clicks approve → backend records decision → Tools Agent books new flights → Communication Agent notifies Family A of schedule change → travellers see updated itinerary.

---

### 1️⃣7️⃣ Implementation Status

| Component | Status |
|-----------|--------|
| Endpoint | ✅ Implemented |
| Authentication | ✅ JWT validation |
| Role Authorization | ✅ Agent role check |
| Option Validation | ❌ Not Implemented |
| Database Update | ❌ Mocked |
| Tools Agent Trigger | ❌ Mocked (returns true) |
| Communication Agent Trigger | ❌ Mocked (returns true) |
| Audit Logging | ❌ Not Implemented |
| Contract Schema | ✅ Defined |

---


# 5. Booking Endpoints

---

## 5.1 POST /bookings/execute - Execute Booking

### 1️⃣ Endpoint Identity

| Property | Value |
|----------|-------|
| **Endpoint Name** | Execute Booking |
| **Endpoint URL** | `POST /api/v1/bookings/execute` |
| **Version** | v1 |
| **Owner** | Backend / Booking System |
| **Tags** | `bookings` |

---

### 2️⃣ Purpose & Responsibility

This endpoint initiates the booking execution process for an approved itinerary. It accepts a list of items to book (flights, hotels, restaurants, etc.) and creates an asynchronous job to call external booking APIs. The endpoint returns immediately with a job ID for tracking, while the actual bookings are processed in the background. This is typically called by the Tools Agent after an itinerary option is approved, but can also be triggered manually by agents.

---

### 3️⃣ Who Calls This? (Actors)

| Actor | Why |
|-------|-----|
| Tools Agent | Execute bookings after approval |
| Travel Agent (via Dashboard) | Manual booking execution |

---

### 4️⃣ Who Listens / Consumes This? (Downstream)

| Consumer | How |
|----------|-----|
| Background Worker | Processes booking job |
| External APIs | Flight, hotel, restaurant booking systems |
| Notification System | Updates agent on completion |
| Itinerary System | Updates with confirmed bookings |

---

### 5️⃣ Request Flow

```
1. HTTP POST request with JWT token (agent role)
2. Token validated, agent role verified
3. Booking job record created (TODO: mocked)
4. Async job enqueued for external API calls (TODO: mocked)
5. Job ID returned immediately
6. (Async) Worker calls external APIs
7. (Async) Status updated as items complete
8. (Async) Agent notified via WebSocket
```

**Blocking:** ❌ No (async job processing)

---

### 6️⃣ HTTP Methods & Semantics

| Method | Meaning |
|--------|---------|
| **POST** | Initiate booking execution |
| Idempotency | ⚠️ Should be (same itinerary = same job) |
| Side Effects | ✅ Yes (creates bookings, charges money) |

---

### 7️⃣ Input Schema

**Schema Name:** `BookingExecuteRequest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itinerary_id` | string | ✅ | ID of the itinerary to book |
| `items` | array[enum] | ✅ | List of items to book |

**Booking Item Types (enum):**
- `flight`
- `bus`
- `train`
- `hotel`
- `restaurant`
- `activity`
- `transfer`

**Contract File:** `contracts/booking_execute_request.schema.json` ✅

---

### 8️⃣ Output Schema

**Schema Name:** `BookingExecuteResponse`

| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | Current booking status |
| `job_id` | string | Async job ID for tracking (format: `job_<itinerary>_<timestamp>`) |
| `message` | string | Status message with item count |

**Booking Status (enum):**
- `booking_in_progress` - Job started, processing
- `completed` - All items booked successfully
- `partial_failure` - Some items failed
- `failed` - All items failed

**Contract File:** `contracts/booking_execute_response.schema.json` ✅

---

### 9️⃣ Database Interaction

| Property | Value |
|----------|-------|
| **DB Touched?** | ✅ Yes (intended) |
| **Tables/Repos** | `booking_jobs`, `bookings`, `itineraries` |
| **Operation Type** | Insert (job), Update (itinerary) |
| **Transaction Scope** | Multiple transactions (job creation + async updates) |

**Implementation Status:** 🟡 MOCKED - No actual DB writes

---

### 🔟 Event Emission

| Property | Value |
|----------|-------|
| **Event Type Emitted** | `BOOKING_STARTED`, `BOOKING_COMPLETED` (conceptual) |
| **Payload Contains** | `job_id`, `itinerary_id`, `items`, `status` |
| **Consumed By** | Notification System, Itinerary System |

**Implementation Status:** 🟡 MOCKED - No actual events emitted

---

### 1️⃣1️⃣ Contracts & Dependencies

**Contracts Used:**
- `BookingExecuteRequest` (inline Pydantic model)
- `BookingExecuteResponse` (inline Pydantic model)
- `BookingItem` (inline enum)
- `BookingStatus` (inline enum)
- `app.schemas.auth.TokenPayload`
- `contracts/booking_execute_request.schema.json`
- `contracts/booking_execute_response.schema.json`

**External Dependencies:**
- Background Worker (Celery/RQ) - TODO
- External Booking APIs - TODO
  - Flight booking API
  - Hotel booking API
  - Restaurant reservation API
  - Activity booking API
  - Transfer booking API
- WebSocket Service - TODO
- Database - TODO

---

### 1️⃣2️⃣ Error Scenarios

| Error | Cause | Client Impact |
|-------|-------|---------------|
| 401 Unauthorized | Missing or invalid JWT | Re-authenticate |
| 403 Forbidden | User is not an agent | Use agent credentials |
| 404 Not Found | Invalid itinerary_id (future) | Use valid itinerary |
| 422 Unprocessable Entity | Empty items list | Provide at least one item |
| 500 Internal Server Error | Job creation failure | Retry later |

**Async Error Scenarios (via job status):**
| Status | Cause | Resolution |
|--------|-------|------------|
| `partial_failure` | Some external APIs failed | Review failed items, retry |
| `failed` | All external APIs failed | Investigate, manual intervention |

---

### 1️⃣3️⃣ Non-Goals

This endpoint does NOT:
- ❌ Wait for bookings to complete (async)
- ❌ Return booking confirmations directly
- ❌ Handle payment processing (assumed pre-authorized)
- ❌ Cancel existing bookings
- ❌ Modify bookings
- ❌ Validate availability before queuing

---

### 1️⃣4️⃣ Performance & SLA Expectations

| Metric | Target |
|--------|--------|
| Response Time | < 300ms (job creation) |
| Async Processing | Minutes (depends on external APIs) |
| Throughput | Low (booking events) |

---

### 1️⃣5️⃣ Security Considerations

| Aspect | Status |
|--------|--------|
| JWT Required | ✅ Yes |
| Role Validation | ✅ Agent role required |
| Itinerary Ownership | ❌ Not validated (should check agent assignment) |
| Audit Trail | ❌ Not implemented (CRITICAL for financial) |
| Idempotency Key | ❌ Not implemented (risk of double booking) |
| Rate Limiting | ❌ Not implemented |

**⚠️ CRITICAL:** This endpoint handles real money transactions. Missing audit trail and idempotency are serious gaps.

---

### 1️⃣6️⃣ Example Timeline

Agent approves itinerary option → Tools Agent calls this endpoint → job created → worker starts → flight API called → hotel API called → restaurant API called → all succeed → status = completed → agent notified → travellers see confirmed bookings.

---

### 1️⃣7️⃣ Implementation Status

| Component | Status |
|-----------|--------|
| Endpoint | ✅ Implemented |
| Authentication | ✅ JWT validation |
| Role Authorization | ✅ Agent role check |
| Job ID Generation | ✅ Implemented |
| Database Job Creation | ❌ Mocked |
| Background Worker | ❌ Not Implemented |
| External API Integration | ❌ Not Implemented |
| WebSocket Notifications | ❌ Not Implemented |
| Status Tracking | ❌ Not Implemented |
| Contract Schema | ✅ Defined |

---


# Appendix A: Implementation Status Summary

---

## Overall Backend Maturity

| Category | Status |
|----------|--------|
| **API Endpoints** | ✅ All defined and routed |
| **Schema Validation** | ✅ Pydantic models in place |
| **Authentication** | ✅ JWT implementation complete |
| **Authorization** | ⚠️ Role checks exist, ownership validation missing |
| **Database** | ❌ All mocked (no actual persistence) |
| **Async Processing** | ❌ Celery/queue integration missing |
| **Agent Integration** | ❌ All agent triggers mocked |
| **External APIs** | ❌ No booking API integrations |
| **WebSocket** | ❌ Not implemented |
| **Contract Schemas** | ⚠️ Partially defined |

---

## Endpoint Implementation Matrix

| Endpoint | Route | Auth | DB | Async | Agents |
|----------|-------|------|-----|-------|--------|
| Login | POST /auth/login | 🟡 | ❌ | N/A | N/A |
| Create Event | POST /events/ | ❌ | ❌ | ❌ | ❌ |
| Get Itinerary | GET /itinerary/current | ✅ | ❌ | N/A | N/A |
| Submit Feedback | POST /itinerary/feedback | ✅ | ❌ | ❌ | ❌ |
| POI Request | POST /itinerary/poi-request | ✅ | ❌ | ❌ | ❌ |
| Get Options | GET /agent/itinerary/options | ✅ | ❌ | N/A | N/A |
| Approve Option | POST /agent/itinerary/approve | ✅ | ❌ | ❌ | ❌ |
| Execute Booking | POST /bookings/execute | ✅ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ Implemented
- 🟡 Partial/Mocked
- ❌ Not Implemented
- N/A Not Applicable

---

## Contract Schema Status

| Contract File | Status | Used By |
|---------------|--------|---------|
| `event.schema.json` | ❌ Empty | Events API |
| `itinerary.schema.json` | ❌ Empty | Itinerary API |
| `poi_request.schema.json` | ✅ Defined | POI Request |
| `poi_request_response.schema.json` | ✅ Defined | POI Request |
| `booking_execute_request.schema.json` | ✅ Defined | Bookings API |
| `booking_execute_response.schema.json` | ✅ Defined | Bookings API |
| `approve_request.schema.json` | ✅ Defined | Agent Dashboard |
| `approve_response.schema.json` | ✅ Defined | Agent Dashboard |
| `itinerary_options_response.schema.json` | ✅ Defined | Agent Dashboard |
| `agent_output.schema.json` | ❌ Empty | Agent System |
| `internal_agent_contracts.json` | ❌ Empty | Agent System |

---

## Critical Gaps for Production

### 🔴 Security Gaps
1. **Events endpoint unprotected** - No authentication required
2. **Hardcoded SECRET_KEY** - Must change before deployment
3. **No rate limiting** - Vulnerable to abuse
4. **Missing audit trails** - Critical for compliance
5. **No idempotency keys** - Risk of duplicate bookings

### 🔴 Data Persistence Gaps
1. **No database integration** - All data is mocked
2. **No user store** - Credentials hardcoded
3. **No event persistence** - Events lost on restart
4. **No booking records** - No transaction history

### 🔴 Integration Gaps
1. **No Celery/queue** - Async processing mocked
2. **No agent system** - All agent triggers mocked
3. **No external APIs** - Booking integrations missing
4. **No WebSocket** - Real-time updates missing
5. **No ML/OR integration** - Optimization not connected

---

## Recommended Implementation Priority

### Phase 1: Foundation
1. Database integration (PostgreSQL)
2. User authentication with real user store
3. Event persistence and basic queuing

### Phase 2: Core Flow
1. Celery integration for async processing
2. Agent system scaffolding
3. WebSocket for real-time updates

### Phase 3: External Integration
1. External booking API integrations
2. ML/OR optimization service connection
3. Notification services

### Phase 4: Production Hardening
1. Security audit and fixes
2. Rate limiting
3. Audit logging
4. Monitoring and alerting

---

# Appendix B: System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                           │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Traveller App  │  Agent Dashboard │  (Next.js Frontend)        │
└────────┬────────┴────────┬────────┴─────────────────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (FastAPI)                      │
├─────────────────────────────────────────────────────────────────┤
│  /auth/login          │  JWT Authentication                     │
│  /events/             │  Event Ingestion                        │
│  /itinerary/*         │  Traveller Operations                   │
│  /agent/*             │  Agent Dashboard Operations             │
│  /bookings/*          │  Booking Execution                      │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AGENTIC LAYER (TODO)                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Feedback Agent  │ Decision Agent  │ Communication Agent         │
│ (Normalize)     │ (Evaluate)      │ (Notify)                    │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Optimization    │ Tools Agent     │                             │
│ Agent (ML/OR)   │ (Execute)       │                             │
└────────┬────────┴────────┬────────┴─────────────────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES (TODO)                     │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Flight APIs    │  Hotel APIs     │  Restaurant APIs            │
│  Activity APIs  │  Transfer APIs  │  Notification Services      │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

# Appendix C: Data Flow Diagrams

## Event Processing Flow

```
Traveller/Agent                    Backend                      Agents
     │                               │                            │
     │  POST /events/                │                            │
     │──────────────────────────────>│                            │
     │                               │                            │
     │                               │ Validate & Store           │
     │                               │ (TODO: DB)                 │
     │                               │                            │
     │                               │ Queue Event                │
     │                               │ (TODO: Celery)             │
     │                               │                            │
     │  { event_id, status }         │                            │
     │<──────────────────────────────│                            │
     │                               │                            │
     │                               │  EVENT_REPORTED            │
     │                               │───────────────────────────>│
     │                               │                            │
     │                               │                   Process  │
     │                               │                   Event    │
     │                               │                            │
```

## Human-in-the-Loop Approval Flow

```
Optimization Agent        Backend              Agent Dashboard
       │                    │                        │
       │ Store Options      │                        │
       │───────────────────>│                        │
       │                    │                        │
       │                    │  GET /agent/options    │
       │                    │<───────────────────────│
       │                    │                        │
       │                    │  { options[] }         │
       │                    │───────────────────────>│
       │                    │                        │
       │                    │                        │ Agent Reviews
       │                    │                        │
       │                    │  POST /agent/approve   │
       │                    │<───────────────────────│
       │                    │                        │
       │                    │ Trigger Tools Agent    │
       │                    │ Trigger Comm Agent     │
       │                    │                        │
       │                    │  { approved }          │
       │                    │───────────────────────>│
       │                    │                        │
```

---

*Document generated from codebase analysis. Last updated: January 2026*
