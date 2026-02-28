import type { Metadata } from 'next';
import BookingsView from '@/components/itinerary/BookingsView';

export const metadata: Metadata = {
    title: 'Bookings - Voyageur',
    description: 'Manage bookings and reservations for this itinerary.',
};

interface PageProps {
    params: Promise<{ tripId: string }>;
}

export default async function TripBookingsPage({ params }: PageProps) {
    const { tripId } = await params;

    return <BookingsView tripId={tripId} />;
}
