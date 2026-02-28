# Agent Frontend Integration Plan
> **Complete Backend Integration Roadmap** | Last Updated: 2026-02-28  
> Purpose: Remove all mock data and connect agent frontend to real backend APIs

---

## Table of Contents
1. [Authentication Flow](#1-authentication-flow)
2. [Dashboard Integration](#2-dashboard-integration)
3. [Itinerary Management](#3-itinerary-management)
4. [Booking Management](#4-booking-management)
5. [Flight Management](#5-flight-management)
6. [Events & Feedback](#6-events--feedback)
7. [WebSocket Integration](#7-websocket-integration)
8. [State Management Strategy](#8-state-management-strategy)
9. [Error Handling](#9-error-handling)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Authentication Flow

### 1.1 Login Page (`/agent/login`)

**Current State:** Mock authentication  
**Target API:** `POST /api/v1/auth/login`

**Implementation Steps:**

```typescript
// frontend/app/agent/login/page.tsx
import { useAuth } from '@/contexts/AuthContext';

const handleLogin = async (email: string, password: string) => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
      credentials: 'include', // Important for refresh token cookie
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    // Store access token in AuthContext
    setAuth({
      token: data.access_token,
      expiresIn: data.expires_in,
    });

    // Fetch user profile
    await fetchUserProfile(data.access_token);
    
    router.push('/agent/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
```


**Files to Modify:**
- `frontend/app/agent/login/page.tsx`
- `frontend/contexts/AuthContext.tsx`

**API Contract:**
- Request: `username` (email) + `password` (form-urlencoded)
- Response: `{ access_token, token_type, expires_in }`
- Side Effect: Sets `refresh_token` httpOnly cookie

---

### 1.2 Signup Page (`/agent/signup`)

**Current State:** Mock registration  
**Target API:** `POST /api/v1/auth/signup`

**Implementation:**

```typescript
const handleSignup = async (formData: SignupForm) => {
  const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.email,
      password: formData.password,
      full_name: formData.fullName,
      role: 'agent', // Always 'agent' for agent signup
    }),
    credentials: 'include',
  });
  
  // Same response handling as login
};
```

**Validation Rules:**
- Password: min 8 characters
- Email: valid format
- Role: hardcoded to 'agent'

---

### 1.3 Auth Context Enhancement

**File:** `frontend/contexts/AuthContext.tsx`

**Required Changes:**

```typescript
interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresAt: number | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'agent' | 'user';
  family_id: string | null;
  is_active: boolean;
}
```


**Key Functions to Implement:**

```typescript
// Fetch user profile after login
const fetchUserProfile = async (token: string) => {
  const response = await fetch(`${API_URL}/api/v1/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const user = await response.json();
  
  // Verify role is 'agent'
  if (user.role !== 'agent') {
    throw new Error('Access denied: Agent role required');
  }
  
  setUser(user);
};

// Auto-refresh token before expiry
const setupTokenRefresh = (expiresIn: number) => {
  const refreshTime = (expiresIn - 60) * 1000; // Refresh 1 min before expiry
  
  setTimeout(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      setAuth({ token: data.access_token, expiresIn: data.expires_in });
      setupTokenRefresh(data.expires_in);
    } catch (error) {
      // Refresh failed - logout user
      handleLogout();
    }
  }, refreshTime);
};

// Logout
const handleLogout = async () => {
  await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    credentials: 'include',
  });
  
  setAuth({ token: null, user: null, isAuthenticated: false });
  router.push('/agent/login');
};
```

---

## 2. Dashboard Integration

### 2.1 Dashboard Overview (`/agent/dashboard`)

**Current State:** Mock statistics  
**Target APIs:**
- `GET /api/v1/trips/` - List all trips
- `GET /api/v1/events/?family_id={id}&limit=50` - Recent events
- WebSocket `/ws/agent/{agent_id}` - Real-time updates

```typescript
// frontend/app/agent-dashboard/page.tsx or create new dashboard home
const AgentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [trips, setTrips] = useState([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();
    
    // Connect WebSocket for real-time updates
    connectWebSocket();
    
    return () => ws.current?.close();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('access_token');
    
    // Fetch trips
    const tripsRes = await fetch(`${API_URL}/api/v1/trips/?limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const tripsData = await tripsRes.json();
    setTrips(tripsData.items);
    
    // Calculate stats from trips
    const activeTrips = tripsData.items.filter(t => t.trip_status === 'active').length;
    const pendingApprovals = tripsData.items.filter(t => t.trip_status === 'pending_approval').length;
    
    setStats({
      activeTrips,
      pendingApprovals,
      totalTrips: tripsData.total,
    });
  };

  const connectWebSocket = () => {
    ws.current = new WebSocket(`ws://localhost:8000/ws/agent/${user.id}`);
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'booking_update') {
        // Show toast notification
        toast.info(`Booking update: ${data.message}`);
      } else if (data.type === 'itinerary_updated') {
        // Refresh trips list
        fetchDashboardData();
      }
    };
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Active Trips" value={stats?.activeTrips} />
        <StatCard title="Pending Approvals" value={stats?.pendingApprovals} />
        <StatCard title="Total Trips" value={stats?.totalTrips} />
      </div>
      
      {/* Recent Trips Table */}
      <TripsTable trips={trips} />
    </div>
  );
};
```

**Files to Create/Modify:**
- `frontend/app/agent-dashboard/page.tsx` (main dashboard)
- `frontend/components/agent/StatCard.tsx`
- `frontend/components/agent/TripsTable.tsx`

**Data to Display:**


```typescript
// frontend/app/agent/dashboard/page.tsx
interface DashboardStats {
  activeTrips: number;
  pendingApprovals: number;
  activeBookings: number;
  recentEvents: Event[];
  trips: Trip[];
}

const fetchDashboardData = async () => {
  const [tripsRes, eventsRes] = await Promise.all([
    fetch(`${API_URL}/api/v1/trips/?limit=10&trip_status=active`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }),
    fetch(`${API_URL}/api/v1/events/?limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }),
  ]);

  const trips = await tripsRes.json();
  const events = await eventsRes.json();

  // Calculate stats from real data
  const stats = {
    activeTrips: trips.total,
    pendingApprovals: events.filter(e => e.status === 'pending').length,
    activeBookings: 0, // Calculate from booking jobs
    recentEvents: events.items,
    trips: trips.items,
  };

  setDashboardData(stats);
};
```

**Files to Modify:**
- `frontend/app/agent/dashboard/page.tsx`
- Create: `frontend/lib/api/dashboard.ts`

---

### 2.2 Trip List Component

**Component:** `frontend/components/agent/TripList.tsx`

**API Integration:**

```typescript
const TripList = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pagination, setPagination] = useState({ skip: 0, limit: 20 });

  useEffect(() => {
    const fetchTrips = async () => {
      const response = await fetch(
        `${API_URL}/api/v1/trips/?skip=${pagination.skip}&limit=${pagination.limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setTrips(data.items);
      setPagination({ ...pagination, total: data.total });
    };
    fetchTrips();
  }, [pagination.skip]);

  return (
    // Render trip cards with real data
  );
};
```

---

## 3. Itinerary Management

### 3.1 Itinerary Options Review (`/agent/itinerary/review`)

**Current State:** Mock itinerary options  
**Target API:** `GET /api/v1/agent/itinerary/options?event_id={event_id}`


**Implementation:**

```typescript
// frontend/app/agent/itinerary/review/page.tsx
interface ItineraryOption {
  option_id: string;
  summary: string;
  cost: number;
  satisfaction: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  details: {
    type: string;
    family_ids: string[];
    itinerary: any;
    changes: any[];
  };
}

const ItineraryReviewPage = () => {
  const [options, setOptions] = useState<ItineraryOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchOptions = async (eventId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/agent/itinerary/options?event_id=${eventId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setOptions(data.options);
    } catch (error) {
      console.error('Failed to fetch options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (optionId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/agent/itinerary/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ option_id: optionId }),
        }
      );

      if (!response.ok) throw new Error('Approval failed');

      const result = await response.json();
      toast.success(result.message);
      
      // Refresh options list
      await fetchOptions(selectedEventId);
    } catch (error) {
      toast.error('Failed to approve option');
    }
  };

  return (
    <div>
      {/* Event selector dropdown */}
      {/* Options comparison view */}
      {/* Approve/Reject buttons */}
    </div>
  );
};
```

**Files to Modify:**
- `frontend/app/agent/itinerary/review/page.tsx`
- Create: `frontend/lib/api/itinerary.ts`
- Create: `frontend/types/itinerary.ts`


---

### 3.2 Itinerary Diff Viewer

**Component:** `frontend/components/agent/ItineraryDiff.tsx`  
**Target API:** `GET /api/v1/itinerary/diff?version_a={int}&version_b={int}`

**Implementation:**

```typescript
interface ItineraryDiff {
  version_a: number;
  version_b: number;
  added_pois: POI[];
  removed_pois: POI[];
  changed_pois: POIChange[];
  cost_delta: number;
  satisfaction_delta: number;
}

const ItineraryDiffViewer = ({ versionA, versionB }: Props) => {
  const [diff, setDiff] = useState<ItineraryDiff | null>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      const response = await fetch(
        `${API_URL}/api/v1/itinerary/diff?version_a=${versionA}&version_b=${versionB}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setDiff(data);
    };
    fetchDiff();
  }, [versionA, versionB]);

  return (
    <div className="diff-viewer">
      <div className="added-section">
        <h3>Added POIs ({diff?.added_pois.length})</h3>
        {diff?.added_pois.map(poi => (
          <POICard key={poi.id} poi={poi} status="added" />
        ))}
      </div>
      
      <div className="removed-section">
        <h3>Removed POIs ({diff?.removed_pois.length})</h3>
        {diff?.removed_pois.map(poi => (
          <POICard key={poi.id} poi={poi} status="removed" />
        ))}
      </div>

      <div className="metrics">
        <MetricCard 
          label="Cost Change" 
          value={diff?.cost_delta} 
          format="currency"
        />
        <MetricCard 
          label="Satisfaction Change" 
          value={diff?.satisfaction_delta} 
          format="percentage"
        />
      </div>
    </div>
  );
};
```

---

## 4. Booking Management

### 4.1 Hotel Search (`/agent/bookings/hotels`)

**Current State:** Mock hotel data  
**Target API:** `POST /api/v1/bookings/hotels/search`


**Implementation:**

```typescript
// frontend/app/agent/bookings/hotels/page.tsx
interface HotelSearchParams {
  city_code: string;
  checkin: string;
  checkout: string;
  rooms: number;
  adults: number;
  children: number;
  nationality: string;
  star_rating?: number;
  refundable?: boolean;
}

const HotelSearchPage = () => {
  const [searchParams, setSearchParams] = useState<HotelSearchParams>({
    city_code: '418069', // Delhi
    checkin: '',
    checkout: '',
    rooms: 1,
    adults: 2,
    children: 0,
    nationality: 'IN',
  });
  const [hotels, setHotels] = useState([]);
  const [traceId, setTraceId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/bookings/hotels/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchParams),
        }
      );

      const data = await response.json();
      
      if (data.status === 'success') {
        setHotels(data.results);
        setTraceId(data.trace_id); // CRITICAL: Save for booking
        toast.success(`Found ${data.hotels_found} hotels`);
      }
    } catch (error) {
      toast.error('Hotel search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <HotelSearchForm 
        params={searchParams} 
        onChange={setSearchParams}
        onSearch={handleSearch}
      />
      <HotelResults hotels={hotels} traceId={traceId} />
    </div>
  );
};
```

**Files to Modify:**
- `frontend/app/agent/bookings/hotels/page.tsx`
- Create: `frontend/components/agent/HotelSearchForm.tsx`
- Create: `frontend/components/agent/HotelResults.tsx`
- Create: `frontend/lib/api/bookings.ts`


---

### 4.2 Booking Execution (`/agent/bookings/execute`)

**Target API:** `POST /api/v1/bookings/execute`

**Implementation:**

```typescript
// frontend/components/agent/BookingExecutor.tsx
interface BookingRequest {
  itinerary_id: string;
  items: ('hotel' | 'flight')[];
  // Hotel params
  city_code: string;
  checkin: string;
  checkout: string;
  rooms: number;
  adults: number;
  children: number;
  nationality: string;
  guests: Guest[];
  // Flight params (optional)
  flight_origin?: string;
  flight_destination?: string;
  flight_departure_date?: string;
  flight_cabin_class?: number;
}

const BookingExecutor = ({ itineraryId }: Props) => {
  const [jobId, setJobId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const executeBooking = async (request: BookingRequest) => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/bookings/execute`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      const data = await response.json();
      setJobId(data.job_id);
      setStatus(data.status);
      
      toast.success(data.message);
      
      // Start polling or listen to WebSocket
      startStatusPolling(data.job_id);
    } catch (error) {
      toast.error('Booking execution failed');
    }
  };

  const startStatusPolling = (jobId: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(
        `${API_URL}/api/v1/bookings/status/${jobId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      
      setStatus(data.status);
      
      if (['completed', 'failed', 'partial_failure'].includes(data.status)) {
        clearInterval(interval);
        handleBookingComplete(data);
      }
    }, 3000); // Poll every 3 seconds
  };

  return (
    <div>
      {/* Booking form */}
      {jobId && <BookingStatusTracker jobId={jobId} status={status} />}
    </div>
  );
};
```


---

### 4.3 Booking Status Tracker

**Component:** `frontend/components/agent/BookingStatusTracker.tsx`  
**Target API:** `GET /api/v1/bookings/status/{job_id}`

```typescript
interface BookingStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'partial_failure' | 'failed';
  items_requested: string[];
  items_completed: Record<string, string>;
  hotel_bookings?: HotelBooking[];
  error_message?: string;
}

const BookingStatusTracker = ({ jobId }: Props) => {
  const [status, setStatus] = useState<BookingStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const response = await fetch(
        `${API_URL}/api/v1/bookings/status/${jobId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setStatus(data);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div className="booking-tracker">
      <StatusBadge status={status?.status} />
      
      <div className="items-progress">
        {status?.items_requested.map(item => (
          <ItemProgress 
            key={item}
            item={item}
            status={status.items_completed[item]}
          />
        ))}
      </div>

      {status?.hotel_bookings && (
        <div className="booking-details">
          {status.hotel_bookings.map(booking => (
            <HotelBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 5. Flight Management

### 5.1 Flight Search (`/agent/flights/search`)

**Current State:** Mock flight data  
**Target API:** `POST /api/v1/flights/search`


**Implementation:**

```typescript
// frontend/app/agent/flights/search/page.tsx
interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  children: number;
  infants: number;
  cabin_class: 1 | 2 | 3 | 4; // Economy, PremEcon, Business, First
  direct_flight?: boolean;
  preferred_airlines?: string[];
}

const FlightSearchPage = () => {
  const [searchParams, setSearchParams] = useState<FlightSearchParams>({
    origin: 'DEL',
    destination: 'BOM',
    departure_date: '',
    adults: 1,
    children: 0,
    infants: 0,
    cabin_class: 1,
  });
  const [flights, setFlights] = useState([]);
  const [traceId, setTraceId] = useState<string>('');

  const handleSearch = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/flights/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchParams),
        }
      );

      const data = await response.json();
      
      if (data.status === 'success') {
        setFlights(data.results);
        setTraceId(data.trace_id); // Save for fare quote
        toast.success(`Found ${data.flights_found} flights`);
      }
    } catch (error) {
      toast.error('Flight search failed');
    }
  };

  const handleSelectFlight = async (resultIndex: string) => {
    // Navigate to fare quote page with traceId and resultIndex
    router.push(`/agent/flights/quote?trace_id=${traceId}&result_index=${resultIndex}`);
  };

  return (
    <div>
      <FlightSearchForm params={searchParams} onChange={setSearchParams} />
      <FlightResults flights={flights} onSelect={handleSelectFlight} />
    </div>
  );
};
```

**Files to Modify:**
- `frontend/app/agent/flights/search/page.tsx`
- Create: `frontend/components/agent/FlightSearchForm.tsx`
- Create: `frontend/components/agent/FlightResults.tsx`


---

### 5.2 Flight Booking Flow

**Pages:**
1. Search → 2. Fare Quote → 3. SSR (Add-ons) → 4. Book → 5. Ticket

**Step 2: Fare Quote (`/agent/flights/quote`)**

```typescript
// frontend/app/agent/flights/quote/page.tsx
const FareQuotePage = () => {
  const searchParams = useSearchParams();
  const traceId = searchParams.get('trace_id');
  const resultIndex = searchParams.get('result_index');
  
  const [fareDetails, setFareDetails] = useState(null);

  useEffect(() => {
    const fetchFareQuote = async () => {
      const response = await fetch(
        `${API_URL}/api/v1/flights/fare-quote`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trace_id: traceId, result_index: resultIndex }),
        }
      );
      const data = await response.json();
      setFareDetails(data);
    };
    fetchFareQuote();
  }, [traceId, resultIndex]);

  const handleProceedToSSR = () => {
    // Save fare details to context/state
    router.push(`/agent/flights/ssr?trace_id=${traceId}&result_index=${resultIndex}`);
  };

  return (
    <div>
      <FareBreakdown fare={fareDetails?.fare} />
      <FareRules rules={fareDetails?.fare_rules} />
      <button onClick={handleProceedToSSR}>Add Baggage & Meals</button>
    </div>
  );
};
```

**Step 3: SSR (Special Service Requests)**

```typescript
// frontend/app/agent/flights/ssr/page.tsx
const SSRPage = () => {
  const [ssrOptions, setSSROptions] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState({
    baggage: [],
    meals: [],
    seats: [],
  });

  useEffect(() => {
    const fetchSSR = async () => {
      const response = await fetch(
        `${API_URL}/api/v1/flights/ssr`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trace_id: traceId, result_index: resultIndex }),
        }
      );
      const data = await response.json();
      setSSROptions(data);
    };
    fetchSSR();
  }, []);

  return (
    <div>
      <BaggageSelector options={ssrOptions?.baggage} onChange={setSelectedAddons} />
      <MealSelector options={ssrOptions?.meals} onChange={setSelectedAddons} />
      <button onClick={() => router.push('/agent/flights/book')}>
        Proceed to Booking
      </button>
    </div>
  );
};
```


**Step 4: Book Flight**

```typescript
// frontend/app/agent/flights/book/page.tsx
const FlightBookPage = () => {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [bookingResult, setBookingResult] = useState(null);

  const handleBook = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/flights/book`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trace_id: traceId,
            result_index: resultIndex,
            passengers: passengers,
            segments_be: fareDetails.segments,
            fare: fareDetails.fare,
            is_lcc: fareDetails.is_lcc,
          }),
        }
      );

      const data = await response.json();
      
      if (data.status === 'booked') {
        setBookingResult(data);
        toast.success(`Flight booked! PNR: ${data.pnr}`);
        
        // For GDS flights, proceed to ticketing
        if (!fareDetails.is_lcc) {
          router.push(`/agent/flights/ticket?booking_id=${data.booking_id}`);
        }
      }
    } catch (error) {
      toast.error('Booking failed');
    }
  };

  return (
    <div>
      <PassengerForm passengers={passengers} onChange={setPassengers} />
      <button onClick={handleBook}>Confirm Booking</button>
    </div>
  );
};
```

**Step 5: Ticket Issuance (GDS only)**

```typescript
// frontend/app/agent/flights/ticket/page.tsx
const TicketPage = () => {
  const handleIssueTicket = async (bookingId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/flights/ticket`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ flight_booking_id: bookingId }),
        }
      );

      const data = await response.json();
      
      if (data.status === 'ticketed') {
        toast.success(`Ticket issued! Number: ${data.ticket_number}`);
      }
    } catch (error) {
      toast.error('Ticketing failed');
    }
  };

  return (
    <div>
      <BookingSummary />
      <button onClick={() => handleIssueTicket(bookingId)}>
        Issue E-Ticket
      </button>
    </div>
  );
};
```


---

## 6. Events & Feedback

### 6.1 Events Dashboard (`/agent/events`)

**Current State:** Mock events  
**Target API:** `GET /api/v1/events/?family_id={uuid}&limit={n}`

**Implementation:**

```typescript
// frontend/app/agent/events/page.tsx
interface Event {
  event_id: string;
  event_type: 'FEEDBACK' | 'POI_REQUEST' | 'SCHEDULE_CONFLICT' | 'WEATHER_ALERT' | 'TRANSPORT_DISRUPTION' | 'BUDGET_EXCEEDED' | 'EMERGENCY';
  status: 'pending' | 'processing' | 'processed' | 'failed';
  payload: any;
  created_at: string;
  family_id: string;
}

const EventsDashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    limit: 50,
  });

  const fetchEvents = async () => {
    const params = new URLSearchParams({
      family_id: selectedFamily,
      limit: filters.limit.toString(),
    });

    const response = await fetch(
      `${API_URL}/api/v1/events/?${params}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    setEvents(data);
  };

  useEffect(() => {
    if (selectedFamily) {
      fetchEvents();
    }
  }, [selectedFamily, filters]);

  const handleEventClick = (eventId: string) => {
    // Navigate to itinerary review with this event
    router.push(`/agent/itinerary/review?event_id=${eventId}`);
  };

  return (
    <div>
      <FamilySelector value={selectedFamily} onChange={setSelectedFamily} />
      <EventFilters filters={filters} onChange={setFilters} />
      
      <EventList events={events} onEventClick={handleEventClick} />
    </div>
  );
};
```

**Files to Modify:**
- `frontend/app/agent/events/page.tsx`
- Create: `frontend/components/agent/EventList.tsx`
- Create: `frontend/components/agent/EventCard.tsx`

---

### 6.2 Policy Decision History

**Component:** `frontend/components/agent/PolicyDecisionHistory.tsx`  
**Target API:** `GET /api/v1/agent/decision-policy/history?limit={n}`


```typescript
interface PolicyDecision {
  request_id: string;
  decision: 'OPTIMIZE' | 'MANUAL_REVIEW' | 'REJECT';
  score: number;
  threshold: number;
  optimizer_triggered: boolean;
  explanation: string;
  created_at: string;
}

const PolicyDecisionHistory = () => {
  const [decisions, setDecisions] = useState<PolicyDecision[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const response = await fetch(
        `${API_URL}/api/v1/agent/decision-policy/history?limit=100`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setDecisions(data);
    };
    fetchHistory();
  }, []);

  return (
    <div className="policy-history">
      <table>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>Decision</th>
            <th>Score</th>
            <th>Optimizer</th>
            <th>Explanation</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {decisions.map(decision => (
            <tr key={decision.request_id}>
              <td>{decision.request_id}</td>
              <td><DecisionBadge decision={decision.decision} /></td>
              <td>{decision.score.toFixed(2)}</td>
              <td>{decision.optimizer_triggered ? '✓' : '✗'}</td>
              <td>{decision.explanation}</td>
              <td>{formatDate(decision.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 7. WebSocket Integration

### 7.1 WebSocket Manager

**File:** `frontend/lib/websocket/AgentWebSocket.ts`

```typescript
class AgentWebSocketManager {
  private ws: WebSocket | null = null;
  private agentId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Function[]> = new Map();

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  connect() {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/agent/${this.agentId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Agent WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.attemptReconnect();
    };
  }

  private handleMessage(message: any) {
    const { type } = message;
    
    // Notify all listeners for this message type
    const listeners = this.listeners.get(type) || [];
    listeners.forEach(callback => callback(message));
  }

  on(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  off(eventType: string, callback: Function) {
    const listeners = this.listeners.get(eventType) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    this.ws?.close();
  }
}

export default AgentWebSocketManager;
```


---

### 7.2 WebSocket Context

**File:** `frontend/contexts/WebSocketContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import AgentWebSocketManager from '@/lib/websocket/AgentWebSocket';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  ws: AgentWebSocketManager | null;
  isConnected: boolean;
  subscribe: (eventType: string, callback: Function) => void;
  unsubscribe: (eventType: string, callback: Function) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [ws, setWs] = useState<AgentWebSocketManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const wsManager = new AgentWebSocketManager(user.id);
      wsManager.connect();
      
      wsManager.on('connected', () => setIsConnected(true));
      wsManager.on('disconnected', () => setIsConnected(false));
      
      setWs(wsManager);

      return () => {
        wsManager.disconnect();
      };
    }
  }, [isAuthenticated, user?.id]);

  const subscribe = (eventType: string, callback: Function) => {
    ws?.on(eventType, callback);
  };

  const unsubscribe = (eventType: string, callback: Function) => {
    ws?.off(eventType, callback);
  };

  return (
    <WebSocketContext.Provider value={{ ws, isConnected, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};
```

---

### 7.3 Using WebSocket in Components

**Example: Real-time Booking Updates**

```typescript
// frontend/components/agent/BookingMonitor.tsx
const BookingMonitor = () => {
  const { subscribe, unsubscribe } = useWebSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleBookingUpdate = (message: any) => {
      setNotifications(prev => [...prev, message]);
      toast.info(message.message);
    };

    const handleBookingComplete = (message: any) => {
      toast.success(`Booking ${message.job_id} completed!`);
    };

    const handleBookingError = (message: any) => {
      toast.error(`Booking error: ${message.error}`);
    };

    subscribe('booking_update', handleBookingUpdate);
    subscribe('booking_complete', handleBookingComplete);
    subscribe('booking_error', handleBookingError);

    return () => {
      unsubscribe('booking_update', handleBookingUpdate);
      unsubscribe('booking_complete', handleBookingComplete);
      unsubscribe('booking_error', handleBookingError);
    };
  }, [subscribe, unsubscribe]);

  return (
    <div className="booking-monitor">
      {notifications.map((notif, idx) => (
        <NotificationCard key={idx} notification={notif} />
      ))}
    </div>
  );
};
```


---

## 8. State Management Strategy

### 8.1 API Client Setup

**File:** `frontend/lib/api/client.ts`

```typescript
class APIClient {
  private baseURL: string;
  private getToken: () => string | null;

  constructor(baseURL: string, getToken: () => string | null) {
    this.baseURL = baseURL;
    this.getToken = getToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // For refresh token cookie
    });

    if (response.status === 401) {
      // Token expired - trigger refresh
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export default APIClient;
```

---

### 8.2 API Service Modules

**File:** `frontend/lib/api/services/auth.service.ts`

```typescript
import APIClient from '../client';

export class AuthService {
  constructor(private client: APIClient) {}

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${this.client.baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Login failed');
    return response.json();
  }

  async signup(data: SignupData) {
    return this.client.post('/api/v1/auth/signup', data);
  }

  async refresh() {
    return this.client.post('/api/v1/auth/refresh');
  }

  async logout() {
    return this.client.post('/api/v1/auth/logout');
  }

  async logoutAll() {
    return this.client.post('/api/v1/auth/logout-all');
  }

  async getProfile() {
    return this.client.get('/api/v1/users/me');
  }
}
```


**File:** `frontend/lib/api/services/itinerary.service.ts`

```typescript
export class ItineraryService {
  constructor(private client: APIClient) {}

  async getOptions(eventId: string) {
    return this.client.get(`/api/v1/agent/itinerary/options?event_id=${eventId}`);
  }

  async approveOption(optionId: string) {
    return this.client.post('/api/v1/agent/itinerary/approve', { option_id: optionId });
  }

  async getDiff(versionA: number, versionB: number) {
    return this.client.get(`/api/v1/itinerary/diff?version_a=${versionA}&version_b=${versionB}`);
  }

  async getExplanations(itineraryId: string, familyId?: string) {
    const params = familyId ? `?family_id=${familyId}` : '';
    return this.client.get(`/api/v1/itinerary/explanations/${itineraryId}${params}`);
  }
}
```

**File:** `frontend/lib/api/services/booking.service.ts`

```typescript
export class BookingService {
  constructor(private client: APIClient) {}

  async searchHotels(params: HotelSearchParams) {
    return this.client.post('/api/v1/bookings/hotels/search', params);
  }

  async executeBooking(request: BookingRequest) {
    return this.client.post('/api/v1/bookings/execute', request);
  }

  async getBookingStatus(jobId: string) {
    return this.client.get(`/api/v1/bookings/status/${jobId}`);
  }

  async cancelBooking(bookingId: string, reason: string) {
    return this.client.post('/api/v1/bookings/cancel', { booking_id: bookingId, reason });
  }
}
```

**File:** `frontend/lib/api/services/flight.service.ts`

```typescript
export class FlightService {
  constructor(private client: APIClient) {}

  async search(params: FlightSearchParams) {
    return this.client.post('/api/v1/flights/search', params);
  }

  async getFareQuote(traceId: string, resultIndex: string) {
    return this.client.post('/api/v1/flights/fare-quote', { trace_id: traceId, result_index: resultIndex });
  }

  async getSSR(traceId: string, resultIndex: string) {
    return this.client.post('/api/v1/flights/ssr', { trace_id: traceId, result_index: resultIndex });
  }

  async book(bookingData: FlightBookingData) {
    return this.client.post('/api/v1/flights/book', bookingData);
  }

  async ticket(bookingId: string) {
    return this.client.post('/api/v1/flights/ticket', { flight_booking_id: bookingId });
  }
}
```

**File:** `frontend/lib/api/services/event.service.ts`

```typescript
export class EventService {
  constructor(private client: APIClient) {}

  async getEvents(familyId: string, limit: number = 50) {
    return this.client.get(`/api/v1/events/?family_id=${familyId}&limit=${limit}`);
  }

  async createEvent(event: CreateEventRequest) {
    return this.client.post('/api/v1/events/', event);
  }
}
```


---

### 8.3 Service Factory

**File:** `frontend/lib/api/index.ts`

```typescript
import APIClient from './client';
import { AuthService } from './services/auth.service';
import { ItineraryService } from './services/itinerary.service';
import { BookingService } from './services/booking.service';
import { FlightService } from './services/flight.service';
import { EventService } from './services/event.service';

export class APIServices {
  public auth: AuthService;
  public itinerary: ItineraryService;
  public booking: BookingService;
  public flight: FlightService;
  public event: EventService;

  constructor(baseURL: string, getToken: () => string | null) {
    const client = new APIClient(baseURL, getToken);
    
    this.auth = new AuthService(client);
    this.itinerary = new ItineraryService(client);
    this.booking = new BookingService(client);
    this.flight = new FlightService(client);
    this.event = new EventService(client);
  }
}

// Usage in components
export const useAPI = () => {
  const { token } = useAuth();
  
  return useMemo(
    () => new APIServices(
      process.env.NEXT_PUBLIC_API_URL!,
      () => token
    ),
    [token]
  );
};
```

---

## 9. Error Handling

### 9.1 Global Error Handler

**File:** `frontend/lib/errors/handler.ts`

```typescript
export class APIError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public code?: string
  ) {
    super(detail);
    this.name = 'APIError';
  }
}

export const handleAPIError = (error: any) => {
  if (error.message === 'UNAUTHORIZED') {
    // Trigger token refresh or logout
    return { type: 'AUTH_ERROR', message: 'Session expired' };
  }

  if (error instanceof APIError) {
    switch (error.status) {
      case 400:
        return { type: 'VALIDATION_ERROR', message: error.detail };
      case 403:
        return { type: 'FORBIDDEN', message: 'Access denied' };
      case 404:
        return { type: 'NOT_FOUND', message: 'Resource not found' };
      case 409:
        return { type: 'CONFLICT', message: error.detail };
      case 422:
        return { type: 'VALIDATION_ERROR', message: error.detail };
      case 429:
        return { type: 'RATE_LIMIT', message: 'Too many requests. Please wait.' };
      case 500:
        return { type: 'SERVER_ERROR', message: 'Server error. Please try again.' };
      case 503:
        return { type: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' };
      default:
        return { type: 'UNKNOWN_ERROR', message: 'An error occurred' };
    }
  }

  return { type: 'NETWORK_ERROR', message: 'Network error. Check your connection.' };
};
```


---

### 9.2 Error Boundary Component

**File:** `frontend/components/ErrorBoundary.tsx`

```typescript
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 10. Implementation Phases

### Phase 1: Authentication & Core Setup (Week 1)

**Priority: CRITICAL**

- [ ] Update `AuthContext.tsx` with real API integration
- [ ] Implement login/signup pages with backend APIs
- [ ] Add token refresh mechanism
- [ ] Create `APIClient` and service modules
- [ ] Setup error handling infrastructure
- [ ] Test authentication flow end-to-end

**Files to Create/Modify:**
- `frontend/contexts/AuthContext.tsx`
- `frontend/app/agent/login/page.tsx`
- `frontend/app/agent/signup/page.tsx`
- `frontend/lib/api/client.ts`
- `frontend/lib/api/services/auth.service.ts`
- `frontend/lib/errors/handler.ts`

---

### Phase 2: Dashboard & Trip Management (Week 2)

**Priority: HIGH**

- [ ] Connect dashboard to real trip data
- [ ] Implement trip list with pagination
- [ ] Add trip summary view
- [ ] Create trip statistics components
- [ ] Setup WebSocket connection for real-time updates

**Files to Create/Modify:**
- `frontend/app/agent/dashboard/page.tsx`
- `frontend/components/agent/TripList.tsx`
- `frontend/components/agent/TripCard.tsx`
- `frontend/lib/api/services/trip.service.ts`
- `frontend/lib/websocket/AgentWebSocket.ts`
- `frontend/contexts/WebSocketContext.tsx`


---

### Phase 3: Itinerary Management (Week 3)

**Priority: HIGH**

- [ ] Implement itinerary options review page
- [ ] Add approval/rejection workflow
- [ ] Create itinerary diff viewer
- [ ] Integrate explanations display
- [ ] Connect to events for context

**Files to Create/Modify:**
- `frontend/app/agent/itinerary/review/page.tsx`
- `frontend/components/agent/ItineraryDiff.tsx`
- `frontend/components/agent/OptionComparison.tsx`
- `frontend/lib/api/services/itinerary.service.ts`
- `frontend/types/itinerary.ts`

---

### Phase 4: Booking System (Week 4-5)

**Priority: MEDIUM**

- [ ] Implement hotel search and results
- [ ] Create booking execution flow
- [ ] Add booking status tracker with WebSocket
- [ ] Implement flight search flow
- [ ] Add fare quote and SSR pages
- [ ] Create flight booking workflow
- [ ] Add ticketing functionality

**Files to Create/Modify:**
- `frontend/app/agent/bookings/hotels/page.tsx`
- `frontend/app/agent/bookings/execute/page.tsx`
- `frontend/components/agent/HotelSearchForm.tsx`
- `frontend/components/agent/BookingStatusTracker.tsx`
- `frontend/app/agent/flights/search/page.tsx`
- `frontend/app/agent/flights/quote/page.tsx`
- `frontend/app/agent/flights/ssr/page.tsx`
- `frontend/app/agent/flights/book/page.tsx`
- `frontend/app/agent/flights/ticket/page.tsx`
- `frontend/lib/api/services/booking.service.ts`
- `frontend/lib/api/services/flight.service.ts`

---

### Phase 5: Events & Monitoring (Week 6)

**Priority: MEDIUM**

- [ ] Create events dashboard
- [ ] Add event filtering and search
- [ ] Implement policy decision history
- [ ] Add real-time event notifications
- [ ] Create booking monitor component

**Files to Create/Modify:**
- `frontend/app/agent/events/page.tsx`
- `frontend/components/agent/EventList.tsx`
- `frontend/components/agent/PolicyDecisionHistory.tsx`
- `frontend/components/agent/BookingMonitor.tsx`
- `frontend/lib/api/services/event.service.ts`

---

### Phase 6: Polish & Optimization (Week 7)

**Priority: LOW**

- [ ] Add loading states and skeletons
- [ ] Implement optimistic UI updates
- [ ] Add data caching with React Query
- [ ] Improve error messages
- [ ] Add retry logic for failed requests
- [ ] Performance optimization
- [ ] Accessibility improvements


---

## 11. Environment Configuration

### 11.1 Environment Variables

**File:** `frontend/.env.local`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Feature Flags
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_BOOKING=true
NEXT_PUBLIC_ENABLE_FLIGHTS=true

# Debug
NEXT_PUBLIC_DEBUG_MODE=false
```

---

## 12. TypeScript Type Definitions

### 12.1 Core Types

**File:** `frontend/types/api.ts`

```typescript
// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'agent' | 'user';
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'agent' | 'user';
  family_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Trip Types
export interface Trip {
  trip_id: string;
  trip_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  families: string[];
  iteration_count: number;
  feedback_count: number;
  last_updated: string;
}

// Itinerary Types
export interface ItineraryOption {
  option_id: string;
  summary: string;
  cost: number;
  satisfaction: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  details: {
    type: string;
    family_ids: string[];
    itinerary: any;
    changes: any[];
  };
}

export interface ItineraryDiff {
  version_a: number;
  version_b: number;
  added_pois: POI[];
  removed_pois: POI[];
  changed_pois: POIChange[];
  cost_delta: number;
  satisfaction_delta: number;
}

export interface POI {
  id: string;
  name: string;
  category: string;
  start_time: string;
  end_time: string;
  cost: number;
  lat: number;
  lng: number;
}

// Booking Types
export interface HotelSearchParams {
  city_code: string;
  checkin: string;
  checkout: string;
  rooms: number;
  adults: number;
  children: number;
  nationality: string;
  star_rating?: number;
  refundable?: boolean;
}

export interface BookingRequest {
  itinerary_id: string;
  items: BookingItemType[];
  city_code: string;
  checkin: string;
  checkout: string;
  rooms: number;
  adults: number;
  children: number;
  nationality: string;
  guests: Guest[];
}

export type BookingItemType = 'hotel' | 'flight' | 'bus' | 'train' | 'restaurant' | 'activity' | 'transfer';

export interface Guest {
  Title: string;
  FirstName: string;
  LastName: string;
  Phoneno: string;
  Email: string;
  PaxType: number;
  LeadPassenger: boolean;
  Age: number;
  PassportNo?: string;
  PAN?: string;
}

export interface BookingStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'partial_failure' | 'failed';
  items_requested: string[];
  items_completed: Record<string, string>;
  hotel_bookings?: HotelBooking[];
  error_message?: string;
}

export interface HotelBooking {
  id: string;
  hotel_code: string;
  hotel_name: string;
  room_name: string;
  status: string;
  checkin: string;
  checkout: string;
  total_fare: number;
  currency: string;
  confirmation_no: string;
  tbo_booking_id: string;
  error_message?: string;
  created_at: string;
}

// Flight Types
export interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  children: number;
  infants: number;
  cabin_class: 1 | 2 | 3 | 4;
  direct_flight?: boolean;
  preferred_airlines?: string[];
}

// Event Types
export interface Event {
  event_id: string;
  event_type: EventType;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  payload: any;
  created_at: string;
  family_id: string;
}

export type EventType = 
  | 'FEEDBACK' 
  | 'POI_REQUEST' 
  | 'SCHEDULE_CONFLICT' 
  | 'WEATHER_ALERT' 
  | 'TRANSPORT_DISRUPTION' 
  | 'BUDGET_EXCEEDED' 
  | 'EMERGENCY';

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface BookingUpdateMessage extends WebSocketMessage {
  type: 'booking_update';
  job_id: string;
  step: string;
  status: string;
  message: string;
}

export interface BookingCompleteMessage extends WebSocketMessage {
  type: 'booking_complete';
  job_id: string;
  status: string;
}
```


---

## 13. Testing Strategy

### 13.1 API Integration Tests

**File:** `frontend/__tests__/api/auth.test.ts`

```typescript
import { AuthService } from '@/lib/api/services/auth.service';
import { APIClient } from '@/lib/api/client';

describe('AuthService', () => {
  let authService: AuthService;
  let mockClient: jest.Mocked<APIClient>;

  beforeEach(() => {
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
    } as any;
    authService = new AuthService(mockClient);
  });

  it('should login successfully', async () => {
    const mockResponse = {
      access_token: 'token123',
      token_type: 'bearer',
      expires_in: 1800,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await authService.login('test@example.com', 'password');
    expect(result).toEqual(mockResponse);
  });

  it('should handle login failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Invalid credentials' }),
    });

    await expect(
      authService.login('test@example.com', 'wrong')
    ).rejects.toThrow('Login failed');
  });
});
```

---

### 13.2 Component Integration Tests

**File:** `frontend/__tests__/components/LoginPage.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/agent/login/page';
import { AuthProvider } from '@/contexts/AuthContext';

describe('LoginPage', () => {
  it('should submit login form', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'agent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });
});
```

---

## 14. Migration Checklist

### 14.1 Remove Mock Data

**Files to Clean:**

- [ ] `frontend/lib/mockData/trips.ts` - Delete
- [ ] `frontend/lib/mockData/itineraries.ts` - Delete
- [ ] `frontend/lib/mockData/bookings.ts` - Delete
- [ ] `frontend/lib/mockData/flights.ts` - Delete
- [ ] `frontend/lib/mockData/events.ts` - Delete

### 14.2 Update Components

**Components to Refactor:**

- [ ] `TripList.tsx` - Replace mock data with API calls
- [ ] `Dashboard.tsx` - Connect to real stats
- [ ] `ItineraryReview.tsx` - Use real options API
- [ ] `HotelSearch.tsx` - Connect to TBO API
- [ ] `FlightSearch.tsx` - Connect to TBO Air API
- [ ] `EventList.tsx` - Use real events API

### 14.3 Add Loading States

**Components needing loaders:**

- [ ] Dashboard stats cards
- [ ] Trip list
- [ ] Itinerary options
- [ ] Hotel search results
- [ ] Flight search results
- [ ] Booking status
- [ ] Event list


---

## 15. Quick Reference: API Endpoints by Page

| Page | API Endpoints | Method | Auth Required |
|------|---------------|--------|---------------|
| **Login** | `/api/v1/auth/login` | POST | No |
| **Signup** | `/api/v1/auth/signup` | POST | No |
| **Dashboard** | `/api/v1/trips/` | GET | Yes (agent) |
| | `/api/v1/events/` | GET | Yes (agent) |
| **Itinerary Review** | `/api/v1/agent/itinerary/options` | GET | Yes (agent) |
| | `/api/v1/agent/itinerary/approve` | POST | Yes (agent) |
| | `/api/v1/itinerary/diff` | GET | Yes (agent) |
| **Hotel Search** | `/api/v1/bookings/hotels/search` | POST | Yes (agent) |
| **Booking Execute** | `/api/v1/bookings/execute` | POST | Yes (agent) |
| | `/api/v1/bookings/status/{job_id}` | GET | Yes (agent) |
| **Flight Search** | `/api/v1/flights/search` | POST | Yes (agent) |
| **Flight Quote** | `/api/v1/flights/fare-quote` | POST | Yes (agent) |
| **Flight SSR** | `/api/v1/flights/ssr` | POST | Yes (agent) |
| **Flight Book** | `/api/v1/flights/book` | POST | Yes (agent) |
| **Flight Ticket** | `/api/v1/flights/ticket` | POST | Yes (agent) |
| **Events** | `/api/v1/events/` | GET | Yes (agent) |
| **Policy History** | `/api/v1/agent/decision-policy/history` | GET | Yes (agent) |

---

## 16. Common Pitfalls & Solutions

### 16.1 Authentication Issues

**Problem:** Token expires during long sessions  
**Solution:** Implement auto-refresh 1 minute before expiry

**Problem:** Refresh token cookie not sent  
**Solution:** Ensure `credentials: 'include'` in all fetch calls

**Problem:** CORS errors  
**Solution:** Backend must set proper CORS headers for cookies

### 16.2 WebSocket Issues

**Problem:** Connection drops frequently  
**Solution:** Implement reconnection logic with exponential backoff

**Problem:** Messages not received  
**Solution:** Verify event type subscriptions match backend message types

### 16.3 Booking Flow Issues

**Problem:** Lost trace_id between search and booking  
**Solution:** Store in component state or URL params

**Problem:** Booking status polling too aggressive  
**Solution:** Use WebSocket for real-time updates instead

### 16.4 Data Synchronization

**Problem:** Stale data after approval  
**Solution:** Invalidate cache and refetch after mutations

**Problem:** Race conditions in concurrent updates  
**Solution:** Use optimistic updates with rollback on error

---

## 17. Performance Optimization

### 17.1 Data Fetching

```typescript
// Use React Query for caching and automatic refetching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const useTrips = () => {
  return useQuery({
    queryKey: ['trips'],
    queryFn: () => api.trip.getAll(),
    staleTime: 60000, // 1 minute
    cacheTime: 300000, // 5 minutes
  });
};

const useApproveOption = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (optionId: string) => api.itinerary.approveOption(optionId),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['itinerary-options'] });
    },
  });
};
```

### 17.2 Code Splitting

```typescript
// Lazy load heavy components
const FlightSearch = dynamic(() => import('@/components/agent/FlightSearch'), {
  loading: () => <Skeleton />,
  ssr: false,
});

const BookingMonitor = dynamic(() => import('@/components/agent/BookingMonitor'), {
  loading: () => <Skeleton />,
});
```


---

## 18. Security Considerations

### 18.1 Token Storage

- **DO:** Store access token in memory (React state/context)
- **DON'T:** Store in localStorage (XSS vulnerability)
- **DO:** Let refresh token stay in httpOnly cookie
- **DO:** Clear tokens on logout

### 18.2 API Security

```typescript
// Sanitize user input before sending to API
const sanitizeInput = (input: string) => {
  return input.trim().replace(/[<>]/g, '');
};

// Validate data before submission
const validateBookingRequest = (request: BookingRequest) => {
  if (!request.itinerary_id) throw new Error('Itinerary ID required');
  if (request.adults < 1) throw new Error('At least 1 adult required');
  if (request.guests.length === 0) throw new Error('Guest details required');
  return true;
};
```

### 18.3 Role-Based Access

```typescript
// Protect agent-only routes
const ProtectedRoute = ({ children, requiredRole = 'agent' }: Props) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/agent/login" />;
  }

  if (user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};
```

---

## 19. Deployment Checklist

### 19.1 Pre-Deployment

- [ ] All mock data removed
- [ ] Environment variables configured
- [ ] API endpoints tested in staging
- [ ] WebSocket connection tested
- [ ] Error handling verified
- [ ] Loading states implemented
- [ ] TypeScript errors resolved
- [ ] Build succeeds without warnings

### 19.2 Post-Deployment

- [ ] Monitor error logs
- [ ] Check API response times
- [ ] Verify WebSocket stability
- [ ] Test authentication flow
- [ ] Validate booking flow end-to-end
- [ ] Check mobile responsiveness
- [ ] Verify CORS configuration

---

## 20. Support & Troubleshooting

### 20.1 Debug Mode

```typescript
// Enable debug logging
if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
  console.log('API Request:', endpoint, data);
  console.log('API Response:', response);
}
```

### 20.2 Health Check

```typescript
// Add health check on app load
useEffect(() => {
  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      
      if (data.status !== 'ok') {
        toast.warning('Backend services degraded');
      }
    } catch (error) {
      toast.error('Cannot connect to backend');
    }
  };
  
  checkBackendHealth();
}, []);
```

### 20.3 Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `UNAUTHORIZED` | Token expired | Trigger refresh or re-login |
| `CORS error` | Missing credentials | Add `credentials: 'include'` |
| `Network error` | Backend down | Check backend health endpoint |
| `422 Validation` | Invalid request body | Check API contract |
| `429 Rate limit` | Too many requests | Implement request throttling |

---

## Summary

This integration plan provides a complete roadmap for connecting the agent frontend to the backend APIs. Follow the phases sequentially, starting with authentication, then dashboard, itinerary management, bookings, and finally events/monitoring.

**Key Success Factors:**
1. Implement authentication first - everything depends on it
2. Use TypeScript types to match backend contracts exactly
3. Implement proper error handling from the start
4. Use WebSocket for real-time updates
5. Test each integration thoroughly before moving to the next

**Estimated Timeline:** 6-7 weeks for complete integration

**Next Steps:**
1. Review this plan with the team
2. Set up development environment
3. Start with Phase 1 (Authentication)
4. Test each phase before proceeding
5. Document any deviations or issues

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-28  
**Maintained By:** Development Team

1. Active trips count
2. Pending approvals count
3. Recent events (last 10)
4. Booking status updates (via WebSocket)

---

### 2.2 Itinerary Management List (`/agent-dashboard/itinerary-management`)

**Current State:** Mock trip list from JSON  
**Target API:** `GET /api/v1/trips/?limit=20&skip=0`

**Implementation:**

```typescript
// frontend/app/agent-dashboard/itinerary-management/page.tsx
const ItineraryManagement = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ skip: 0, limit: 20, total: 0 });

  useEffect(() => {
    fetchTrips();
  }, [pagination.skip]);

  const fetchTrips = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `${API_URL}/api/v1/trips/?limit=${pagination.limit}&skip=${pagination.skip}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const data = await response.json();
    setTrips(data.items);
    setPagination(prev => ({ ...prev, total: data.total }));
    setLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1>Itinerary Management</h1>
        <Link href="/agent-dashboard/itinerary-management/new">
          <Button>Create New Trip</Button>
        </Link>
      </div>
      
      {loading ? <Spinner /> : (
        <>
          <TripsGrid trips={trips} />
          <Pagination 
            current={pagination.skip / pagination.limit + 1}
            total={Math.ceil(pagination.total / pagination.limit)}
            onChange={(page) => setPagination(prev => ({ 
              ...prev, 
              skip: (page - 1) * pagination.limit 
            }))}
          />
        </>
      )}
    </div>
  );
};
```

**Response Structure:**
```json
{
  "items": [
    {
      "trip_id": "delhi_20260315_1234",
      "trip_name": "Delhi Adventure",
      "destination": "Delhi, India",
      "start_date": "2026-03-15",
      "end_date": "2026-03-18",
      "families": ["FAM_A", "FAM_B"],
      "trip_status": "active",
      "iteration_count": 2
    }
  ],
  "total": 10,
  "skip": 0,
  "limit": 20
}
```

---


### 2.3 Create New Trip (`/agent-dashboard/itinerary-management/new`)

**Current State:** Form saves to localStorage  
**Target API:** `POST /api/v1/trips/initialize-with-optimization`

**Implementation:**

```typescript
// frontend/app/agent-dashboard/itinerary-management/new/page.tsx
const NewTripForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    trip_name: '',
    destination: '',
    start_date: '',
    end_date: '',
    family_ids: [],
    num_travellers: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await fetch(
        `${API_URL}/api/v1/trips/initialize-with-optimization`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error('Failed to create trip');

      const data = await response.json();
      
      // Show success message
      toast.success(`Trip created! Option ID: ${data.option_id}`);
      
      // Redirect to approval page
      router.push(`/agent-dashboard/itinerary-management/${data.trip_id}?event_id=${data.event_id}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input 
        label="Trip Name" 
        value={formData.trip_name}
        onChange={(e) => setFormData({...formData, trip_name: e.target.value})}
        required
      />
      <Input 
        label="Destination" 
        value={formData.destination}
        onChange={(e) => setFormData({...formData, destination: e.target.value})}
        required
      />
      <DateRangePicker 
        startDate={formData.start_date}
        endDate={formData.end_date}
        onChange={(start, end) => setFormData({
          ...formData, 
          start_date: start, 
          end_date: end
        })}
      />
      <FamilySelector 
        selected={formData.family_ids}
        onChange={(ids) => setFormData({...formData, family_ids: ids})}
      />
      <Input 
        type="number"
        label="Number of Travellers" 
        value={formData.num_travellers}
        onChange={(e) => setFormData({
          ...formData, 
          num_travellers: parseInt(e.target.value)
        })}
      />
      <Button type="submit">Create Trip & Run Optimizer</Button>
    </form>
  );
};
```

**Note:** After creation, the optimizer runs automatically and generates an itinerary option that needs agent approval.

---


## 3. Itinerary Management

### 3.1 Trip Detail View (`/agent-dashboard/itinerary-management/[tripId]`)

**Current State:** Mock itinerary data  
**Target APIs:**
- `GET /api/v1/trips/{trip_id}/summary` - Trip metadata
- `GET /api/v1/agent/itinerary/options?event_id={event_id}` - Pending options

**Implementation:**

```typescript
// frontend/app/agent-dashboard/itinerary-management/[tripId]/page.tsx
const TripDetailPage = ({ params }: { params: { tripId: string } }) => {
  const [trip, setTrip] = useState(null);
  const [pendingOptions, setPendingOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTripData();
  }, [params.tripId]);

  const fetchTripData = async () => {
    const token = localStorage.getItem('access_token');
    
    // Fetch trip summary
    const tripRes = await fetch(
      `${API_URL}/api/v1/trips/${params.tripId}/summary`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const tripData = await tripRes.json();
    setTrip(tripData);
    
    // Check for pending options (if event_id in query params)
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event_id');
    
    if (eventId) {
      const optionsRes = await fetch(
        `${API_URL}/api/v1/agent/itinerary/options?event_id=${eventId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const optionsData = await optionsRes.json();
      setPendingOptions(optionsData.options);
    }
    
    setLoading(false);
  };

  const handleApproveOption = async (optionId: string) => {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await fetch(
        `${API_URL}/api/v1/agent/itinerary/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ option_id: optionId }),
        }
      );

      if (!response.ok) throw new Error('Approval failed');

      const data = await response.json();
      toast.success('Itinerary approved and published!');
      
      // Refresh trip data
      fetchTripData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <TripHeader trip={trip} />
      
      {/* Show pending options if any */}
      {pendingOptions.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold mb-2">Pending Approval</h3>
          {pendingOptions.map(option => (
            <OptionCard 
              key={option.option_id}
              option={option}
              onApprove={() => handleApproveOption(option.option_id)}
            />
          ))}
        </div>
      )}
      
      {/* Current itinerary timeline */}
      <ItineraryTimeline tripId={params.tripId} />
    </div>
  );
};
```

---


### 3.2 Events & Feedback Review (`/agent-request-review`)

**Current State:** Mock events  
**Target API:** `GET /api/v1/events/?family_id={uuid}&limit=50`

**Implementation:**

```typescript
// frontend/app/agent-request-review/page.tsx
const AgentRequestReview = () => {
  const [events, setEvents] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [families, setFamilies] = useState([]);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamily) {
      fetchEvents(selectedFamily);
    }
  }, [selectedFamily]);

  const fetchFamilies = async () => {
    // Fetch all families from trips
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/api/v1/trips/`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    
    // Extract unique families
    const uniqueFamilies = [...new Set(data.items.flatMap(t => t.families))];
    setFamilies(uniqueFamilies);
    
    if (uniqueFamilies.length > 0) {
      setSelectedFamily(uniqueFamilies[0]);
    }
  };

  const fetchEvents = async (familyId: string) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `${API_URL}/api/v1/events/?family_id=${familyId}&limit=50`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    setEvents(data);
  };

  return (
    <div>
      <h1>Customer Requests & Feedback</h1>
      
      <FamilySelector 
        families={families}
        selected={selectedFamily}
        onChange={setSelectedFamily}
      />
      
      <EventsList events={events} />
    </div>
  );
};
```

**Event Types to Display:**
- `FEEDBACK` - User ratings and comments
- `POI_REQUEST` - Specific location requests
- `SCHEDULE_CONFLICT` - Timing issues
- `BUDGET_EXCEEDED` - Budget concerns

---

## 4. Booking Management

### 4.1 Hotel Search (`/agent-dashboard/itinerary-management/[tripId]/bookings`)

**Current State:** Mock booking data  
**Target APIs:**
- `POST /api/v1/bookings/hotels/search` - Search hotels
- `POST /api/v1/bookings/execute` - Execute booking

**Implementation:**

```typescript
// frontend/app/agent-dashboard/itinerary-management/[tripId]/bookings/page.tsx
const BookingsPage = ({ params }: { params: { tripId: string } }) => {
  const [searchParams, setSearchParams] = useState({
    city_code: '',
    checkin: '',
    checkout: '',
    rooms: 1,
    adults: 2,
    children: 0,
    nationality: 'IN',
  });
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [traceId, setTraceId] = useState('');

  const handleSearch = async () => {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await fetch(
        `${API_URL}/api/v1/bookings/hotels/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchParams),
        }
      );

      const data = await response.json();
      setHotels(data.results);
      setTraceId(data.trace_id); // IMPORTANT: Save for booking
      
      toast.success(`Found ${data.hotels_found} hotels`);
    } catch (error) {
      toast.error('Hotel search failed');
    }
  };

  const handleBook = async (hotelCode: string, roomIndex: number) => {
    const token = localStorage.getItem('access_token');
    
    // Get itinerary_id from trip
    const tripRes = await fetch(
      `${API_URL}/api/v1/trips/${params.tripId}/summary`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const tripData = await tripRes.json();
    
    const bookingPayload = {
      itinerary_id: tripData.itinerary_id,
      items: ['hotel'],
      city_code: searchParams.city_code,
      checkin: searchParams.checkin,
      checkout: searchParams.checkout,
      rooms: searchParams.rooms,
      adults: searchParams.adults,
      children: searchParams.children,
      nationality: searchParams.nationality,
      guests: [
        {
          Title: 'Mr',
          FirstName: 'John',
          LastName: 'Doe',
          Phoneno: '+919876543210',
          Email: 'john@example.com',
          PaxType: 1,
          LeadPassenger: true,
          Age: 35,
        }
      ],
    };

    try {
      const response = await fetch(
        `${API_URL}/api/v1/bookings/execute`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingPayload),
        }
      );

      const data = await response.json();
      
      toast.success(`Booking job created: ${data.job_id}`);
      
      // Monitor via WebSocket or polling
      monitorBookingJob(data.job_id);
    } catch (error) {
      toast.error('Booking failed');
    }
  };

  const monitorBookingJob = (jobId: string) => {
    // Option 1: WebSocket (already connected in dashboard)
    // Option 2: Polling
    const interval = setInterval(async () => {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_URL}/api/v1/bookings/status/${jobId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.status === 'completed') {
        clearInterval(interval);
        toast.success('Booking completed!');
        // Refresh bookings list
      } else if (data.status === 'failed') {
        clearInterval(interval);
        toast.error(`Booking failed: ${data.error_message}`);
      }
    }, 3000); // Poll every 3 seconds
  };

  return (
    <div>
      <HotelSearchForm 
        params={searchParams}
        onChange={setSearchParams}
        onSearch={handleSearch}
      />
      
      <HotelResults 
        hotels={hotels}
        onBook={handleBook}
      />
    </div>
  );
};
```

---


## 5. Flight Management

### 5.1 Flight Search & Booking Flow

**Current State:** Not implemented  
**Target APIs:**
1. `POST /api/v1/flights/search` - Search flights
2. `POST /api/v1/flights/fare-quote` - Get exact fare
3. `POST /api/v1/flights/fare-rules` - Get cancellation rules
4. `POST /api/v1/flights/ssr` - Get baggage/meal options
5. `POST /api/v1/flights/book` - Book flight
6. `POST /api/v1/flights/ticket` - Issue ticket (GDS only)

**Implementation:**

```typescript
// frontend/components/agent/FlightBookingWizard.tsx
const FlightBookingWizard = ({ tripId }: { tripId: string }) => {
  const [step, setStep] = useState<'search' | 'quote' | 'ssr' | 'book' | 'ticket'>('search');
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    departure_date: '',
    return_date: null,
    adults: 1,
    children: 0,
    infants: 0,
    cabin_class: 1,
  });
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [traceId, setTraceId] = useState('');
  const [fareQuote, setFareQuote] = useState(null);
  const [ssrOptions, setSsrOptions] = useState(null);
  const [bookingId, setBookingId] = useState('');

  // Step 1: Search
  const handleSearch = async () => {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/flights/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchParams),
    });

    const data = await response.json();
    setFlights(data.results);
    setTraceId(data.trace_id);
    toast.success(`Found ${data.flights_found} flights`);
  };

  // Step 2: Get Fare Quote
  const handleSelectFlight = async (flight: any) => {
    setSelectedFlight(flight);
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/flights/fare-quote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trace_id: traceId,
        result_index: flight.result_index,
      }),
    });

    const data = await response.json();
    setFareQuote(data);
    setStep('quote');
  };

  // Step 3: Get SSR (Baggage/Meals)
  const handleGetSSR = async () => {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/flights/ssr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trace_id: traceId,
        result_index: selectedFlight.result_index,
      }),
    });

    const data = await response.json();
    setSsrOptions(data);
    setStep('ssr');
  };

  // Step 4: Book
  const handleBook = async (passengers: any[]) => {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/flights/book`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trace_id: traceId,
        result_index: selectedFlight.result_index,
        passengers: passengers,
        segments_be: fareQuote.segments,
        fare: fareQuote.fare,
        is_lcc: selectedFlight.is_lcc,
      }),
    });

    const data = await response.json();
    setBookingId(data.booking_id);
    
    if (data.status === 'booked') {
      toast.success(`Flight booked! PNR: ${data.pnr}`);
      
      // If GDS (not LCC), proceed to ticketing
      if (!selectedFlight.is_lcc) {
        setStep('ticket');
      } else {
        toast.info('LCC flight auto-ticketed');
      }
    }
  };

  // Step 5: Issue Ticket (GDS only)
  const handleTicket = async () => {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/flights/ticket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flight_booking_id: bookingId,
      }),
    });

    const data = await response.json();
    
    if (data.status === 'ticketed') {
      toast.success(`Ticket issued! Ticket #: ${data.ticket_number}`);
    }
  };

  return (
    <div>
      {step === 'search' && (
        <FlightSearchForm 
          params={searchParams}
          onChange={setSearchParams}
          onSearch={handleSearch}
          flights={flights}
          onSelect={handleSelectFlight}
        />
      )}
      
      {step === 'quote' && (
        <FareQuoteView 
          quote={fareQuote}
          onContinue={handleGetSSR}
        />
      )}
      
      {step === 'ssr' && (
        <SSRSelection 
          options={ssrOptions}
          onContinue={(passengers) => handleBook(passengers)}
        />
      )}
      
      {step === 'ticket' && (
        <TicketingView 
          bookingId={bookingId}
          onIssueTicket={handleTicket}
        />
      )}
    </div>
  );
};
```

---


## 6. Events & Feedback

### 6.1 Event Creation

**Target API:** `POST /api/v1/events/`

**Usage:** When agent manually creates an event (rare - usually customer-initiated)

```typescript
const createEvent = async (eventData: {
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: any;
}) => {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${API_URL}/api/v1/events/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...eventData,
      source: 'agent_ui',
    }),
  });

  const data = await response.json();
  return data.event_id;
};
```

---

## 7. WebSocket Integration

### 7.1 Agent WebSocket Connection

**Endpoint:** `ws://localhost:8000/ws/agent/{agent_id}`

**Implementation:**

```typescript
// frontend/hooks/useAgentWebSocket.ts
export const useAgentWebSocket = (agentId: string) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!agentId) return;

    // Connect
    ws.current = new WebSocket(`ws://localhost:8000/ws/agent/${agentId}`);

    ws.current.onopen = () => {
      console.log('Agent WebSocket connected');
      setConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, data]);

      // Handle different message types
      switch (data.type) {
        case 'connected':
          toast.info('Real-time notifications enabled');
          break;

        case 'booking_update':
          toast.info(`Booking: ${data.message}`, {
            description: `Job: ${data.job_id}`,
          });
          break;

        case 'booking_step_complete':
          toast.success(`${data.step} completed`, {
            description: data.hotel_name || data.message,
          });
          break;

        case 'booking_complete':
          toast.success('Booking completed!', {
            description: `Job ID: ${data.job_id}`,
          });
          // Trigger refresh of bookings list
          window.dispatchEvent(new CustomEvent('booking-complete', { 
            detail: { jobId: data.job_id } 
          }));
          break;

        case 'booking_error':
          toast.error('Booking error', {
            description: data.error,
          });
          break;

        case 'itinerary_updated':
          toast.info('Itinerary updated', {
            description: data.message,
          });
          // Trigger refresh of itinerary
          window.dispatchEvent(new CustomEvent('itinerary-updated'));
          break;
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('WebSocket connection error');
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      
      // Attempt reconnect after 5 seconds
      setTimeout(() => {
        if (ws.current?.readyState === WebSocket.CLOSED) {
          // Reconnect logic
        }
      }, 5000);
    };

    // Keepalive ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send('ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      ws.current?.close();
    };
  }, [agentId]);

  return { connected, messages };
};
```

**Usage in Components:**

```typescript
// In any agent page
const AgentDashboard = () => {
  const { user } = useAuth();
  const { connected } = useAgentWebSocket(user?.id);

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm">{connected ? 'Live' : 'Disconnected'}</span>
      </div>
      {/* Rest of dashboard */}
    </div>
  );
};
```

---


## 8. State Management Strategy

### 8.1 Auth State (Global)

**File:** `frontend/contexts/AuthContext.tsx`

**Current Implementation:** Needs enhancement

**Required Changes:**

```typescript
// frontend/contexts/AuthContext.tsx
interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    expiresAt: null,
  });

  // Initialize - check for existing token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const expiresAt = localStorage.getItem('token_expires_at');
    
    if (token && expiresAt && Date.now() < parseInt(expiresAt)) {
      // Token still valid - fetch user profile
      fetchUserProfile(token);
      setupTokenRefresh(parseInt(expiresAt));
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const user = await response.json();
      
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        expiresAt: parseInt(localStorage.getItem('token_expires_at') || '0'),
      });
    } catch (error) {
      // Token invalid - clear and logout
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_expires_at');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const setupTokenRefresh = (expiresAt: number) => {
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshTime = timeUntilExpiry - 60000; // Refresh 1 min before expiry

    if (refreshTime > 0) {
      setTimeout(async () => {
        await refreshToken();
      }, refreshTime);
    }
  };

  const login = async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('token_expires_at', expiresAt.toString());
    
    await fetchUserProfile(data.access_token);
    setupTokenRefresh(expiresAt);
  };

  const refreshToken = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Refresh failed');

      const data = await response.json();
      const expiresAt = Date.now() + (data.expires_in * 1000);
      
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('token_expires_at', expiresAt.toString());
      
      setState(prev => ({ ...prev, token: data.access_token, expiresAt }));
      setupTokenRefresh(expiresAt);
    } catch (error) {
      // Refresh failed - logout
      await logout();
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      try {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expires_at');
    
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      expiresAt: null,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

### 8.2 API Client Enhancement

**File:** `frontend/services/api.ts`

**Add Interceptor for Auto-Refresh:**

```typescript
// frontend/services/api.ts
class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('access_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // If 401, try to refresh token
    if (response.status === 401 && token) {
      const refreshed = await this.refreshToken();
      
      if (refreshed) {
        // Retry original request with new token
        const newToken = localStorage.getItem('access_token');
        headers['Authorization'] = `Bearer ${newToken}`;
        
        response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      } else {
        // Refresh failed - redirect to login
        window.location.href = '/agent-login';
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) return false;

      const data = await response.json();
      const expiresAt = Date.now() + (data.expires_in * 1000);
      
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('token_expires_at', expiresAt.toString());
      
      return true;
    } catch {
      return false;
    }
  }

  // Trip APIs
  async getTrips(params: { limit?: number; skip?: number; trip_status?: string } = {}) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/v1/trips/?${query}`);
  }

  async getTripSummary(tripId: string) {
    return this.request(`/api/v1/trips/${tripId}/summary`);
  }

  async createTrip(data: any) {
    return this.request('/api/v1/trips/initialize-with-optimization', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Itinerary APIs
  async getItineraryOptions(eventId: string) {
    return this.request(`/api/v1/agent/itinerary/options?event_id=${eventId}`);
  }

  async approveItinerary(optionId: string) {
    return this.request('/api/v1/agent/itinerary/approve', {
      method: 'POST',
      body: JSON.stringify({ option_id: optionId }),
    });
  }

  // Booking APIs
  async searchHotels(params: any) {
    return this.request('/api/v1/bookings/hotels/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async executeBooking(data: any) {
    return this.request('/api/v1/bookings/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBookingStatus(jobId: string) {
    return this.request(`/api/v1/bookings/status/${jobId}`);
  }

  // Flight APIs
  async searchFlights(params: any) {
    return this.request('/api/v1/flights/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getFareQuote(traceId: string, resultIndex: string) {
    return this.request('/api/v1/flights/fare-quote', {
      method: 'POST',
      body: JSON.stringify({ trace_id: traceId, result_index: resultIndex }),
    });
  }

  async bookFlight(data: any) {
    return this.request('/api/v1/flights/book', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Events APIs
  async getEvents(familyId: string, limit: number = 50) {
    return this.request(`/api/v1/events/?family_id=${familyId}&limit=${limit}`);
  }
}

export const apiClient = new APIClient();
```

---


## 9. Error Handling

### 9.1 Global Error Handler

```typescript
// frontend/lib/errorHandler.ts
export class APIError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public code?: string
  ) {
    super(detail);
    this.name = 'APIError';
  }
}

export const handleAPIError = (error: any) => {
  if (error instanceof APIError) {
    switch (error.status) {
      case 400:
        toast.error('Invalid request', { description: error.detail });
        break;
      case 401:
        toast.error('Session expired', { description: 'Please login again' });
        // Handled by API client - will redirect
        break;
      case 403:
        toast.error('Access denied', { description: error.detail });
        break;
      case 404:
        toast.error('Not found', { description: error.detail });
        break;
      case 409:
        toast.error('Conflict', { description: error.detail });
        break;
      case 422:
        // Validation error - show field-level errors
        if (error.detail && Array.isArray(error.detail)) {
          error.detail.forEach((err: any) => {
            toast.error(`${err.loc.join('.')}: ${err.msg}`);
          });
        } else {
          toast.error('Validation error', { description: error.detail });
        }
        break;
      case 429:
        toast.error('Too many requests', { 
          description: 'Please wait a moment and try again' 
        });
        break;
      case 500:
        toast.error('Server error', { 
          description: 'Something went wrong. Please try again later.' 
        });
        break;
      case 503:
        toast.error('Service unavailable', { 
          description: 'The service is temporarily unavailable' 
        });
        break;
      default:
        toast.error('An error occurred', { description: error.detail });
    }
  } else {
    toast.error('Network error', { 
      description: 'Please check your connection' 
    });
  }
};
```

### 9.2 Error Boundary Component

```typescript
// frontend/components/ErrorBoundary.tsx
'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---


## 10. Implementation Phases

### Phase 1: Authentication & Core Setup (Week 1)

**Priority: CRITICAL**

- [ ] Update `AuthContext.tsx` with full JWT flow
- [ ] Implement auto-refresh token mechanism
- [ ] Update login pages (`/agent-login`)
- [ ] Update signup page (`/signup`)
- [ ] Implement `ProtectedRoute` component
- [ ] Test login → dashboard → logout flow
- [ ] Verify role-based access (agent vs user)

**Files to Modify:**
- `frontend/contexts/AuthContext.tsx`
- `frontend/app/agent-login/page.tsx`
- `frontend/app/signup/page.tsx`
- `frontend/components/ProtectedRoute.tsx`
- `frontend/services/api.ts`

**Testing:**
```bash
# Test login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=agent@example.com&password=password123"

# Test refresh
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  --cookie "refresh_token=..."

# Test protected endpoint
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <token>"
```

---

### Phase 2: Dashboard & Trip Management (Week 2)

**Priority: HIGH**

- [ ] Implement dashboard stats (`/agent-dashboard`)
- [ ] Connect trip list (`/agent-dashboard/itinerary-management`)
- [ ] Implement pagination for trips
- [ ] Create new trip form (`/agent-dashboard/itinerary-management/new`)
- [ ] Connect to `POST /trips/initialize-with-optimization`
- [ ] Display trip summary (`/agent-dashboard/itinerary-management/[tripId]`)

**Files to Modify:**
- `frontend/app/agent-dashboard/page.tsx`
- `frontend/app/agent-dashboard/itinerary-management/page.tsx`
- `frontend/app/agent-dashboard/itinerary-management/new/page.tsx`
- `frontend/app/agent-dashboard/itinerary-management/[tripId]/page.tsx`

**API Endpoints:**
- `GET /api/v1/trips/`
- `POST /api/v1/trips/initialize-with-optimization`
- `GET /api/v1/trips/{trip_id}/summary`

---

### Phase 3: Itinerary Approval Workflow (Week 3)

**Priority: HIGH**

- [ ] Implement option review UI
- [ ] Connect to `GET /agent/itinerary/options?event_id=...`
- [ ] Implement approve button
- [ ] Connect to `POST /agent/itinerary/approve`
- [ ] Show approval success feedback
- [ ] Refresh itinerary after approval

**Files to Modify:**
- `frontend/app/agent-dashboard/itinerary-management/[tripId]/page.tsx`
- `frontend/components/agent/OptionCard.tsx` (new)
- `frontend/components/agent/ItineraryTimeline.tsx`

**API Endpoints:**
- `GET /api/v1/agent/itinerary/options?event_id={id}`
- `POST /api/v1/agent/itinerary/approve`

---

### Phase 4: WebSocket Integration (Week 3)

**Priority: HIGH**

- [ ] Create `useAgentWebSocket` hook
- [ ] Connect on dashboard mount
- [ ] Handle booking updates
- [ ] Handle itinerary updates
- [ ] Show toast notifications
- [ ] Implement reconnection logic
- [ ] Add connection status indicator

**Files to Create:**
- `frontend/hooks/useAgentWebSocket.ts`

**Files to Modify:**
- `frontend/app/agent-dashboard/page.tsx`
- `frontend/app/agent-dashboard/itinerary-management/[tripId]/page.tsx`

---

### Phase 5: Hotel Booking (Week 4)

**Priority: MEDIUM**

- [ ] Create hotel search form
- [ ] Connect to `POST /bookings/hotels/search`
- [ ] Display search results
- [ ] Implement booking flow
- [ ] Connect to `POST /bookings/execute`
- [ ] Monitor booking status via WebSocket
- [ ] Implement polling fallback
- [ ] Display booking confirmation

**Files to Create:**
- `frontend/components/agent/HotelSearchForm.tsx`
- `frontend/components/agent/HotelResults.tsx`
- `frontend/components/agent/BookingMonitor.tsx`

**Files to Modify:**
- `frontend/app/agent-dashboard/itinerary-management/[tripId]/bookings/page.tsx`

**API Endpoints:**
- `POST /api/v1/bookings/hotels/search`
- `POST /api/v1/bookings/execute`
- `GET /api/v1/bookings/status/{job_id}`

---

### Phase 6: Flight Booking (Week 5)

**Priority: MEDIUM**

- [ ] Create flight search form
- [ ] Implement 5-step booking wizard
- [ ] Connect to flight search API
- [ ] Implement fare quote step
- [ ] Implement SSR selection
- [ ] Implement booking step
- [ ] Implement ticketing step (GDS)
- [ ] Handle LCC auto-ticketing

**Files to Create:**
- `frontend/components/agent/FlightBookingWizard.tsx`
- `frontend/components/agent/FlightSearchForm.tsx`
- `frontend/components/agent/FareQuoteView.tsx`
- `frontend/components/agent/SSRSelection.tsx`

**API Endpoints:**
- `POST /api/v1/flights/search`
- `POST /api/v1/flights/fare-quote`
- `POST /api/v1/flights/ssr`
- `POST /api/v1/flights/book`
- `POST /api/v1/flights/ticket`

---

### Phase 7: Events & Feedback (Week 6)

**Priority: LOW**

- [ ] Implement events list page
- [ ] Connect to `GET /events/?family_id=...`
- [ ] Display event types with icons
- [ ] Filter by event type
- [ ] Show event details modal
- [ ] Link events to trips

**Files to Modify:**
- `frontend/app/agent-request-review/page.tsx`
- `frontend/components/agent/EventsList.tsx` (new)
- `frontend/components/agent/EventCard.tsx` (new)

**API Endpoints:**
- `GET /api/v1/events/?family_id={id}&limit=50`

---

### Phase 8: Analytics & Intelligence (Week 7)

**Priority: LOW**

- [ ] Connect intelligence page to real data
- [ ] Implement cost analysis charts
- [ ] Implement satisfaction metrics
- [ ] Display family preferences
- [ ] Show optimization history

**Files to Modify:**
- `frontend/app/agent-dashboard/itinerary-management/[tripId]/intelligence/page.tsx`
- `frontend/components/charts/*`

**API Endpoints:**
- `GET /api/v1/trips/{trip_id}/summary`
- `GET /api/v1/itinerary/explanations/trip/{trip_id}`

---


## 11. Environment Configuration

### 11.1 Environment Variables

Create/update `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Feature Flags
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_FLIGHT_BOOKING=true
NEXT_PUBLIC_ENABLE_HOTEL_BOOKING=true

# Debug
NEXT_PUBLIC_DEBUG_MODE=false
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

```typescript
// frontend/__tests__/auth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';

describe('AuthContext', () => {
  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('agent@example.com', 'password123');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.role).toBe('agent');
  });

  it('should handle login failure', async () => {
    const { result } = renderHook(() => useAuth());
    
    await expect(
      act(async () => {
        await result.current.login('wrong@example.com', 'wrong');
      })
    ).rejects.toThrow();
  });
});
```

### 12.2 Integration Tests

```typescript
// frontend/__tests__/trip-management.test.ts
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItineraryManagement from '@/app/agent-dashboard/itinerary-management/page';

describe('Trip Management', () => {
  it('should load and display trips', async () => {
    render(<ItineraryManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Delhi Adventure')).toBeInTheDocument();
    });
  });

  it('should navigate to create new trip', async () => {
    const user = userEvent.setup();
    render(<ItineraryManagement />);
    
    const createButton = screen.getByText('Create New Trip');
    await user.click(createButton);
    
    expect(window.location.pathname).toBe('/agent-dashboard/itinerary-management/new');
  });
});
```

### 12.3 E2E Tests (Playwright)

```typescript
// frontend/e2e/agent-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('complete agent workflow', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/agent-login');
  await page.fill('input[name="email"]', 'agent@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await expect(page).toHaveURL(/.*agent-dashboard/);
  
  // Navigate to itinerary management
  await page.click('text=Itinerary Management');
  await expect(page).toHaveURL(/.*itinerary-management/);
  
  // Create new trip
  await page.click('text=Create New Trip');
  await page.fill('input[name="trip_name"]', 'Test Trip');
  await page.fill('input[name="destination"]', 'Delhi');
  await page.click('button[type="submit"]');
  
  // Wait for trip creation
  await expect(page.locator('text=Trip created')).toBeVisible();
});
```

---

## 13. Performance Optimization

### 13.1 Data Caching Strategy

```typescript
// frontend/lib/cache.ts
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 60000; // 1 minute

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

export const dataCache = new DataCache();
```

**Usage:**

```typescript
const fetchTrips = async () => {
  const cacheKey = 'trips_list';
  const cached = dataCache.get(cacheKey);
  
  if (cached) {
    setTrips(cached);
    return;
  }
  
  const data = await apiClient.getTrips();
  dataCache.set(cacheKey, data);
  setTrips(data);
};

// Invalidate on WebSocket update
ws.onmessage = (event) => {
  if (event.data.type === 'itinerary_updated') {
    dataCache.invalidate('trips_list');
    fetchTrips();
  }
};
```

### 13.2 Lazy Loading

```typescript
// Lazy load heavy components
const FlightBookingWizard = dynamic(
  () => import('@/components/agent/FlightBookingWizard'),
  { loading: () => <Spinner /> }
);

const IntelligenceView = dynamic(
  () => import('@/components/itinerary/IntelligenceView'),
  { ssr: false }
);
```

---


## 14. Complete Route Mapping (Corrected)

Based on actual frontend structure:

### Agent Routes

| Route | File | Backend API | Status |
|-------|------|-------------|--------|
| `/agent-login` | `app/agent-login/page.tsx` | `POST /api/v1/auth/login` | ✅ Exists |
| `/signup` | `app/signup/page.tsx` | `POST /api/v1/auth/signup` | ✅ Exists |
| `/agent-dashboard` | `app/agent-dashboard/page.tsx` | `GET /api/v1/trips/` | ⚠️ Needs API |
| `/agent-dashboard/itinerary-management` | `app/agent-dashboard/itinerary-management/page.tsx` | `GET /api/v1/trips/` | ⚠️ Needs API |
| `/agent-dashboard/itinerary-management/new` | Create new file | `POST /api/v1/trips/initialize-with-optimization` | ❌ Missing |
| `/agent-dashboard/itinerary-management/[tripId]` | `app/agent-dashboard/itinerary-management/[tripId]/page.tsx` | `GET /api/v1/trips/{id}/summary` | ⚠️ Needs API |
| `/agent-dashboard/itinerary-management/[tripId]/bookings` | Create new file | `POST /api/v1/bookings/hotels/search` | ❌ Missing |
| `/agent-dashboard/itinerary-management/[tripId]/groups` | Create new file | `GET /api/v1/families/` | ❌ Missing |
| `/agent-dashboard/itinerary-management/[tripId]/intelligence` | Create new file | `GET /api/v1/trips/{id}/summary` | ❌ Missing |
| `/agent-dashboard/itinerary-builder` | `app/agent-dashboard/itinerary-builder/page.tsx` | Manual builder (no API) | ✅ Exists |
| `/agent-request-review` | `app/agent-request-review/page.tsx` | `GET /api/v1/events/` | ⚠️ Needs API |
| `/analytics` | `app/analytics/page.tsx` | Various analytics APIs | ⚠️ Needs API |
| `/optimizer` | `app/optimizer/page.tsx` | Manual editor (no API) | ✅ Exists |

### Customer Routes (For Reference)

| Route | File | Backend API | Status |
|-------|------|-------------|--------|
| `/customer-login` | `app/customer-login/page.tsx` | `POST /api/v1/auth/login` | ✅ Exists |
| `/customer-portal` | `app/customer-portal/page.tsx` | `GET /api/v1/itinerary/current` | ⚠️ Needs API |
| `/customer-bookings` | `app/customer-bookings/page.tsx` | `GET /api/v1/bookings/` | ⚠️ Needs API |
| `/customer-itinerary/[tripId]` | `app/customer-itinerary/[tripId]/page.tsx` | `GET /api/v1/itinerary/current` | ⚠️ Needs API |
| `/customer-preference` | `app/customer-preference/page.tsx` | `PATCH /api/v1/trips/{id}/families/{id}/preferences` | ⚠️ Needs API |
| `/customer-trip-request` | `app/customer-trip-request/page.tsx` | `POST /api/v1/trips/initialize` | ⚠️ Needs API |

---

## 15. Files to Create

### New Pages

```bash
# Agent pages
frontend/app/agent-dashboard/itinerary-management/new/page.tsx
frontend/app/agent-dashboard/itinerary-management/[tripId]/bookings/page.tsx
frontend/app/agent-dashboard/itinerary-management/[tripId]/groups/page.tsx
frontend/app/agent-dashboard/itinerary-management/[tripId]/intelligence/page.tsx
frontend/app/agent-dashboard/itinerary-management/[tripId]/layout.tsx
```

### New Components

```bash
# Agent components
frontend/components/agent/StatCard.tsx
frontend/components/agent/TripsTable.tsx
frontend/components/agent/TripsGrid.tsx
frontend/components/agent/OptionCard.tsx
frontend/components/agent/HotelSearchForm.tsx
frontend/components/agent/HotelResults.tsx
frontend/components/agent/FlightBookingWizard.tsx
frontend/components/agent/FlightSearchForm.tsx
frontend/components/agent/FareQuoteView.tsx
frontend/components/agent/SSRSelection.tsx
frontend/components/agent/EventsList.tsx
frontend/components/agent/EventCard.tsx
frontend/components/agent/BookingMonitor.tsx

# Shared components
frontend/components/common/Pagination.tsx
frontend/components/common/Spinner.tsx
frontend/components/ErrorBoundary.tsx
```

### New Hooks

```bash
frontend/hooks/useAgentWebSocket.ts
frontend/hooks/useBookingMonitor.ts
frontend/hooks/useTrips.ts
```

### New Utils

```bash
frontend/lib/errorHandler.ts
frontend/lib/cache.ts
frontend/lib/formatters.ts
```

---

## 16. Migration Checklist

### Pre-Migration

- [ ] Backup current frontend code
- [ ] Document all mock data structures
- [ ] Verify backend is running and accessible
- [ ] Test all backend endpoints with Postman/curl
- [ ] Set up environment variables

### During Migration

- [ ] Follow phase-by-phase approach
- [ ] Test each phase before moving to next
- [ ] Keep mock data as fallback during development
- [ ] Use feature flags to toggle between mock/real data
- [ ] Document any API discrepancies

### Post-Migration

- [ ] Remove all mock data files
- [ ] Remove localStorage mock data
- [ ] Clean up unused components
- [ ] Update documentation
- [ ] Perform full E2E testing
- [ ] Load testing with real data

---

## 17. Common Pitfalls & Solutions

### Issue 1: CORS Errors

**Problem:** Browser blocks API requests due to CORS

**Solution:** Ensure backend has CORS configured:

```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue 2: Token Expiry Not Handled

**Problem:** User gets logged out unexpectedly

**Solution:** Implement auto-refresh (see Section 8.1)

### Issue 3: WebSocket Disconnects

**Problem:** WebSocket connection drops frequently

**Solution:** Implement reconnection logic with exponential backoff:

```typescript
const reconnect = (attempt = 0) => {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  
  setTimeout(() => {
    console.log(`Reconnecting... (attempt ${attempt + 1})`);
    connectWebSocket();
  }, delay);
};
```

### Issue 4: Race Conditions

**Problem:** Multiple API calls update state inconsistently

**Solution:** Use request cancellation:

```typescript
useEffect(() => {
  const controller = new AbortController();
  
  fetch(url, { signal: controller.signal })
    .then(data => setState(data))
    .catch(err => {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    });
  
  return () => controller.abort();
}, [dependency]);
```

### Issue 5: Stale Data After Updates

**Problem:** UI doesn't reflect latest data after mutations

**Solution:** Invalidate cache and refetch:

```typescript
const handleApprove = async (optionId: string) => {
  await apiClient.approveItinerary(optionId);
  
  // Invalidate cache
  dataCache.invalidate('trips_list');
  dataCache.invalidate(`trip_${tripId}`);
  
  // Refetch
  await fetchTripData();
};
```

---

## 18. Quick Start Guide

### Step 1: Set Up Environment

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with correct API URL
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Start Backend

```bash
cd ../backend
python -m uvicorn app.main:app --reload
```

### Step 4: Start Frontend

```bash
cd ../frontend
npm run dev
```

### Step 5: Test Authentication

1. Navigate to `http://localhost:3000/agent-login`
2. Login with test credentials
3. Verify redirect to dashboard
4. Check browser console for any errors
5. Verify token in localStorage

### Step 6: Test First API Integration

Start with the simplest endpoint:

```typescript
// In agent-dashboard/page.tsx
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();
      console.log('Backend health:', data);
    } catch (error) {
      console.error('Backend not reachable:', error);
    }
  };
  
  fetchData();
}, []);
```

---

## 19. Support & Resources

### Documentation

- Backend API Reference: `backend/Documentation/BACKEND_API_REFERENCE.md`
- Frontend Architecture: `frontend/docs/frontend_architecture.md.resolved`
- This Integration Plan: `frontend/docs/AGENT_FRONTEND_INTEGRATION_PLAN.md`

### Useful Commands

```bash
# Check backend logs
cd backend && tail -f logs/app.log

# Test API endpoint
curl -X GET http://localhost:8000/api/v1/trips/ \
  -H "Authorization: Bearer <token>"

# Check WebSocket connection
wscat -c ws://localhost:8000/ws/agent/<agent_id>

# Run frontend tests
cd frontend && npm test

# Build for production
cd frontend && npm run build
```

### Debugging Tips

1. Use React DevTools to inspect component state
2. Use Network tab to monitor API calls
3. Check Redux DevTools for state management (if using Redux)
4. Use WebSocket debugging in browser DevTools
5. Enable verbose logging in development

---

## 20. Next Steps

After completing this integration:

1. **Customer Portal Integration** - Apply same patterns to customer-facing pages
2. **Real-time Collaboration** - Implement multi-agent WebSocket features
3. **Offline Support** - Add service worker for offline functionality
4. **Mobile Optimization** - Ensure responsive design works on mobile
5. **Performance Monitoring** - Add analytics and error tracking
6. **Security Audit** - Review authentication and authorization
7. **Load Testing** - Test with realistic data volumes
8. **Documentation** - Update user guides and API docs

---

**Last Updated:** 2026-02-28  
**Version:** 1.0  
**Status:** Ready for Implementation

