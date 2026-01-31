'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import RequestStatusBadge from './RequestStatusBadge';
import ConstraintIndicator from './ConstraintIndicator';

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

interface MobileRequestCardProps {
  request: TripRequest;
  onQuickAction?: (requestId: string, action: string) => void;
}

const MobileRequestCard = ({ request, onQuickAction }: MobileRequestCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalTravelers = request.groupSize.adults + request.groupSize.children + request.groupSize.seniors;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-elevation-1 overflow-hidden">
      {/* Priority Bar */}
      <div className={`h-1 ${
        request.priority === 'high' ? 'bg-destructive' :
        request.priority === 'medium'? 'bg-warning' : 'bg-muted-foreground'
      }`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="data-text text-sm font-medium text-foreground">#{request.id}</span>
              <RequestStatusBadge status={request.status} size="sm" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">{request.customerName}</h3>
            <div className="flex items-center space-x-1.5 text-muted-foreground">
              <Icon name="UserGroupIcon" size={14} />
              <span className="caption text-xs">{totalTravelers} traveler{totalTravelers > 1 ? 's' : ''}</span>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground hover:bg-muted/80 transition-smooth"
          >
            <Icon name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={20} />
          </button>
        </div>

        {/* Destination & Dates */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center space-x-2">
            <Icon name="MapPinIcon" size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground">{request.destination}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="CalendarIcon" size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="caption text-xs text-muted-foreground">
              {formatDate(request.startDate)} - {formatDate(request.endDate)}
            </span>
          </div>
        </div>

        {/* Budget & Confidence */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="caption text-xs text-muted-foreground mb-1">Budget Range</p>
            <p className="text-sm font-medium text-foreground">
              {formatCurrency(request.budgetRange.min)} - {formatCurrency(request.budgetRange.max)}
            </p>
          </div>
          <div>
            <p className="caption text-xs text-muted-foreground mb-1">Confidence</p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-smooth ${
                    request.confidenceScore >= 80 ? 'bg-success' :
                    request.confidenceScore >= 60 ? 'bg-warning': 'bg-destructive'
                  }`}
                  style={{ width: `${request.confidenceScore}%` }}
                />
              </div>
              <span className="data-text text-xs font-medium text-foreground">
                {request.confidenceScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="pt-3 border-t border-border space-y-3">
            <div>
              <p className="caption text-xs font-medium text-muted-foreground mb-2">Constraints</p>
              <ConstraintIndicator constraints={request.constraints} />
            </div>
            <div>
              <p className="caption text-xs text-muted-foreground">
                Submitted: {formatDate(request.submittedAt)}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 mt-4">
          <Link
            href={`/agent-request-review?id=${request.id}`}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth text-sm font-medium"
          >
            <Icon name="EyeIcon" size={18} />
            <span>Review Request</span>
          </Link>
          <button
            onClick={() => onQuickAction?.(request.id, 'assign')}
            className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground hover:bg-muted/80 transition-smooth"
            title="Quick assign"
          >
            <Icon name="UserPlusIcon" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileRequestCard;