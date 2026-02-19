'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardMetrics from './DashboardMetrics';
import RequestFilters, { FilterState } from './RequestFilters';
import RequestsTable from './RequestsTable';
import MobileRequestsList from './MobileRequestsList';
import { TripRequest } from '@/lib/agent-dashboard/types';
import { activeGroups } from '@/lib/agent-dashboard/data';

const AgentDashboardInteractive = () => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<TripRequest[]>(activeGroups);
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

    let filtered = [...activeGroups];

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
    if (action === 'approve' || action === 'review') {
      router.push(`/agent-dashboard/itinerary-management/${requestId}`);
    }
  };

  const metrics = {
    pendingRequests: activeGroups.filter((r) => r.status === 'new').length,
    inReview: activeGroups.filter((r) => r.status === 'in-review').length,
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Current Running Groups</h1>
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
          <span className="font-medium text-foreground">{activeGroups.length}</span> active groups
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
