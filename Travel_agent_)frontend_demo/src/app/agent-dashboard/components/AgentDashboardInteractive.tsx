'use client';

import { useState, useEffect } from 'react';
import DashboardMetrics from './DashboardMetrics';
import RequestFilters, { FilterState } from './RequestFilters';
import RequestsTable from './RequestsTable';
import MobileRequestsList from './MobileRequestsList';

interface TripRequest {
  id: string;
  customerName: string;
  destination: string;
  startDate: string;
  endDate: string;
  groupSize: {
    adults: number;
    children: number;
    seniors: number;
  };
  budgetRange: {
    min: number;
    max: number;
  };
  status: 'new' | 'in-review' | 'approved' | 'booked';
  priority: 'high' | 'medium' | 'low';
  constraints: Array<{
    type: 'mobility' | 'time' | 'budget' | 'preference';
    severity: 'high' | 'medium' | 'low';
    description: string;
  }>;
  confidenceScore: number;
  submittedAt: string;
}

const mockRequests: TripRequest[] = [
  {
    id: 'TR-2026-001',
    customerName: 'Sarah Johnson',
    destination: 'Paris, France',
    startDate: '2026-03-15',
    endDate: '2026-03-22',
    groupSize: { adults: 2, children: 1, seniors: 0 },
    budgetRange: { min: 3500, max: 4500 },
    status: 'new',
    priority: 'high',
    constraints: [
      { type: 'mobility', severity: 'medium', description: 'Child-friendly activities required' },
      { type: 'preference', severity: 'low', description: 'Prefer morning museum visits' },
    ],
    confidenceScore: 85,
    submittedAt: '2026-01-18T09:30:00',
  },
  {
    id: 'TR-2026-002',
    customerName: 'Michael Chen',
    destination: 'Tokyo, Japan',
    startDate: '2026-04-10',
    endDate: '2026-04-20',
    groupSize: { adults: 2, children: 0, seniors: 2 },
    budgetRange: { min: 5000, max: 7000 },
    status: 'in-review',
    priority: 'medium',
    constraints: [
      { type: 'mobility', severity: 'high', description: 'Limited walking ability for seniors' },
      { type: 'time', severity: 'medium', description: 'Prefer slower-paced itinerary' },
    ],
    confidenceScore: 72,
    submittedAt: '2026-01-17T14:20:00',
  },
  {
    id: 'TR-2026-003',
    customerName: 'Emily Rodriguez',
    destination: 'Barcelona, Spain',
    startDate: '2026-05-05',
    endDate: '2026-05-12',
    groupSize: { adults: 4, children: 0, seniors: 0 },
    budgetRange: { min: 2500, max: 3500 },
    status: 'new',
    priority: 'low',
    constraints: [],
    confidenceScore: 92,
    submittedAt: '2026-01-18T11:45:00',
  },
  {
    id: 'TR-2026-004',
    customerName: 'David Thompson',
    destination: 'Rome, Italy',
    startDate: '2026-06-01',
    endDate: '2026-06-08',
    groupSize: { adults: 2, children: 2, seniors: 1 },
    budgetRange: { min: 4000, max: 5500 },
    status: 'approved',
    priority: 'high',
    constraints: [
      { type: 'budget', severity: 'high', description: 'Strict budget limit due to large group' },
      { type: 'preference', severity: 'medium', description: 'Must avoid crowded tourist spots' },
    ],
    confidenceScore: 68,
    submittedAt: '2026-01-16T16:10:00',
  },
  {
    id: 'TR-2026-005',
    customerName: 'Lisa Anderson',
    destination: 'London, UK',
    startDate: '2026-07-15',
    endDate: '2026-07-25',
    groupSize: { adults: 1, children: 0, seniors: 0 },
    budgetRange: { min: 3000, max: 4000 },
    status: 'in-review',
    priority: 'medium',
    constraints: [
      { type: 'preference', severity: 'low', description: 'Interest in theater and arts' },
    ],
    confidenceScore: 88,
    submittedAt: '2026-01-17T10:30:00',
  },
  {
    id: 'TR-2026-006',
    customerName: 'Robert Martinez',
    destination: 'Dubai, UAE',
    startDate: '2026-08-20',
    endDate: '2026-08-28',
    groupSize: { adults: 3, children: 1, seniors: 0 },
    budgetRange: { min: 6000, max: 8000 },
    status: 'booked',
    priority: 'low',
    constraints: [],
    confidenceScore: 95,
    submittedAt: '2026-01-15T13:20:00',
  },
];

const AgentDashboardInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<TripRequest[]>(mockRequests);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    sortBy: 'newest',
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    let filtered = [...mockRequests];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.customerName.toLowerCase().includes(search) ||
          req.destination.toLowerCase().includes(search) ||
          req.id.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((req) => req.status === filters.status);
    }

    // Apply priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter((req) => req.priority === filters.priority);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case 'oldest':
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        case 'budget-desc':
          return b.budgetRange.max - a.budgetRange.max;
        case 'budget-asc':
          return a.budgetRange.min - b.budgetRange.min;
        case 'departure':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        default:
          return 0;
      }
    });

    setFilteredRequests(filtered);
  }, [searchTerm, filters, isHydrated]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
  };

  const handleQuickAction = (requestId: string, action: string) => {
    console.log(`Quick action: ${action} for request ${requestId}`);
    // In a real application, this would trigger an API call
  };

  const metrics = {
    pendingRequests: mockRequests.filter((r) => r.status === 'new').length,
    inReview: mockRequests.filter((r) => r.status === 'in-review').length,
    completionRate: 87,
    revenueProjection: '$124,500',
    marginAverage: '18.5%',
  };

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Trip Requests Dashboard</h1>
        <p className="text-muted-foreground">
          Manage incoming trip requests and monitor operational metrics
        </p>
      </div>

      {/* Metrics */}
      <DashboardMetrics metrics={metrics} />

      {/* Filters */}
      <RequestFilters onFilterChange={handleFilterChange} onSearchChange={handleSearchChange} />

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredRequests.length}</span> of{' '}
          <span className="font-medium text-foreground">{mockRequests.length}</span> requests
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <RequestsTable requests={filteredRequests} onQuickAction={handleQuickAction} />
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden">
        <MobileRequestsList requests={filteredRequests} onQuickAction={handleQuickAction} />
      </div>
    </div>
  );
};

export default AgentDashboardInteractive;