import React from 'react';
import { TripRequest } from '@/lib/agent-dashboard/types';

interface MobileRequestsListProps {
    requests: TripRequest[];
    onQuickAction: (requestId: string, action: string) => void;
}

const MobileRequestsList: React.FC<MobileRequestsListProps> = ({ requests, onQuickAction }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Mobile Requests List Placeholder</h3>
            {requests.map(req => (
                <div key={req.id} className="bg-card p-4 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{req.customerName}</span>
                        <span className="text-sm bg-muted px-2 py-1 rounded">{req.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.destination}</p>
                    <button
                        className="mt-4 w-full bg-primary text-primary-foreground py-2 rounded"
                        onClick={() => onQuickAction(req.id, 'review')}
                    >
                        Review Request
                    </button>
                </div>
            ))}
        </div>
    );
};

export default MobileRequestsList;
