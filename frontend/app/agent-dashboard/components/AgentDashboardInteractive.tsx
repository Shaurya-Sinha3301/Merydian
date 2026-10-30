/* eslint-disable */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import DestinationCards from './DestinationCards';
import StatisticsPanel from './StatisticsPanel';
import IssuesAlertsSnapshot from './IssuesAlertsSnapshot';
import UpcomingGroupsTimeline from './UpcomingGroupsTimeline';
import RequestFilters, { FilterState } from './RequestFilters';
import RequestsTable from './RequestsTable';
import MobileRequestsList from './MobileRequestsList';
type TripRequest = any;
import { tripsService } from '@/services/trips';
import BookingExplorer from './BookingExplorer';
import { ArrowLeft } from 'lucide-react';

const AgentDashboardInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeGroups, setActiveGroups] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TripRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    sortBy: 'newest',
  });
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    tripsService.getAgentTrips().then((res: any) => {
      const items = res.items || res;
      if (Array.isArray(items)) {
        const formattedTrips = items.map((trip: any) => ({
          id: trip.trip_id,
          customerName: trip.trip_name || 'Unnamed Trip',
          destination: trip.destination || 'Unknown',
          status: trip.status || 'Pending',
          priority: 'Normal',
          budgetRange: { min: 1000, max: 5000 },
          startDate: trip.start_date || '2026-03-15',
          submittedAt: '2026-03-01T10:00:00Z',
        }));
        setActiveGroups(formattedTrips);
      }
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    let filtered = [...activeGroups];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.customerName.toLowerCase().includes(search) ||
          req.destination.toLowerCase().includes(search) ||
          req.id.toLowerCase().includes(search)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter((req) => req.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter((req) => req.priority === filters.priority);
    }

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
      setSelectedRequest(requestId);
    }
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

  if (selectedRequest) {
    const request = activeGroups.find(r => r.id === selectedRequest);
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => setSelectedRequest(null)}
          className="mb-4 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>
        <BookingExplorer
          requestId={selectedRequest}
          initialLocation={request?.destination || "Goa"}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-start mb-6">
        <DashboardHeader 
          showDetailedView={showDetailedView}
          onToggleView={() => setShowDetailedView(!showDetailedView)}
        />
        {activeGroups.length === 0 && (
          <button onClick={() => window.location.href = '/demo'} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors mt-2">
            View Mock Dashboard
          </button>
        )}
      </div>

      {!showDetailedView ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <DestinationCards groups={activeGroups} />
            <IssuesAlertsSnapshot groups={activeGroups} />
          </div>

          {/* Right Column - Stats & Timeline */}
          <div className="space-y-6">
            <StatisticsPanel groups={activeGroups} />
            <UpcomingGroupsTimeline groups={activeGroups} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <RequestFilters onFilterChange={handleFilterChange} onSearchChange={handleSearchChange} />
          
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredRequests.length}</span> of{' '}
              <span className="font-medium text-foreground">{activeGroups.length}</span> active groups
            </p>
          </div>

          <div className="hidden lg:block">
            <RequestsTable requests={filteredRequests} onQuickAction={handleQuickAction} />
          </div>

          <div className="lg:hidden">
            <MobileRequestsList requests={filteredRequests} onQuickAction={handleQuickAction} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDashboardInteractive;
