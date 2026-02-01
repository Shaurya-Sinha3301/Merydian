import RequestTableRow from './RequestTableRow';

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

interface RequestsTableProps {
  requests: TripRequest[];
  onQuickAction?: (requestId: string, action: string) => void;
}

const RequestsTable = ({ requests, onQuickAction }: RequestsTableProps) => {
  if (requests.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No Requests Found</h3>
            <p className="text-sm text-muted-foreground">
              No trip requests match your current filters. Try adjusting your search criteria.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-elevation-1 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left">
                <span className="sr-only">Priority</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Request ID
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Customer
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Destination & Dates
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Budget Range
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Constraints
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Confidence
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((request) => (
              <RequestTableRow
                key={request.id}
                request={request}
                onQuickAction={onQuickAction}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestsTable;