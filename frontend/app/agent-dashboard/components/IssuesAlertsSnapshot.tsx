import { TripRequest } from '@/lib/agent-dashboard/types';
import { AlertTriangle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface IssuesAlertsSnapshotProps {
  groups: TripRequest[];
}

type AlertType = 'critical' | 'warning' | 'info';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  groupId: string;
  groupName: string;
  timestamp: string;
}

const generateAlerts = (groups: TripRequest[]): Alert[] => {
  const alerts: Alert[] = [];
  
  // Add demo/static alerts first
  alerts.push(
    {
      id: 'demo-payment-pending',
      type: 'warning',
      title: 'Payment Pending',
      description: 'Goa Beach Retreat payment confirmation awaiting approval',
      groupId: 'GRP001',
      groupName: 'Goa Beach Retreat',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'demo-document-missing',
      type: 'critical',
      title: 'Documents Missing',
      description: 'Kerala Backwaters group missing 3 passport copies',
      groupId: 'GRP003',
      groupName: 'Kerala Backwaters',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'demo-hotel-confirmation',
      type: 'info',
      title: 'Hotel Confirmation',
      description: 'Himalayan Trek hotel booking confirmed for 18 guests',
      groupId: 'GRP002',
      groupName: 'Himalayan Trek',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'demo-transport-delay',
      type: 'warning',
      title: 'Transport Delay',
      description: 'Bus departure delayed by 2 hours for Manali group',
      groupId: 'GRP002',
      groupName: 'Himalayan Trek',
      timestamp: new Date().toISOString(),
    }
  );
  
  groups.forEach((group) => {
    const daysUntilStart = Math.ceil((new Date(group.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilEnd = Math.ceil((new Date(group.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    // Check for upcoming departures
    if (daysUntilStart <= 2 && daysUntilStart > 0) {
      alerts.push({
        id: `${group.id}-departure`,
        type: 'warning',
        title: 'Departure Soon',
        description: `${group.customerName} departs in ${daysUntilStart} day${daysUntilStart > 1 ? 's' : ''}`,
        groupId: group.id,
        groupName: group.customerName,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for groups ending soon
    if (daysUntilEnd <= 1 && daysUntilEnd >= 0) {
      alerts.push({
        id: `${group.id}-ending`,
        type: 'info',
        title: 'Trip Ending',
        description: `${group.customerName} trip ends ${daysUntilEnd === 0 ? 'today' : 'tomorrow'}`,
        groupId: group.id,
        groupName: group.customerName,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for missing bookings
    if (!group.bookings || group.bookings.length === 0) {
      alerts.push({
        id: `${group.id}-no-bookings`,
        type: 'critical',
        title: 'Missing Bookings',
        description: `${group.customerName} has no confirmed bookings`,
        groupId: group.id,
        groupName: group.customerName,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for pending bookings
    const pendingBookings = group.bookings?.filter(b => b.status === 'Pending').length || 0;
    if (pendingBookings > 0) {
      alerts.push({
        id: `${group.id}-pending`,
        type: 'warning',
        title: 'Pending Bookings',
        description: `${pendingBookings} booking${pendingBookings > 1 ? 's' : ''} awaiting confirmation`,
        groupId: group.id,
        groupName: group.customerName,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return alerts.sort((a, b) => {
    const priority = { critical: 0, warning: 1, info: 2 };
    return priority[a.type] - priority[b.type];
  });
};

const IssuesAlertsSnapshot = ({ groups }: IssuesAlertsSnapshotProps) => {
  const [selectedFilter, setSelectedFilter] = useState<AlertType | 'all'>('all');
  
  const allAlerts = generateAlerts(groups);
  
  const filteredAlerts = selectedFilter === 'all' 
    ? allAlerts 
    : allAlerts.filter(a => a.type === selectedFilter);

  const alertCounts = {
    critical: allAlerts.filter(a => a.type === 'critical').length,
    warning: allAlerts.filter(a => a.type === 'warning').length,
    info: allAlerts.filter(a => a.type === 'info').length,
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Clock className="w-5 h-5" />;
    }
  };

  const getAlertStyles = (type: AlertType) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-red-100',
          border: 'border-red-100/50',
          text: 'text-red-900',
          icon: 'text-red-600',
          badge: 'bg-red-100 text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-50 to-amber-100',
          border: 'border-amber-100/50',
          text: 'text-amber-900',
          icon: 'text-amber-600',
          badge: 'bg-amber-100 text-amber-700'
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
          border: 'border-blue-100/50',
          text: 'text-blue-900',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-700'
        };
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-foreground">Issues & Alerts</h2>
        <span className="text-sm text-muted-foreground">{allAlerts.length} total</span>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            selectedFilter === 'all'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All ({allAlerts.length})
        </button>
        <button
          onClick={() => setSelectedFilter('critical')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            selectedFilter === 'critical'
              ? 'bg-red-500 text-white shadow-sm'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          Critical ({alertCounts.critical})
        </button>
        <button
          onClick={() => setSelectedFilter('warning')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            selectedFilter === 'warning'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          Warning ({alertCounts.warning})
        </button>
        <button
          onClick={() => setSelectedFilter('info')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            selectedFilter === 'info'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          Info ({alertCounts.info})
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">
              No {selectedFilter !== 'all' ? selectedFilter : ''} alerts
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const styles = getAlertStyles(alert.type);
            
            return (
              <Link
                key={alert.id}
                href={`/agent-dashboard/${alert.groupId}`}
                className={`group relative block p-4 rounded-2xl border transition-all hover:shadow-md ${styles.bg} ${styles.border}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
                    {getAlertIcon(alert.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className={`text-sm font-semibold mb-1 ${styles.text}`}>
                      {alert.title}
                    </h4>
                    <p className={`text-sm ${styles.text} opacity-80`}>
                      {alert.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${styles.icon}`} />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default IssuesAlertsSnapshot;
