# Developer Quick Start Guide

> **Frontend Route Integration** | Last Updated: 2026-02-28

Quick reference for working with the corrected agent dashboard routes.

---

## Route Overview

```
/agent-dashboard                          → Main landing (active groups)
/agent-dashboard/itinerary-management     → All trips management
/agent-dashboard/itinerary-builder        → Manual drag-and-drop builder
/agent-request-review                     → Customer request review
/optimizer                                → Detailed itinerary editor
/analytics                                → Revenue & analytics
```

---

## Quick API Integration

### Fetch Active Groups

```typescript
import { fetchActiveGroups } from '@/lib/agent-dashboard/api-integration';

const groups = await fetchActiveGroups();
// Returns: TripRequest[]
```

### Fetch All Trips

```typescript
import { fetchAllTrips } from '@/lib/agent-dashboard/api-integration';

const { items, total } = await fetchAllTrips({
  limit: 20,
  skip: 0,
  status: 'active', // optional
});
```

### Fetch Trip Details

```typescript
import { fetchTripDetails } from '@/lib/agent-dashboard/api-integration';

const trip = await fetchTripDetails('TRIP_123');
// Returns: TripRequest with full details
```

### Fetch Family Events

```typescript
import { fetchFamilyEvents } from '@/lib/agent-request-review/api-integration';

const events = await fetchFamilyEvents('FAM_A', 50);
// Returns: TransformedEvent[]
```

---

## Component Pattern

### Standard API Integration Pattern

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchData } from '@/lib/[feature]/api-integration';
import { mockData } from '@/lib/[feature]/data';

const MyComponent = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Use mock data if not authenticated
      if (!user) {
        setData(mockData);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await fetchData();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Using cached version.');
        setData(mockData); // Fallback
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-800 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
};

export default MyComponent;
```

---

## Data Transformation

### Backend → Frontend

```typescript
import { transformTrip, mapTripStatus, calculatePriority } from '@/lib/agent-dashboard/api-integration';

// Transform single trip
const frontendTrip = transformTrip(backendTrip);

// Map status
const status = mapTripStatus('active'); // → 'in-review'

// Calculate priority
const priority = calculatePriority(backendTrip); // → 'high' | 'medium' | 'low'
```

---

## Common Tasks

### Add New API Endpoint

1. **Update API Client** (`frontend/services/api.ts`)

```typescript
async getNewEndpoint(params?: any): Promise<any> {
  return this.request(`/new-endpoint?${new URLSearchParams(params)}`);
}
```

2. **Create Integration Layer** (`frontend/lib/[feature]/api-integration.ts`)

```typescript
export const fetchNewData = async () => {
  const response = await apiClient.getNewEndpoint();
  return response.map(transformData);
};

export const transformData = (backendData: any) => {
  return {
    // Transform to frontend format
  };
};
```

3. **Use in Component**

```typescript
import { fetchNewData } from '@/lib/[feature]/api-integration';

const data = await fetchNewData();
```

### Add Loading State

```typescript
const [loading, setLoading] = useState(true);

if (loading) {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="h-32 bg-muted rounded" />
    </div>
  );
}
```

### Add Error Handling

```typescript
const [error, setError] = useState<string | null>(null);

try {
  const data = await fetchData();
  setData(data);
} catch (err) {
  setError(err instanceof Error ? err.message : 'An error occurred');
  setData(mockData); // Fallback
}

// In JSX
{error && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
    <p className="text-amber-800 text-sm">{error}</p>
  </div>
)}
```

### Add Authentication Check

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user, isAuthenticated } = useAuth();

if (!isAuthenticated) {
  return <LoginPrompt />;
}
```

---

## Type Definitions

### TripRequest (Frontend)

```typescript
interface TripRequest {
  id: string;
  customerName: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'new' | 'in-review' | 'approved' | 'booked';
  priority: 'low' | 'medium' | 'high';
  budgetRange: { min: number; max: number };
  groupSize: { adults: number; children: number; seniors: number };
  submittedAt: string;
  confidenceScore: number;
  preferences?: {
    pace: string;
    interests: string[];
    dietary: string[];
  };
  constraints?: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}
```

### BackendTrip (API Response)

```typescript
interface BackendTrip {
  trip_id: string;
  trip_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  families: string[];
  trip_status: 'active' | 'pending_approval' | 'completed' | 'cancelled';
  summary?: {
    estimated_cost: number;
    total_members: number;
    total_children: number;
    predicted_satisfaction: number;
  };
}
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Debugging

### Check API Calls

```typescript
// In browser console
localStorage.getItem('access_token'); // Check auth token
```

### Enable API Logging

```typescript
// In api.ts
console.log('API Request:', endpoint, options);
console.log('API Response:', response);
```

### Test API Endpoints

```bash
# Using curl
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/trips/

# Using browser
fetch('http://localhost:8000/api/v1/trips/', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
}).then(r => r.json()).then(console.log);
```

---

## Common Issues

### Issue: "Failed to fetch"

**Cause:** Backend not running or CORS issue

**Solution:**
```bash
# Check backend is running
curl http://localhost:8000/api/v1/health

# Check CORS settings in backend
# backend/app/main.py should have:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: "401 Unauthorized"

**Cause:** Missing or expired auth token

**Solution:**
```typescript
// Check token
const token = localStorage.getItem('access_token');
if (!token) {
  // Redirect to login
  router.push('/agent-login');
}

// Or refresh token
await apiClient.refreshToken();
```

### Issue: Data not updating

**Cause:** Stale state or missing dependency

**Solution:**
```typescript
// Add proper dependencies
useEffect(() => {
  loadData();
}, [user, someOtherDependency]); // ← Add all dependencies

// Or force refresh
const refreshData = async () => {
  setLoading(true);
  await loadData();
};
```

---

## Testing

### Manual Testing Checklist

```
□ Page loads without errors
□ Loading state displays
□ Data displays correctly
□ Error handling works
□ Fallback to mock data works
□ Authentication check works
□ API calls use correct endpoints
□ Transformations handle edge cases
```

### Test with Mock Data

```typescript
// Temporarily use mock data
const USE_MOCK = true;

if (USE_MOCK) {
  setData(mockData);
  return;
}

// ... API call
```

---

## Performance Tips

1. **Memoize expensive calculations**

```typescript
import { useMemo } from 'react';

const stats = useMemo(() => calculateStats(groups), [groups]);
```

2. **Debounce API calls**

```typescript
import { useDebounce } from '@/hooks/useDebounce';

const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch) {
    searchTrips(debouncedSearch);
  }
}, [debouncedSearch]);
```

3. **Use pagination**

```typescript
const [page, setPage] = useState(0);
const limit = 20;

const { items, total } = await fetchAllTrips({
  limit,
  skip: page * limit,
});
```

---

## Resources

- [API Client](../services/api.ts) - All API methods
- [Auth Context](../contexts/AuthContext.tsx) - Authentication utilities
- [Type Definitions](../lib/agent-dashboard/types.ts) - TypeScript interfaces
- [Mock Data](../lib/agent-dashboard/data.ts) - Fallback data

---

## Getting Help

1. Check [ROUTE_CORRECTIONS_APPLIED.md](./ROUTE_CORRECTIONS_APPLIED.md) for implementation details
2. Review [CORRECTED_AGENT_ROUTES.md](./CORRECTED_AGENT_ROUTES.md) for route specifications
3. Check browser console for errors
4. Test API endpoints directly with curl/Postman
5. Verify backend is running and accessible

---

## Quick Commands

```bash
# Start frontend
npm run dev

# Start backend
cd backend && uvicorn app.main:app --reload

# Check types
npm run type-check

# Run linter
npm run lint

# Build for production
npm run build
```
