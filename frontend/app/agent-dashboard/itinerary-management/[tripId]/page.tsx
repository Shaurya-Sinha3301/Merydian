import type { Metadata } from 'next';
import ItineraryDetailView from '@/components/itinerary/ItineraryDetailView';

export const metadata: Metadata = {
    title: 'Trip Optimization - Voyageur',
    description: 'Detailed itinerary view with AI-powered optimization insights.',
};

interface PageProps {
    params: Promise<{ tripId: string }>;
}

export default async function TripOptimizationPage({ params }: PageProps) {
    const { tripId } = await params;

    return <ItineraryDetailView tripId={tripId} />;
}
