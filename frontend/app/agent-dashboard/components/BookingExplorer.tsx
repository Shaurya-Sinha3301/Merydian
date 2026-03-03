import React from 'react';

interface BookingExplorerProps {
    requestId: string;
    initialLocation: string;
}

const BookingExplorer: React.FC<BookingExplorerProps> = ({ requestId, initialLocation }) => {
    return (
        <div className="bg-card p-6 rounded-lg border min-h-[500px]">
            <h2 className="text-2xl font-bold mb-4">Booking Explorer</h2>
            <div className="space-y-4">
                <p><strong>Request ID:</strong> {requestId}</p>
                <p><strong>Location:</strong> {initialLocation}</p>
            </div>
            <div className="mt-8 p-8 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground">
                Booking Explorer content goes here
            </div>
        </div>
    );
};

export default BookingExplorer;
