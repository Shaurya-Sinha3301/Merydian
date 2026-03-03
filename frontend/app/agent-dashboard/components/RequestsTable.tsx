import React from 'react';
import { TripRequest } from '@/lib/agent-dashboard/types';

interface RequestsTableProps {
    requests: TripRequest[];
    onQuickAction: (requestId: string, action: string) => void;
}

const RequestsTable: React.FC<RequestsTableProps> = ({ requests, onQuickAction }) => {
    return (
        <div className="bg-card p-4 rounded-lg border">
            <h3 className="text-lg font-medium mb-4">Requests Table Placeholder</h3>
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b">
                        <th className="pb-2">ID</th>
                        <th className="pb-2">Customer</th>
                        <th className="pb-2">Destination</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(req => (
                        <tr key={req.id} className="border-b">
                            <td className="py-2">{req.id}</td>
                            <td className="py-2">{req.customerName}</td>
                            <td className="py-2">{req.destination}</td>
                            <td className="py-2">{req.status}</td>
                            <td className="py-2">
                                <button
                                    className="text-primary hover:underline"
                                    onClick={() => onQuickAction(req.id, 'review')}
                                >
                                    Review
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RequestsTable;
