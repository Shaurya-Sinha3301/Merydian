# Corrected Agent Routes & Integration Mapping

> **Based on Actual Frontend Structure** | Last Updated: 2026-02-28

---

## Agent Route Structure (Corrected)

### Primary Routes

| Route | File | Component | Purpose | Backend API |
|-------|------|-----------|---------|-------------|
| `/agent-dashboard` | `app/agent-dashboard/page.tsx` | `<AgentDashboardInteractive />` | **Main landing page** - Shows active groups, stats, destination cards | `GET /api/v1/trips/` |
| `/agent-dashboard/itinerary-management` | `app/agent-dashboard/itinerary-management/page.tsx` | `<ItineraryOptimizerWindow />` | Trip list & optimization hub | `GET /api/v1/trips/` |
| `/agent-dashboard/itinerary-builder` | `app/agent-dashboard/itinerary-builder/page.tsx` | `<ItineraryBuilderView />` | Drag-and-drop manual builder | Manual (no API) |
| `/agent-request-review` | `app/agent-request-review/page.tsx` | `<AgentRequestReviewInteractive />` | Review customer requests | `GET /api/v1/events/` |
| `/optimizer` | `app/optimizer/page.tsx` | `<EditorInteractive />` | Detailed itinerary editor | Manual (no API) |
| `/analytics` | `app/analytics/page.tsx` | Inline stats | Revenue & analytics | Various APIs |

---

## Key Clarifications

### 1. `/agent-dashboard` is NOT a redirect

**What it actually does:**
- Shows **active groups** (trips currently in progress)
- Displays **destination cards** with trip summaries
- Shows **statistics panel** (active trips, pending approvals, etc.)
- Has **issues/alerts snapshot**
- Shows **upcoming groups timeline**
- Has a **detailed view toggle** that shows filterable requests table
- Can drill into individual requests with `<BookingExplorer />`

**Mock Data Source:**
```typescript
// Currently uses:
import { activeGroups } from '@/lib/agent-dashboard/data';
```

**Integration Target:**
```typescript
// Replace with:
const fetchActiveGroups = async () => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(
    `${API_URL}/api/v1/trips/?trip_status=active&limit=50`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await response.json();
  return data.items;
};
```

---

### 2. `/agent-dashboard/itinerary-management` is a separate page

**What it does:**
- Shows **all trips** (not just active ones)
- Uses `<ItineraryOptimizerWindow />` component
- Focused on trip optimization workflow
- Different UI from main dashboard

**Mock Data Source:**
```typescript
// Currently uses:
import itineraryData from '@/lib/agent-dashboard/data/itinerary_data.json';
```

**Integration Target:**
```typescript
// Same API but different filtering:
const fetchAllTrips = async () => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(
    `${API_URL}/api/v1/trips/?limit=20&skip=0`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.json();
};
```

---

## Integration Plan by Route

### Route 1: `/agent-dashboard` (Main Landing)

**Files to Modify:**
- `frontend/app/agent-dashboard/components/AgentDashboardInteractive.tsx`
- `frontend/app/agent-dashboard/components/DestinationCards.tsx`
- `frontend/app/agent-dashboard/components/StatisticsPanel.tsx`
- `frontend/app/agent-dashboard/components/UpcomingGroupsTimeline.tsx`

**Current Mock Data:**
```typescript
import { activeGroups } from '@/lib/agent-dashboard/data';
// activeGroups is TripRequest[]
```

**API Integration:**

```typescript
// In AgentDashboardInteractive.tsx
const [activeGroups, setActiveGroups] = useState<TripRequest[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchActiveGroups();
}, []);

const fetchActiveGroups = async () => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/trips/?trip_status=active`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (!response.ok) throw new Error('Failed to fetch trips');
    
    const data = await response.json();
    
    // Transform backend data to match TripRequest interface
    const transformedData = data.items.map(trip => ({
      id: trip.trip_id,
      customerName: trip.families[0] || 'Unknown', // Need family names
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      status: mapTripStatus(trip.trip_status),
      priority: 'medium', // Calculate from trip data
      budgetRange: {
        min: trip.estimated_cost * 0.9,
        max: trip.estimated_cost * 1.1,
      },
      groupSize: trip.total_members || 0,
      submittedAt: trip.created_at,
      // ... other fields
    }));
    
    setActiveGroups(transformedData);
    setLoading(false);
  } catch (error) {
    console.error('Error fetching active groups:', error);
    setLoading(false);
  }
};

const mapTripStatus = (backendStatus: string) => {
  const statusMap = {
    'active': 'in-progress',
    'pending_approval': 'pending',
    'completed': 'approved',
    'cancelled': 'rejected',
  };
  return statusMap[backendStatus] || 'pending';
};
```

**Statistics Calculation:**

```typescript
// In StatisticsPanel.tsx
const calculateStats = (groups: TripRequest[]) => {
  return {
    activeTrips: groups.filter(g => g.status === 'in-progress').length,
    pendingApprovals: groups.filter(g => g.status === 'pending').length,
    totalRevenue: groups.reduce((sum, g) => sum + g.budgetRange.max, 0),
    avgSatisfaction: 0.85, // Need to fetch from backend
  };
};
```

---

### Route 2: `/agent-dashboard/itinerary-management`

**Files to Modify:**
- `frontend/components/itinerary/ItineraryOptimizerWindow.tsx`

**Current Mock Data:**
```typescript
import itineraryData from '@/lib/agent-dashboard/data/itinerary_data.json';
```

**API Integration:**

```typescript
// In ItineraryOptimizerWindow.tsx
const [trips, setTrips] = useState([]);
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
};
```

---

### Route 3: `/agent-request-review`

**Files to Modify:**
- `frontend/app/agent-request-review/components/AgentRequestReviewInteractive.tsx`

**API Integration:**

```typescript
const [events, setEvents] = useState([]);
const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

const fetchEvents = async (familyId: string) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(
    `${API_URL}/api/v1/events/?family_id=${familyId}&limit=50`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await response.json();
  setEvents(data);
};
```

---

## Data Type Mapping

### Backend Trip Response → Frontend TripRequest

```typescript
// Backend response from GET /api/v1/trips/
interface BackendTrip {
  trip_id: string;
  trip_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  families: string[]; // Family IDs
  trip_status: 'active' | 'pending_approval' | 'completed' | 'cancelled';
  iteration_count: number;
  feedback_count: number;
  created_at: string;
  updated_at: string;
}

// Frontend TripRequest interface
interface TripRequest {
  id: string;
  customerName: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'in-progress' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  budgetRange: { min: number; max: number };
  groupSize: number;
  submittedAt: string;
  preferences: {
    pace: string;
    interests: string[];
    dietary: string[];
  };
}

// Transformation function
const transformTrip = (backendTrip: BackendTrip): TripRequest => {
  return {
    id: backendTrip.trip_id,
    customerName: backendTrip.families[0] || 'Unknown',
    destination: backendTrip.destination,
    startDate: backendTrip.start_date,
    endDate: backendTrip.end_date,
    status: mapStatus(backendTrip.trip_status),
    priority: calculatePriority(backendTrip),
    budgetRange: {
      min: 0, // Need to fetch from trip details
      max: 0,
    },
    groupSize: 0, // Need to fetch from trip details
    submittedAt: backendTrip.created_at,
    preferences: {
      pace: 'moderate',
      interests: [],
      dietary: [],
    },
  };
};
```

---

## Missing Backend Data

Some frontend fields don't have direct backend equivalents. Solutions:

### 1. Customer Name (from family_id)

**Problem:** Backend returns `families: ["FAM_A"]`, frontend needs `customerName: "John Doe"`

**Solution:** Create a new endpoint or enhance existing one:

```typescript
// Option A: Fetch family details separately
const fetchFamilyName = async (familyId: string) => {
  const response = await fetch(`${API_URL}/api/v1/families/${familyId}`);
  const data = await response.json();
  return data.family_name;
};

// Option B: Backend enhancement - include family names in trip response
// Modify backend to return:
{
  trip_id: "...",
  families: [
    { id: "FAM_A", name: "Sharma Family" }
  ]
}
```

### 2. Priority Calculation

**Problem:** Backend doesn't have priority field

**Solution:** Calculate on frontend:

```typescript
const calculatePriority = (trip: BackendTrip): 'low' | 'medium' | 'high' | 'urgent' => {
  const daysUntilStart = Math.floor(
    (new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysUntilStart < 7) return 'urgent';
  if (daysUntilStart < 14) return 'high';
  if (daysUntilStart < 30) return 'medium';
  return 'low';
};
```

### 3. Budget Range

**Problem:** Backend doesn't return budget in trip list

**Solution:** Fetch from trip summary:

```typescript
const enrichTripWithDetails = async (trip: BackendTrip) => {
  const response = await fetch(`${API_URL}/api/v1/trips/${trip.trip_id}/summary`);
  const details = await response.json();
  
  return {
    ...trip,
    budgetRange: {
      min: details.estimated_cost * 0.9,
      max: details.estimated_cost * 1.1,
    },
    groupSize: details.total_members,
  };
};
```

---

## WebSocket Integration for Dashboard

```typescript
// In AgentDashboardInteractive.tsx
const { user } = useAuth();
const ws = useRef<WebSocket | null>(null);

useEffect(() => {
  if (!user?.id) return;
  
  // Connect WebSocket
  ws.current = new WebSocket(`ws://localhost:8000/ws/agent/${user.id}`);
  
  ws.current.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'itinerary_updated') {
      // Refresh active groups
      fetchActiveGroups();
      toast.info('Trip updated', { description: data.message });
    }
    
    if (data.type === 'booking_complete') {
      // Refresh specific trip
      toast.success('Booking completed!');
    }
  };
  
  return () => ws.current?.close();
}, [user?.id]);
```

---

## Implementation Priority

### Phase 1: Main Dashboard (`/agent-dashboard`)
1. ✅ Replace `activeGroups` mock with API call
2. ✅ Transform backend data to TripRequest format
3. ✅ Update StatisticsPanel calculations
4. ✅ Connect WebSocket for real-time updates
5. ✅ Handle loading and error states

### Phase 2: Itinerary Management (`/agent-dashboard/itinerary-management`)
1. ✅ Replace itinerary_data.json with API call
2. ✅ Implement pagination
3. ✅ Add trip filtering
4. ✅ Connect to trip detail pages

### Phase 3: Request Review (`/agent-request-review`)
1. ✅ Connect to events API
2. ✅ Implement family selector
3. ✅ Display event types correctly
4. ✅ Link events to trips

---

## Summary of Changes

**Key Insight:** `/agent-dashboard` is the main landing page with active groups overview, NOT a redirect to itinerary-management.

**Two Distinct Pages:**
1. `/agent-dashboard` - Active groups dashboard (operational view)
2. `/agent-dashboard/itinerary-management` - All trips management (planning view)

**Both need API integration but serve different purposes.**
