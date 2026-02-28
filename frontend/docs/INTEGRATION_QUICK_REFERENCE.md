# Agent Frontend Integration - Quick Reference

> **TL;DR** - Fast lookup guide for backend API integration

---

## Authentication Flow

```typescript
// Login
POST /api/v1/auth/login
Body: username=email&password=pass (form-urlencoded)
Response: { access_token, token_type, expires_in }
Cookie: refresh_token (httpOnly)

// Refresh
POST /api/v1/auth/refresh
Cookie: refresh_token
Response: { access_token, expires_in }

// Get Profile
GET /api/v1/users/me
Header: Authorization: Bearer <token>
Response: { id, email, full_name, role, family_id }

// Logout
POST /api/v1/auth/logout
Header: Authorization: Bearer <token>
```

---

## Trip Management

```typescript
// List Trips
GET /api/v1/trips/?limit=20&skip=0
Response: { items: [...], total, skip, limit }

// Get Trip Summary
GET /api/v1/trips/{trip_id}/summary
Response: { trip_id, trip_name, destination, families, ... }

// Create Trip with Optimization
POST /api/v1/trips/initialize-with-optimization
Body: {
  trip_name, destination, start_date, end_date,
  family_ids: [], num_travellers
}
Response: { trip_id, option_id, event_id, optimizer_ran: true }
```

---

## Itinerary Approval

```typescript
// Get Pending Options
GET /api/v1/agent/itinerary/options?event_id={id}
Response: { options: [{ option_id, summary, cost, satisfaction, status }] }

// Approve Option
POST /api/v1/agent/itinerary/approve
Body: { option_id }
Response: { message, tools_agent_triggered, communication_agent_triggered }
```

---

## Hotel Booking

```typescript
// Search Hotels
POST /api/v1/bookings/hotels/search
Body: { city_code, checkin, checkout, rooms, adults, children, nationality }
Response: { status, trace_id, hotels_found, results: [...] }
// SAVE trace_id for booking!

// Execute Booking
POST /api/v1/bookings/execute
Body: {
  itinerary_id, items: ['hotel'], city_code, checkin, checkout,
  rooms, adults, children, nationality, guests: [...]
}
Response: { job_id, status: 'pending' }

// Check Status
GET /api/v1/bookings/status/{job_id}
Response: { job_id, status, items_completed, hotel_bookings: [...] }
```

---

## Flight Booking (5-Step Flow)

```typescript
// 1. Search
POST /api/v1/flights/search
Body: { origin, destination, departure_date, adults, cabin_class }
Response: { trace_id, flights_found, results: [...] }

// 2. Fare Quote
POST /api/v1/flights/fare-quote
Body: { trace_id, result_index }
Response: { fare, segments, validating_airline }

// 3. SSR (Optional)
POST /api/v1/flights/ssr
Body: { trace_id, result_index }
Response: { baggage: [...], meals: [...], seat_dynamic: [...] }

// 4. Book
POST /api/v1/flights/book
Body: { trace_id, result_index, passengers: [...], segments_be, fare }
Response: { status: 'booked', booking_id, pnr }

// 5. Ticket (GDS only, LCC auto-tickets)
POST /api/v1/flights/ticket
Body: { flight_booking_id }
Response: { status: 'ticketed', ticket_number }
```

---

## Events & Feedback

```typescript
// Get Events
GET /api/v1/events/?family_id={uuid}&limit=50
Response: [{ event_id, event_type, status, payload, created_at }]

// Event Types
FEEDBACK | POI_REQUEST | SCHEDULE_CONFLICT | WEATHER_ALERT |
TRANSPORT_DISRUPTION | BUDGET_EXCEEDED | EMERGENCY
```

---

## WebSocket

```typescript
// Connect
ws://localhost:8000/ws/agent/{agent_id}

// Messages Received
{ type: 'connected', message: '...' }
{ type: 'booking_update', job_id, step, status, message }
{ type: 'booking_step_complete', job_id, step, hotel_name, confirmation_no }
{ type: 'booking_complete', job_id, status }
{ type: 'booking_error', job_id, error }
{ type: 'itinerary_updated', message, changes: [...] }

// Send (Keepalive)
ws.send('ping')
```

---

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request body |
| 401 | Unauthorized | Refresh token or re-login |
| 403 | Forbidden | Check user role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Validation Error | Check field errors |
| 429 | Rate Limit | Wait and retry |
| 500 | Server Error | Retry later |

---

## Common Patterns

### API Call with Auth

```typescript
const token = localStorage.getItem('access_token');
const response = await fetch(`${API_URL}/api/v1/endpoint`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
  credentials: 'include', // For cookies
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.detail);
}

const result = await response.json();
```

### WebSocket Setup

```typescript
const ws = new WebSocket(`ws://localhost:8000/ws/agent/${agentId}`);

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleMessage(data);
};
ws.onerror = (error) => console.error('WS Error:', error);
ws.onclose = () => reconnect();

// Keepalive
setInterval(() => ws.send('ping'), 30000);
```

### Token Refresh

```typescript
const refreshToken = async () => {
  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    // Refresh failed - logout
    window.location.href = '/agent-login';
    return;
  }
  
  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
  
  // Schedule next refresh
  setTimeout(refreshToken, (data.expires_in - 60) * 1000);
};
```

---

## File Locations

### Pages to Modify

```
app/agent-login/page.tsx
app/agent-dashboard/page.tsx                                    # Main landing - active groups
app/agent-dashboard/components/AgentDashboardInteractive.tsx    # Dashboard logic
app/agent-dashboard/itinerary-management/page.tsx               # All trips management
app/agent-dashboard/itinerary-management/[tripId]/page.tsx
app/agent-request-review/page.tsx
```

### Key Route Clarification

**`/agent-dashboard`** = Main landing page (NOT a redirect)
- Shows active groups, stats, destination cards
- Uses `<AgentDashboardInteractive />` component
- Mock data: `@/lib/agent-dashboard/data` (activeGroups)

**`/agent-dashboard/itinerary-management`** = Separate trip management page
- Shows all trips with optimization tools
- Uses `<ItineraryOptimizerWindow />` component
- Mock data: `itinerary_data.json`

### Files to Create

```
app/agent-dashboard/itinerary-management/new/page.tsx
app/agent-dashboard/itinerary-management/[tripId]/bookings/page.tsx
app/agent-dashboard/itinerary-management/[tripId]/groups/page.tsx
app/agent-dashboard/itinerary-management/[tripId]/intelligence/page.tsx
components/agent/HotelSearchForm.tsx
components/agent/FlightBookingWizard.tsx
hooks/useAgentWebSocket.ts
```

### Core Files

```
contexts/AuthContext.tsx - Auth state management
services/api.ts - API client
lib/errorHandler.ts - Error handling
```

---

## Environment Setup

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## Testing Commands

```bash
# Test login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=agent@example.com&password=password123"

# Test protected endpoint
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <token>"

# Test WebSocket
wscat -c ws://localhost:8000/ws/agent/<agent_id>
```

---

## Implementation Order

1. ✅ Auth (login, signup, refresh, logout)
2. ✅ Dashboard (stats, trip list)
3. ✅ Trip Management (create, view, update)
4. ✅ Itinerary Approval (options, approve)
5. ✅ WebSocket (real-time updates)
6. ⏳ Hotel Booking (search, book, monitor)
7. ⏳ Flight Booking (5-step wizard)
8. ⏳ Events & Feedback (list, filter)
9. ⏳ Analytics (charts, metrics)

---

**Full Documentation:** `frontend/docs/AGENT_FRONTEND_INTEGRATION_PLAN.md`
