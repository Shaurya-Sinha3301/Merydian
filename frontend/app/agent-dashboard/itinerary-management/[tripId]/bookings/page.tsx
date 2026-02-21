import type { Metadata } from 'next';
import BookingsView from '@/components/itinerary/BookingsView';

export const metadata: Metadata = {
    title: 'Trip Bookings - Voyageur',
    description: 'Manage and view all bookings for this trip.',
};

interface PageProps {
    params: Promise<{ tripId: string }>;
}

export default async function TripBookingsPage({ params }: PageProps) {
    const { tripId } = await params;
    return <BookingsView tripId={tripId} />;
}
