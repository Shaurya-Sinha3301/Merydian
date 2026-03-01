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
import { TripRequest } from '@/lib/agent-dashboard/types';
import { activeGroups } from '@/lib/agent-dashboard/data';
import BookingExplorer from './BookingExplorer';
import TripInitializationPanel from './TripInitializationPanel';
import { ArrowLeft, Plus } from 'lucide-react';
import { apiClient, TripWithOptimizationResponse } from '@/services/api';
import { wsService } from '@/services/websocket.service';
import { useAuth } from '@/contexts/AuthContext';

const AgentDashboardInteractive = () => {
  const { user } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<TripRequest[]>(activeGroups);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    sortBy: 'newest',
  });
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [showTripInit, setShowTripInit] = useState(false);
  const [liveTrips, setLiveTrips] = useState<any[]>([]);
  const [wsNotifications, setWsNotifications] = useState<any[]>([]);

  useEffect(() => {
    setIsHydrated(true);

    // Fetch real trips from API
    apiClient.getAgentTrips({ limit: 20 }).then((res: any) => {
      if (res?.items) setLiveTrips(res.items);
    }).catch(() => {});

    // Connect WebSocket for real-time updates
    if (user?.id) {
      wsService.connect('agent', user.id);
      const unsub = wsService.on('itinerary_updated', (data) => {
        setWsNotifications(prev => [data, ...prev.slice(0, 9)]);
        // Refresh trips list on update
        apiClient.getAgentTrips({ limit: 20 }).then((res: any) => {
          if (res?.items) setLiveTrips(res.items);
        }).catch(() => {});
      });
      return () => {
        unsub();
        wsService.disconnect();
      };
    }
  }, [user?.id]);

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

  const handleTripCreated = (result: TripWithOptimizationResponse) => {
    apiClient.getAgentTrips({ limit: 20 }).then((res: any) => {
      if (res?.items) setLiveTrips(res.items);
    }).catch(() => {});
    setShowTripInit(false);
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
      <DashboardHeader 
        showDetailedView={showDetailedView}
        onToggleView={() => setShowDetailedView(!showDetailedView)}
      />

      {/* Initialize Trip Button + Notifications */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setShowTripInit(!showTripInit)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {showTripInit ? 'Hide Trip Form' : 'Initialize New Trip'}
        </button>
        {wsNotifications.length > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            {wsNotifications.length} live update{wsNotifications.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Trip Initialization Panel */}
      {showTripInit && (
        <div className="mb-6">
          <TripInitializationPanel onTripCreated={handleTripCreated} />
        </div>
      )}

      {/* Live Notifications */}
      {wsNotifications.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Recent Updates</h3>
          {wsNotifications.slice(0, 3).map((n, i) => (
            <div key={i} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm">
              <span className="font-medium">{n.message || 'Itinerary updated'}</span>
              {n.trip_id && <span className="text-muted-foreground ml-2">Trip: {n.trip_id}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Live Trips from API */}
      {liveTrips.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Trips (Live)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveTrips.map((trip: any, i: number) => (
              <div key={i} className="bg-white dark:bg-slate-900 border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{trip.trip_name || trip.trip_id}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {trip.iteration_count || 0} iterations
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{trip.destination}</p>
                <p className="text-xs text-muted-foreground">{trip.start_date} → {trip.end_date}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(trip.families || []).length} families &bull; {trip.feedback_count || 0} feedbacks
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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
