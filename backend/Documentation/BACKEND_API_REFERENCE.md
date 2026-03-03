# Meili AI — Backend API Reference
> **For Frontend Integration** | Last Updated: 2026-02-27  
> Base URL: `http://localhost:8000` | API Prefix: `/api/v1`  
> Interactive Docs: `http://localhost:8000/api/v1/openapi.json` | Swagger UI: `http://localhost:8000/docs`

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Auth Endpoints](#3-auth-endpoints-prefix-apiv1auth)
4. [User Profile Endpoints](#4-user-profile-endpoints-prefix-apiv1users)
5. [Family Management Endpoints](#5-family-management-endpoints-prefix-apiv1families)
6. [Trip Management Endpoints](#6-trip-management-endpoints-prefix-apiv1trips)
7. [Itinerary Endpoints](#7-itinerary-endpoints-prefix-apiv1itinerary)
8. [Booking Endpoints (Hotels)](#8-booking-endpoints-hotels--prefix-apiv1bookings)
9. [Flight Endpoints](#9-flight-endpoints-prefix-apiv1flights)
10. [Agent Dashboard Endpoints](#10-agent-dashboard-endpoints-prefix-apiv1agent)
11. [Policy Engine Endpoints](#11-policy-engine-endpoints-prefix-apiv1agent)
12. [Events Endpoints](#12-events-endpoints-prefix-apiv1events)
13. [Health Check](#13-health-check)
14. [WebSocket Endpoints](#14-websocket-endpoints)
15. [Error Codes Reference](#15-error-codes-reference)
16. [Data Models Reference](#16-data-models-reference)
17. [Backend Services Overview](#17-backend-services-overview)
18. [Integration Checklist for Frontend](#18-integration-checklist-for-frontend)

---

## 1. Architecture Overview

```
Frontend (Next.js)
      │
      ├── REST API  ──► FastAPI Backend (port 8000)
      │                      │
      │                      ├── PostgreSQL (data persistence)
      │                      ├── Redis     (caching + pub/sub)
      │                      └── Celery    (async tasks)
      │
      └── WebSocket ──► ws://localhost:8000/ws/traveller/{user_id}
                        ws://localhost:8000/ws/agent/{agent_id}
```

### Key Concepts
| Concept | Description |
|---|---|
| **Family** | A group of travelers sharing an itinerary (e.g. `FAM_A`) |
| **Trip Session** | An active trip with dates, families, and itinerary state |
| **Itinerary Option** | An optimizer-generated itinerary awaiting agent approval |
| **Event** | A user action (feedback, POI request) that triggers agentic processing |
| **Agent** | A travel manager user (role: `agent`) who reviews and approves |
| **Traveller** | A regular user (role: `user`) who views and gives feedback |

### Rate Limiting
- **100 requests / 60 seconds** per IP address
- WebSocket connections are **exempt** from rate limiting

---

## 2. Authentication & Authorization

### JWT Token Strategy
The API uses a **dual-token** strategy:
- **Access Token** → short-lived (30 min), send in `Authorization: Bearer <token>` header
- **Refresh Token** → long-lived, stored in `httpOnly` cookie (`refresh_token`)

### User Roles
| Role | Description | Access |
|---|---|---|
| `user` | Traveller / family member | Itinerary, feedback, POI requests, own profile |
| `agent` | Travel manager | All traveller access + bookings, agent dashboard, events |

### How to Authenticate Requests
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Token Payload Structure (Decoded JWT)
```json
{
  "sub": "user-uuid-string",
  "role": "user | agent",
  "family_id": "family-uuid-string | null",
  "jti": "token-unique-id",
  "exp": 1234567890
}
```

---

## 3. Auth Endpoints — Prefix: `/api/v1/auth`

### POST `/api/v1/auth/login`
**Login with email and password. Returns access token + sets refresh cookie.**

- **Auth Required:** No
- **Content-Type:** `application/x-www-form-urlencoded` (OAuth2 form)

**Request (Form Body):**
```
username=user@example.com&password=yourpassword
```

**Response `200 OK`:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Side Effect:** Sets `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax`

**Errors:**
| Status | Detail |
|---|---|
| `401` | `"Incorrect email or password"` |
| `403` | `"User account is inactive"` |

---

### POST `/api/v1/auth/signup`
**Register a new user. Returns access token + sets refresh cookie.**

- **Auth Required:** No
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "full_name": "John Doe",
  "role": "user"
}
```

**Response `200 OK`:** Same as `/login` — `Token` object + sets cookie.

**Errors:**
| Status | Detail |
|---|---|
| `400` | `"The user with this email already exists"` |
| `400` | `"Password must be at least 8 characters long"` |

---

### POST `/api/v1/auth/refresh`
**Get a new access token using the refresh token cookie.**

- **Auth Required:** No (uses `refresh_token` httpOnly cookie)
- **Content-Type:** None required

**Response `200 OK`:** `Token` object with new `access_token`.

**Errors:**
| Status | Detail |
|---|---|
| `401` | `"Refresh token not found"` |
| `401` | `"Invalid or expired refresh token"` |

---

### POST `/api/v1/auth/logout`
**Logout current device. Revokes refresh token and blacklists access token.**

- **Auth Required:** Yes (Bearer token)

**Response `200 OK`:**
```json
{ "message": "Successfully logged out" }
```

---

### POST `/api/v1/auth/logout-all`
**Logout from ALL devices. Revokes all sessions for the user.**

- **Auth Required:** Yes (Bearer token)

**Response `200 OK`:**
```json
{ "message": "Successfully logged out from all devices" }
```

---

## 4. User Profile Endpoints — Prefix: `/api/v1/users`

### GET `/api/v1/users/me`
**Get the current authenticated user's profile.**

- **Auth Required:** Yes (any role)

**Response `200 OK`:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "user",
  "family_id": "uuid | null",
  "is_active": true,
  "created_at": "2026-02-27T10:00:00",
  "updated_at": "2026-02-27T10:00:00"
}
```

---

### PATCH `/api/v1/users/me`
**Update the current user's profile (only `full_name` is editable).**

- **Auth Required:** Yes (any role)

**Request Body:**
```json
{
  "full_name": "New Name"
}
```

**Response `200 OK`:** Updated `UserProfileResponse` object.

---

## 5. Family Management Endpoints — Prefix: `/api/v1/families`

### GET `/api/v1/families/me`
**Get current user's family with all members.**

- **Auth Required:** Yes (any role)

**Response `200 OK`:**
```json
{
  "id": "uuid",
  "family_code": "FAM_A",
  "family_name": "The Sharma Family",
  "trip_name": "Delhi Adventure",
  "destination": "Delhi, India",
  "start_date": "2026-03-15",
  "end_date": "2026-03-18",
  "preferences": {},
  "is_active": true,
  "created_at": "...",
  "updated_at": "...",
  "members": [
    {
      "id": "uuid",
      "email": "member@example.com",
      "full_name": "Jane Doe",
      "role": "user",
      "is_active": true,
      "created_at": "..."
    }
  ]
}
```

**Errors:**
| Status | Detail |
|---|---|
| `404` | `"No family associated with this account"` |
| `404` | `"Family not found"` |

---

### GET `/api/v1/families/me/members`
**List all members of the current user's family.**

- **Auth Required:** Yes (any role)

**Response `200 OK`:** Array of `FamilyMemberResponse` objects.

---

### POST `/api/v1/families/me/members`
**Add a registered user to the family by email.**

- **Auth Required:** Yes (any role)

**Request Body:**
```json
{
  "email": "newmember@example.com"
}
```

**Response `201 Created`:** `FamilyMemberResponse` of the added user.

**Errors:**
| Status | Detail |
|---|---|
| `404` | `"No user found with email ..."` |
| `409` | `"User already belongs to another family"` |
| `409` | `"User is already a member of this family"` |

---

### DELETE `/api/v1/families/me/members/{user_id}`
**Remove a member from the family. Cannot remove yourself.**

- **Auth Required:** Yes (any role)

**Path Param:** `user_id` — UUID of the user to remove.

**Response `200 OK`:**
```json
{ "message": "Member removed successfully" }
```

---

## 6. Trip Management Endpoints — Prefix: `/api/v1/trips`

### POST `/api/v1/trips/initialize`
**Initialize a new trip with full family preference profiles.**

- **Auth Required:** Optional (but preferred for production)
- **Status:** `201 Created`

**Request Body:**
```json
{
  "trip_name": "Delhi Adventure",
  "destination": "Delhi, India",
  "start_date": "2026-03-15",
  "end_date": "2026-03-18",
  "baseline_itinerary": "delhi_3day_skeleton",
  "families": [
    {
      "family_id": "FAM_A",
      "family_name": "Sharma Family",
      "members": 4,
      "children": 1,
      "budget_sensitivity": 0.5,
      "energy_level": 0.7,
      "pace_preference": "moderate",
      "interest_vector": {
        "history": 0.9,
        "architecture": 0.7,
        "food": 0.8,
        "nature": 0.5,
        "nightlife": 0.2,
        "shopping": 0.6,
        "religious": 0.4,
        "adventure": 0.5,
        "culture": 0.8
      },
      "must_visit_locations": ["LOC_008"],
      "never_visit_locations": [],
      "dietary_restrictions": ["vegetarian"],
      "accessibility_needs": [],
      "notes": "Prefer morning activities"
    }
  ]
}
```

**Pace Values:** `"relaxed" | "moderate" | "fast"`

**Response `201 Created`:**
```json
{
  "success": true,
  "trip_id": "delhi_20260315_1234",
  "trip_session_id": "uuid",
  "message": "Trip initialized successfully",
  "summary": {
    "families_registered": 1,
    "total_members": 4,
    "total_children": 1,
    "trip_duration_days": 3,
    "baseline_itinerary": "delhi_3day_skeleton"
  },
  "next_steps": ["Run optimizer", "Agent approval"]
}
```

---

### POST `/api/v1/trips/initialize-with-optimization`
**Initialize a trip using family IDs (preferences auto-fetched from DB) + runs ML optimizer immediately.**

- **Auth Required:** Optional
- **Status:** `201 Created`

**Request Body:**
```json
{
  "trip_name": "Delhi Smart Trip",
  "destination": "Delhi, India",
  "start_date": "2026-03-15",
  "end_date": "2026-03-18",
  "family_ids": ["FAM_A", "FAM_B"],
  "num_travellers": 8
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "trip_id": "delhi_20260315_1234",
  "trip_session_id": "uuid",
  "option_id": "uuid",
  "event_id": "uuid",
  "optimizer_ran": true,
  "message": "Trip initialized with optimization",
  "summary": {
    "families_registered": 2,
    "total_members": 8,
    "total_children": 2,
    "trip_duration_days": 3,
    "baseline_itinerary": "delhi_3day_skeleton",
    "estimated_cost": 25000.0,
    "predicted_satisfaction": 0.82
  }
}
```
> **Note:** After this, the agent must approve via `POST /api/v1/agent/itinerary/approve`.

---

### GET `/api/v1/trips/`
**List all trips with pagination.**

- **Auth Required:** No
- **Query Params:** `limit` (default 20), `skip` (default 0), `trip_status` (optional)

**Response `200 OK`:**
```json
{
  "items": [ { "trip_id": "...", "trip_name": "...", ... } ],
  "total": 10,
  "skip": 0,
  "limit": 20
}
```

---

### GET `/api/v1/trips/{trip_id}/summary`
**Get detailed summary of a specific trip.**

- **Auth Required:** No

**Path Param:** `trip_id` — Trip identifier string (e.g. `delhi_20260315_1234`)

**Response `200 OK`:**
```json
{
  "trip_id": "delhi_20260315_1234",
  "trip_name": "Delhi Adventure",
  "destination": "Delhi, India",
  "start_date": "2026-03-15",
  "end_date": "2026-03-18",
  "families": ["FAM_A", "FAM_B"],
  "iteration_count": 2,
  "initial_preferences": {},
  "current_preferences": {},
  "feedback_count": 5,
  "last_updated": "2026-03-16T14:00:00"
}
```

**Errors:**
| Status | Detail |
|---|---|
| `404` | `"Trip not found"` |

---

### PATCH `/api/v1/trips/{trip_id}/families/{family_id}/preferences`
**Manually update preferences for a specific family in a trip.**

- **Auth Required:** No

**Path Params:** `trip_id`, `family_id` (e.g. `FAM_A`)

**Request Body:**
```json
{
  "preference_updates": {
    "budget_sensitivity": 0.8,
    "must_visit_locations": ["LOC_006", "LOC_010"]
  }
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "trip_id": "...",
  "family_id": "FAM_A",
  "updated_preferences": {},
  "message": "Preferences updated for FAM_A"
}
```

---

### DELETE `/api/v1/trips/{trip_id}`
**Archive a trip (soft delete — data preserved).**

- **Auth Required:** No

**Response `200 OK`:**
```json
{ "success": true, "message": "Trip archived" }
```

---

## 7. Itinerary Endpoints — Prefix: `/api/v1/itinerary`

### GET `/api/v1/itinerary/current`
**Get the current active itinerary for the authenticated user's family.**

- **Auth Required:** Yes (any role)
- **Caching:** Redis cache, 60-second TTL.

**Response `200 OK`:** Full itinerary JSON (structure varies based on optimizer output):
```json
{
  "trip_id": "...",
  "family_id": "...",
  "version": 3,
  "days": [
    {
      "day": 1,
      "date": "2026-03-15",
      "pois": [
        {
          "id": "LOC_001",
          "name": "Red Fort",
          "category": "history",
          "start_time": "09:00",
          "end_time": "11:00",
          "cost": 500,
          "lat": 28.6562,
          "lng": 77.2410
        }
      ]
    }
  ],
  "total_cost": 25000,
  "satisfaction_score": 0.82
}
```

**Errors:**
| Status | Detail |
|---|---|
| `400` | `"User is not associated with a family"` |
| `404` | `"No active itinerary found for this family"` |

---

### GET `/api/v1/itinerary/diff?version_a={int}&version_b={int}`
**Get structured diff between two itinerary versions.**

- **Auth Required:** Yes (any role)
- **Query Params:** `version_a` (int), `version_b` (int)

**Response `200 OK`:** Diff object showing added, removed, and changed POIs with cost and satisfaction deltas.

```json
{
  "version_a": 1,
  "version_b": 2,
  "added_pois": [...],
  "removed_pois": [...],
  "changed_pois": [...],
  "cost_delta": 500.0,
  "satisfaction_delta": 0.05
}
```

---

### POST `/api/v1/itinerary/feedback`
**Submit numeric rating feedback for a specific itinerary node (creates Event + triggers async agent).**

- **Auth Required:** Yes (any role)

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Loved the Red Fort visit!",
  "node_id": "LOC_001"
}
```

**Rating Scale:** 1 (worst) → 5 (best)

**Response `200 OK`:**
```json
{
  "message": "Thank you for your positive feedback!",
  "event_created": {
    "event_id": "uuid",
    "status": "pending"
  }
}
```

> **Note:** This triggers a Celery task `process_event_task` asynchronously. The agent processes the event in the background.

---

### POST `/api/v1/itinerary/feedback/agent`
**Submit natural language feedback through the full AI agent pipeline.**

- **Auth Required:** Optional (uses `FAM_A` as default for unauthenticated)
- **This is the primary feedback endpoint for the chatbot.**

**Request Body:**
```json
{
  "message": "We want to see Qutub Minar instead of Lotus Temple"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "event_type": "POI_REQUEST",
  "action_taken": "Added Qutub Minar, removed Lotus Temple",
  "explanations": [
    "Qutub Minar matches your history interest (score: 0.9)",
    "Lotus Temple removed to balance schedule"
  ],
  "itinerary_updated": true,
  "iteration": 3,
  "cost_analysis": {
    "previous_cost": 24000,
    "new_cost": 24500,
    "delta": 500
  }
}
```

**Agent Pipeline:** `FeedbackAgent → DecisionPolicyAgent → OptimizerAgent → ExplainabilityAgent`

---

### POST `/api/v1/itinerary/poi-request`
**Submit a Point of Interest request with urgency level.**

- **Auth Required:** Yes (any role)

**Request Body:**
```json
{
  "poi_name": "Qutub Minar",
  "urgency": "high"
}
```

**Urgency Values:** `"soft" | "medium" | "high"`

| Urgency | Preference Type | Strength |
|---|---|---|
| `high` | MUST_VISIT | 1.0 |
| `medium` | PREFER_VISIT | 0.8 |
| `soft` | PREFER_VISIT | 0.8 |

**Response `200 OK`:**
```json
{
  "message": "High priority request for 'Qutub Minar' submitted and added to must-visit list.",
  "request_id": "poi_req_<family_id>_<timestamp>",
  "event_created": {
    "event_id": "uuid",
    "status": "pending"
  }
}
```

---

### GET `/api/v1/itinerary/explanations/{itinerary_id}`
**Get LLM-generated explanations for each POI change in a specific itinerary version.**

- **Auth Required:** Yes (any role)
- **Path Param:** `itinerary_id` (UUID)
- **Query Param:** `family_id` (UUID, optional filter)

**Response `200 OK`:**
```json
{
  "itinerary_id": "uuid",
  "by_day": {
    "1": [
      {
        "id": "uuid",
        "family_id": "uuid",
        "poi_id": "LOC_001",
        "poi_name": "Red Fort",
        "change_type": "added",
        "causal_tags": ["history", "family_preference"],
        "cost_delta": { "FAM_A": 500 },
        "satisfaction_delta": { "FAM_A": 0.08 },
        "explanation": "Red Fort was added because Family A has a high history interest (0.9) and it fits within the budget sensitivity constraints.",
        "trigger_message": "We want to see more historical sites",
        "created_at": "2026-03-15T10:00:00"
      }
    ]
  },
  "total": 5
}
```

---

### GET `/api/v1/itinerary/explanations/trip/{trip_id}`
**Get all LLM explanations for a trip across all itinerary versions.**

- **Auth Required:** Yes (any role)
- **Query Param:** `family_id` (UUID, optional filter)

**Response `200 OK`:**
```json
{
  "trip_id": "...",
  "explanations": [...],
  "total": 12
}
```

---

## 8. Booking Endpoints (Hotels) — Prefix: `/api/v1/bookings`

> **Auth Required for all:** Yes (`agent` role only via `get_current_agent`)

### POST `/api/v1/bookings/execute`
**Execute bookings (hotel + flight) for an itinerary via async Celery task.**

**Request Body:**
```json
{
  "itinerary_id": "itinerary-uuid",
  "items": ["hotel", "flight"],
  "city_code": "418069",
  "checkin": "2026-03-15",
  "checkout": "2026-03-18",
  "rooms": 2,
  "adults": 4,
  "children": 1,
  "nationality": "IN",
  "guests": [
    {
      "Title": "Mr",
      "FirstName": "Raj",
      "LastName": "Sharma",
      "Phoneno": "+919876543210",
      "Email": "raj@example.com",
      "PaxType": 1,
      "LeadPassenger": true,
      "Age": 35,
      "PassportNo": "",
      "PAN": ""
    }
  ],
  "flight_origin": "DEL",
  "flight_destination": "BOM",
  "flight_departure_date": "2026-03-15T10:00:00",
  "flight_return_date": null,
  "flight_cabin_class": 1,
  "flight_preferred_airlines": null,
  "flight_direct_only": false
}
```

**Booking Item Types:** `"hotel" | "flight" | "bus" | "train" | "restaurant" | "activity" | "transfer"`

**Cabin Class:** `1=Economy, 2=PremEcon, 3=Business, 4=First`

**Response `200 OK`:**
```json
{
  "job_id": "uuid",
  "status": "pending",
  "message": "Booking job created for 2 items: hotel, flight. Track via WebSocket or GET /bookings/status/<job_id>"
}
```

> **Tip:** Connect to WebSocket `/ws/agent/{agent_id}` to receive real-time booking progress notifications.

---

### GET `/api/v1/bookings/status/{job_id}`
**Get real-time status of a booking job.**

**Path Param:** `job_id` (UUID)

**Response `200 OK`:**
```json
{
  "job_id": "uuid",
  "itinerary_id": "itinerary-uuid",
  "agent_id": "agent-uuid",
  "status": "completed",
  "items_requested": ["hotel", "flight"],
  "items_completed": { "hotel": "confirmed", "flight": "ticketed" },
  "error_message": null,
  "hotel_bookings": [
    {
      "id": "uuid",
      "hotel_code": "123456",
      "hotel_name": "The Leela Palace",
      "room_name": "Deluxe King",
      "status": "confirmed",
      "checkin": "2026-03-15",
      "checkout": "2026-03-18",
      "total_fare": 45000.0,
      "currency": "INR",
      "confirmation_no": "CONF123456",
      "tbo_booking_id": "TBO789",
      "error_message": null,
      "created_at": "2026-02-27T10:00:00"
    }
  ],
  "created_at": "2026-02-27T10:00:00",
  "updated_at": "2026-02-27T10:05:00"
}
```

**Job Status Values:** `pending | processing | completed | partial_failure | failed`

---

### POST `/api/v1/bookings/hotels/search`
**Search hotels directly via TBO API (synchronous).**

**Request Body:**
```json
{
  "city_code": "418069",
  "checkin": "2026-03-15",
  "checkout": "2026-03-18",
  "rooms": 2,
  "adults": 4,
  "children": 0,
  "children_ages": null,
  "nationality": "IN",
  "max_hotels": 50,
  "refundable": true,
  "meal_type": 2,
  "star_rating": 4,
  "hotel_name": null,
  "order_by": null
}
```

**Meal Type Values:** `0=All, 1=Room Only, 2=B&B, 3=Half Board, 4=Full Board`

**Response `200 OK`:**
```json
{
  "status": "success",
  "trace_id": "TBO_TRACE_ABC123",
  "hotels_found": 15,
  "results": [
    {
      "hotel_code": "123456",
      "currency": "INR",
      "rooms": [
        {
          "Name": "Deluxe King",
          "TotalFare": 15000.0,
          "MealType": "Breakfast",
          "IsRefundable": true
        }
      ]
    }
  ]
}
```

> **Important:** Save the `trace_id` — you need it to initiate a booking.

---

### POST `/api/v1/bookings/cancel`
**Cancel a confirmed hotel booking via TBO API.**

**Request Body:**
```json
{
  "booking_id": "hotel-booking-uuid",
  "reason": "Change of plans"
}
```

**Response `200 OK`:**
```json
{
  "booking_id": "uuid",
  "status": "cancelled",
  "confirmation_no": "CONF123456",
  "cancellation_charges": 2000.0,
  "refund_amount": 13000.0,
  "message": "Booking cancelled successfully. Refund: 13000.0, Charges: 2000.0"
}
```

**Cancel Status Values:** `cancelled | cancel_failed | already_cancelled`

---

### POST `/api/v1/bookings/by-date`
**Retrieve all TBO bookings within a date range.**

**Request Body:**
```json
{
  "from_date": "2026-03-01",
  "to_date": "2026-03-31"
}
```

**Response `200 OK`:**
```json
{
  "status": "success",
  "from_date": "2026-03-01",
  "to_date": "2026-03-31",
  "total_bookings": 3,
  "bookings": [
    {
      "confirmation_no": "CONF123",
      "booking_id": "TBO456",
      "hotel_name": "Hotel Example",
      "status": "Confirmed",
      "checkin": "2026-03-15",
      "checkout": "2026-03-18",
      "total_fare": 45000.0,
      "currency": "INR"
    }
  ]
}
```

---

## 9. Flight Endpoints — Prefix: `/api/v1/flights`

> **Auth Required for all:** Yes (`agent` role only)  
> **Integration:** TBO Air API. All endpoints require agent authentication.

### POST `/api/v1/flights/search`
**Search flights via TBO Air API.**

**Request Body:**
```json
{
  "origin": "DEL",
  "destination": "BOM",
  "departure_date": "2026-03-15T00:00:00",
  "return_date": null,
  "adults": 2,
  "children": 0,
  "infants": 0,
  "cabin_class": 1,
  "preferred_airlines": ["AI", "UK"],
  "sources": null,
  "direct_flight": false,
  "one_stop_flight": false,
  "is_domestic": true,
  "preferred_currency": "USD"
}
```

**Cabin Class:** `1=Economy, 2=PremiumEconomy, 3=Business, 4=First`

**Response `200 OK`:**
```json
{
  "status": "success",
  "trace_id": "FLIGHT_TRACE_XYZ",
  "flights_found": 8,
  "results": [
    {
      "result_index": "OB1",
      "fare": 5500.0,
      "currency": "USD",
      "airline": "AI",
      "is_lcc": false,
      "segments": [
        {
          "airline": "Air India",
          "flight_number": "AI-101",
          "origin": "DEL",
          "destination": "BOM",
          "departure_time": "2026-03-15T06:00:00",
          "arrival_time": "2026-03-15T08:15:00",
          "duration": 135,
          "stops": 0
        }
      ]
    }
  ]
}
```

> **Save:** `trace_id` and `result_index` for subsequent fare quote / booking steps.

---

### POST `/api/v1/flights/fare-quote`
**Get exact confirmed fare for a selected flight (Step 2 of booking flow).**

**Request Body:**
```json
{
  "trace_id": "FLIGHT_TRACE_XYZ",
  "result_index": "OB1"
}
```

**Response `200 OK`:**
```json
{
  "status": "success",
  "fare": { "PublishedFare": 5500.0, "OfferedFare": 5200.0, "Currency": "USD" },
  "segments": [...],
  "validating_airline": "AI",
  "last_ticket_date": "2026-03-14T23:59:00",
  "mini_fare_rules": [...],
  "fare_classification": "Economy",
  "fare_rules": [...]
}
```

> **Save the complete `fare` and `segments` objects** — they are required for `/flights/book`.

---

### POST `/api/v1/flights/fare-rules`
**Get cancellation and change rules for a flight.**

**Request Body:**
```json
{
  "trace_id": "FLIGHT_TRACE_XYZ",
  "result_index": "OB1"
}
```

**Response `200 OK`:**
```json
{
  "status": "success",
  "fare_rules": [
    {
      "Airline": "AI",
      "FareRuleDetail": "Non-refundable..."
    }
  ]
}
```

---

### POST `/api/v1/flights/ssr`
**Get baggage, seat, and meal add-on options for a flight.**

**Request Body:**
```json
{
  "trace_id": "FLIGHT_TRACE_XYZ",
  "result_index": "OB1"
}
```

**Response `200 OK`:**
```json
{
  "status": "success",
  "baggage": [
    {
      "code": "BAG_15KG",
      "description": "15 kg check-in baggage",
      "weight": "15",
      "price": 1200.0,
      "currency": "INR"
    }
  ],
  "meals": [
    {
      "code": "VGML",
      "description": "Vegetarian Meal",
      "price": 250.0,
      "currency": "INR"
    }
  ],
  "seat_dynamic": [...]
}
```

---

### POST `/api/v1/flights/book`
**Book a flight and create PNR (Step 3 of booking flow).**

**Request Body:**
```json
{
  "trace_id": "FLIGHT_TRACE_XYZ",
  "result_index": "OB1",
  "passengers": [
    {
      "title": "Mr",
      "first_name": "Raj",
      "last_name": "Sharma",
      "date_of_birth": "1990-05-15",
      "gender": 1,
      "contact_no": "+919876543210",
      "email": "raj@example.com",
      "nationality": "IN",
      "country": "IN",
      "city": "Delhi",
      "address": "123 Main St",
      "passport_number": null,
      "passport_expiry": null,
      "baggage_code": "BAG_15KG",
      "meal_code": "VGML",
      "seat_code": null
    }
  ],
  "segments_be": [...],
  "fare": { "PublishedFare": 5500.0 },
  "fare_rules": null,
  "mini_fare_rules": null,
  "fare_classification": null,
  "is_lcc": false,
  "source_session_id": null,
  "order_key": null
}
```

**Response `200 OK`:**
```json
{
  "status": "booked",
  "booking_id": "flight-booking-uuid",
  "pnr": "ABC123",
  "message": "Flight booked successfully. PNR: ABC123"
}
```

**Save the `booking_id`** — used for ticketing.

---

### POST `/api/v1/flights/ticket`
**Issue e-ticket for a booked flight (Step 4, GDS only — LCC auto-tickets).**

**Request Body:**
```json
{
  "flight_booking_id": "flight-booking-uuid"
}
```

**Response `200 OK`:**
```json
{
  "status": "ticketed",
  "booking_id": "flight-booking-uuid",
  "pnr": "ABC123",
  "ticket_number": "098-1234567890",
  "message": "Ticket issued successfully"
}
```

**Status Values:** `ticketed | already_ticketed | ticket_failed`

---

## 10. Agent Dashboard Endpoints — Prefix: `/api/v1/agent`

> **Auth Required for all:** Yes (`agent` role only)

### GET `/api/v1/agent/itinerary/options?event_id={event_id}`
**Get optimizer-generated itinerary options for an event (human-in-the-loop review).**

**Query Param:** `event_id` (string, required)

**Response `200 OK`:**
```json
{
  "options": [
    {
      "option_id": "uuid",
      "summary": "Includes Qutub Minar, removes Lotus Temple. Est. cost ₹25,500.",
      "cost": 25500.0,
      "satisfaction": 0.85,
      "status": "PENDING",
      "details": {
        "type": "re_optimization",
        "family_ids": ["FAM_A", "FAM_B"],
        "itinerary": { ... },
        "changes": [...]
      }
    }
  ]
}
```

---

### POST `/api/v1/agent/itinerary/approve`
**Approve an itinerary option (triggers Tools Agent + Communication Agent).**

**Request Body:**
```json
{
  "option_id": "uuid"
}
```

**Response `200 OK`:**
```json
{
  "message": "Option 'uuid' approved successfully.",
  "option_id": "uuid",
  "tools_agent_triggered": true,
  "communication_agent_triggered": true
}
```

**Side Effects of Approval:**
1. DB status updated (approved) + sibling options auto-rejected
2. Itinerary published to customer-facing tables (visible via `/itinerary/current`)
3. Tools Agent triggered (booking preparation)
4. Communication Agent triggered (traveller notifications via WebSocket)

---

## 11. Policy Engine Endpoints — Prefix: `/api/v1/agent`

### POST `/api/v1/agent/decision-policy/evaluate`
**Evaluate a group POI request. Calculates Instability Score and decides action.**

- **Auth Required:** No (internal use / agent use)

**Request Body:**
```json
{
  "request_id": "REQ_20260315_001",
  "requested_location_id": "LOC_012",
  "origin_family": "FAM_A",
  "family_responses": [
    {
      "family_id": "FAM_A",
      "response": "YES",
      "confidence": 0.9,
      "current_satisfaction": 0.78,
      "delta_satisfaction": 0.12
    },
    {
      "family_id": "FAM_B",
      "response": "NEUTRAL",
      "confidence": 0.6,
      "current_satisfaction": 0.82,
      "delta_satisfaction": -0.03
    }
  ],
  "family_profiles": [
    {
      "family_id": "FAM_A",
      "members": 4,
      "children": 1,
      "budget_sensitivity": 0.5,
      "interest_vector": {
        "history": 0.9, "architecture": 0.7, "food": 0.8,
        "nature": 0.5, "nightlife": 0.2, "shopping": 0.6, "religious": 0.4
      },
      "must_visit_locations": [],
      "never_visit_locations": []
    }
  ],
  "location_features": {
    "history": 0.8, "architecture": 0.9, "food": 0.2,
    "nature": 0.1, "nightlife": 0.0, "shopping": 0.0, "religious": 0.3
  },
  "group_context": {
    "remaining_trip_hours": 24.0,
    "locked_booking_ratio": 0.3,
    "optimizer_calls_used": 1
  }
}
```

**Response `200 OK`:**
```json
{
  "request_id": "REQ_20260315_001",
  "decision": "OPTIMIZE",
  "score": 0.72,
  "threshold": 0.6,
  "optimizer_triggered": true,
  "explanation": "High instability score (0.72) — majority YES with significant satisfaction gain. Optimizer triggered."
}
```

**Decision Values:** `"OPTIMIZE" | "MANUAL_REVIEW" | "REJECT"`

---

### GET `/api/v1/agent/decision-policy/history?limit={n}`
**Get recent policy decision history for audit.**

- **Auth Required:** No
- **Query Param:** `limit` (default 50, max 200)

**Response `200 OK`:** Array of past policy decisions.

---

### GET `/api/v1/agent/decision-policy/{request_id}`
**Get a specific policy decision by request ID.**

**Response `200 OK`:** Single policy decision record.

---

## 12. Events Endpoints — Prefix: `/api/v1/events`

### POST `/api/v1/events/`
**Create and dispatch an event for agentic processing.**

- **Auth Required:** Yes (any role)

**Event Types:**
| Type | Description |
|---|---|
| `FEEDBACK` | User rating feedback for a POI |
| `POI_REQUEST` | Request to add a specific POI |
| `SCHEDULE_CONFLICT` | Conflict in schedule |
| `WEATHER_ALERT` | Weather disruption |
| `TRANSPORT_DISRUPTION` | Transport issue |
| `BUDGET_EXCEEDED` | Budget constraint violation |
| `EMERGENCY` | Emergency situation |

**Request Body:**
```json
{
  "event_type": "FEEDBACK",
  "entity_type": "poi",
  "entity_id": "LOC_001",
  "source": "ui",
  "payload": {
    "rating": 4,
    "comment": "Great experience at Red Fort!",
    "node_id": "LOC_001"
  }
}
```

**Response `200 OK`:**
```json
{
  "event_id": "uuid",
  "status": "pending"
}
```

---

### GET `/api/v1/events/?family_id={uuid}&limit={n}`
**List recent events for a family (agent view only).**

- **Auth Required:** Yes (`agent` role)
- **Query Params:** `family_id` (UUID, required), `limit` (default 50)

**Response `200 OK`:**
```json
[
  {
    "event_id": "uuid",
    "event_type": "FEEDBACK",
    "status": "processed",
    "payload": { "rating": 4, "comment": "..." },
    "created_at": "2026-03-15T10:00:00",
    "family_id": "uuid"
  }
]
```

---

## 13. Health Check

### GET `/health`
**Verify backend, database, and Redis connectivity.**

- **Auth Required:** No
- **Note:** This endpoint is on the root (no `/api/v1` prefix)

**Response `200 OK`:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

**Degraded Response:**
```json
{
  "status": "degraded",
  "database": "error: connection refused",
  "redis": "connected"
}
```

---

## 14. WebSocket Endpoints

> **No authentication on the WebSocket URL itself** — agent/user ID is embedded in the path.

### WS `/ws/agent/{agent_id}`
**Real-time notifications for travel agents (booking status, approvals).**

**Connect:**
```javascript
const ws = new WebSocket(`ws://localhost:8000/ws/agent/${agentId}`);
```

**Message Schema (received from server):**
```json
// Connection established
{ "type": "connected", "message": "Agent <id> connected for real-time notifications" }

// Booking progress
{
  "type": "booking_update",
  "job_id": "uuid",
  "step": "hotel_search",
  "status": "in_progress",
  "message": "Searching hotels in Delhi NCR..."
}

// Booking step complete
{
  "type": "booking_step_complete",
  "job_id": "uuid",
  "step": "hotel_book",
  "hotel_name": "The Leela Palace",
  "confirmation_no": "CONF123456",
  "total_fare": 45000.0
}

// Booking job complete
{ "type": "booking_complete", "job_id": "uuid", "status": "completed" }

// Error notification
{ "type": "booking_error", "job_id": "uuid", "error": "Hotel not available" }

// Acknowledge client message
{ "type": "ack", "received": "ping" }
```

**Send (Keepalive):**
```javascript
ws.send("ping");
```

---

### WS `/ws/traveller/{user_id}`
**Real-time notifications for travellers (itinerary updates, booking confirmations).**

**Connect:**
```javascript
const ws = new WebSocket(`ws://localhost:8000/ws/traveller/${userId}`);
```

**Message Schema (received from server):**
```json
// Connection established
{ "type": "connected", "message": "Connected for real-time travel updates" }

// Itinerary approved and updated
{
  "type": "itinerary_updated",
  "message": "Your itinerary has been updated by the agent",
  "changes": ["Qutub Minar added on Day 2", "Lotus Temple removed"]
}

// Agent message
{
  "type": "agent_message",
  "from": "agent",
  "message": "Your booking at The Leela Palace is confirmed!"
}
```

---

## 15. Error Codes Reference

| HTTP Status | Meaning | Common Causes |
|---|---|---|
| `400` | Bad Request | Invalid input, validation failure |
| `401` | Unauthorized | Missing or expired token |
| `403` | Forbidden | Insufficient role (e.g. user tries to access agent endpoint) |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource (e.g. email already exists) |
| `422` | Unprocessable Entity | Pydantic validation error (check request body) |
| `429` | Too Many Requests | Rate limit exceeded (100 req/60s) |
| `500` | Internal Server Error | Backend exception |
| `503` | Service Unavailable | Agent system not available |

**Standard Error Response Body:**
```json
{
  "detail": "Human-readable error message"
}
```

---

## 16. Data Models Reference

### UserRole
```
"user" | "agent"
```

### BookingItemType
```
"hotel" | "flight" | "bus" | "train" | "restaurant" | "activity" | "transfer"
```

### BookingStatus
```
"pending" | "processing" | "completed" | "partial_failure" | "failed"
```

### EventType
```
"FEEDBACK" | "POI_REQUEST" | "SCHEDULE_CONFLICT" | "WEATHER_ALERT" |
"TRANSPORT_DISRUPTION" | "BUDGET_EXCEEDED" | "EMERGENCY"
```

### PolicyDecision
```
"OPTIMIZE" | "MANUAL_REVIEW" | "REJECT"
```

### FamilyResponse Vote
```
"YES" | "NEUTRAL" | "NO"
```

### InterestVector (all fields `0.0 – 1.0`)
```json
{
  "history": 0.0,
  "architecture": 0.0,
  "food": 0.0,
  "nature": 0.0,
  "nightlife": 0.0,
  "shopping": 0.0,
  "religious": 0.0,
  "adventure": 0.5,
  "culture": 0.5
}
```

---

## 17. Backend Services Overview

| Service File | Purpose |
|---|---|
| `trip_service.py` | Trip session CRUD, initialization, preference management |
| `itinerary_service.py` | Itinerary versioning, publishing, diff computation |
| `optimizer_service.py` | ML optimizer orchestration, agent pipeline coordination |
| `agent_service.py` | AI agent coordination (FeedbackAgent, DecisionPolicy, Tools, Communication) |
| `booking_service.py` | Booking job CRUD, hotel booking state management |
| `tbo_service.py` | TBO Hotel API client (search, book, cancel) |
| `tbo_air_service.py` | TBO Air API client (search, fare quote, book, ticket) |
| `event_service.py` | Event creation and retrieval |
| `explanation_service.py` | LLM explanation storage and retrieval |
| `family_service.py` | Family and member management |
| `user_service.py` | User CRUD and authentication |
| `policy_service.py` | Decision policy persistence and audit |
| `preference_service.py` | POI preference management |
| `itinerary_option_service.py` | Optimizer option approval workflow |
| `city_code_cache.py` | TBO city code caching |

### Celery Tasks (Async Background Jobs)
| Task | Triggered By | Purpose |
|---|---|---|
| `process_event_task` | Event creation | Run AI agent pipeline for an event |
| `process_hotel_booking` | `POST /bookings/execute` | Execute hotel + flight bookings via TBO |

---

## 18. Integration Checklist for Frontend

### Authentication Flow
- [ ] `POST /auth/login` or `POST /auth/signup` → store `access_token` in memory (NOT localStorage)
- [ ] Store token expiry, auto-refresh via `POST /auth/refresh` before expiry
- [ ] Include `Authorization: Bearer <token>` on every authenticated request
- [ ] On `401`, trigger refresh flow; on refresh failure → redirect to login
- [ ] `POST /auth/logout` on user logout

### Traveller App Flow
- [ ] `GET /users/me` — load user profile on app start
- [ ] `GET /families/me` — load family context
- [ ] Connect WebSocket `/ws/traveller/{user_id}` for live updates
- [ ] `GET /itinerary/current` — display today's itinerary (poll or WS trigger)
- [ ] `POST /itinerary/feedback/agent` — chatbot / feedback interface
- [ ] `POST /itinerary/poi-request` — "request a visit" UI
- [ ] `GET /itinerary/explanations/{itinerary_id}` — show AI explanations

### Agent App Flow
- [ ] Connect WebSocket `/ws/agent/{agent_id}` for booking notifications
- [ ] `GET /agent/itinerary/options?event_id=...` — review optimizer suggestions
- [ ] `POST /agent/itinerary/approve` — approve itinerary option
- [ ] `POST /bookings/hotels/search` — search hotels
- [ ] `POST /bookings/execute` — initiate booking (watch WS for progress)
- [ ] `GET /bookings/status/{job_id}` — poll booking status
- [ ] `POST /flights/search` → `POST /flights/fare-quote` → `POST /flights/book` → `POST /flights/ticket`
- [ ] `GET /events/?family_id=...` — customer suggestions panel

### Common Calls
- [ ] `GET /health` — check backend health on load
- [ ] Handle `429` rate limit errors gracefully with retry logic
- [ ] Handle `422` validation errors — show field-level messages from `detail[].loc`
