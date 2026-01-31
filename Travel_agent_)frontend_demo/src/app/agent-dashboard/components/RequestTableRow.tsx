'use client';

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

interface RequestTableRowProps {
  request: TripRequest;
  onQuickAction?: (requestId: string, action: string) => void;
}

const RequestTableRow = ({ request, onQuickAction }: RequestTableRowProps) => {
  const totalTravelers = request.groupSize.adults + request.groupSize.children + request.groupSize.seniors;
  
  const priorityConfig = {
    high: 'text-destructive',
    medium: 'text-warning',
    low: 'text-muted-foreground',
  };

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
    <tr className="border-b border-border hover:bg-muted/50 transition-smooth">
      {/* Priority Indicator */}
      <td className="px-4 py-4">
        <div className="flex items-center justify-center">
          <div className={`h-2 w-2 rounded-full ${
            request.priority === 'high' ? 'bg-destructive' :
            request.priority === 'medium'? 'bg-warning' : 'bg-muted-foreground'
          }`} />
        </div>
      </td>

      {/* Request ID */}
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <span className="data-text text-sm font-medium text-foreground">#{request.id}</span>
          <span className="caption text-xs text-muted-foreground">{formatDate(request.submittedAt)}</span>
        </div>
      </td>

      {/* Customer Name */}
      <td className="px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="UserIcon" size={20} variant="solid" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{request.customerName}</span>
            <span className="caption text-xs text-muted-foreground">{totalTravelers} traveler{totalTravelers > 1 ? 's' : ''}</span>
          </div>
        </div>
      </td>

      {/* Destination & Dates */}
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5 mb-1">
            <Icon name="MapPinIcon" size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{request.destination}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Icon name="CalendarIcon" size={14} className="text-muted-foreground" />
            <span className="caption text-xs text-muted-foreground">
              {formatDate(request.startDate)} - {formatDate(request.endDate)}
            </span>
          </div>
        </div>
      </td>

      {/* Budget Range */}
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {formatCurrency(request.budgetRange.min)} - {formatCurrency(request.budgetRange.max)}
          </span>
          <span className="caption text-xs text-muted-foreground">Per person</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <RequestStatusBadge status={request.status} size="sm" />
      </td>

      {/* Constraints */}
      <td className="px-4 py-4">
        <ConstraintIndicator constraints={request.constraints} compact />
      </td>

      {/* Confidence Score */}
      <td className="px-4 py-4">
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
          <span className="data-text text-xs font-medium text-foreground w-8 text-right">
            {request.confidenceScore}%
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex items-center space-x-2">
          <Link
            href={`/agent-request-review?id=${request.id}`}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth text-sm font-medium"
          >
            <Icon name="EyeIcon" size={16} />
            <span>Review</span>
          </Link>
          <button
            onClick={() => onQuickAction?.(request.id, 'assign')}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground hover:bg-muted/80 transition-smooth"
            title="Quick assign"
          >
            <Icon name="UserPlusIcon" size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default RequestTableRow;