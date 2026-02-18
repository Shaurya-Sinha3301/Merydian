import MobileRequestCard from './MobileRequestCard';

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

interface MobileRequestsListProps {
  requests: TripRequest[];
  onQuickAction?: (requestId: string, action: string) => void;
}

const MobileRequestsList = ({ requests, onQuickAction }: MobileRequestsListProps) => {
  if (requests.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">No Requests Found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <MobileRequestCard
          key={request.id}
          request={request}
          onQuickAction={onQuickAction}
        />
      ))}
    </div>
  );
};

export default MobileRequestsList;