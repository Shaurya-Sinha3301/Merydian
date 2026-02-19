import type { Metadata } from 'next';
import { Sidebar } from '@/components/ui/Sidebar';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import ItineraryDetailView from '@/components/itinerary/ItineraryDetailView';

export const metadata: Metadata = {
    title: 'Trip Detail - Voyageur',
    description: 'Detailed itinerary view with AI-powered optimization insights.',
};

interface PageProps {
    params: Promise<{ tripId: string }>;
}

export default async function TripDetailPage({ params }: PageProps) {
    const { tripId } = await params;

    return (
        <div className="flex bg-background h-[calc(100vh-4rem)] overflow-hidden">
            <Sidebar collapsed />
            <div className="flex-1 flex flex-col overflow-hidden">
                <NavigationBreadcrumbs />
                {/* ItineraryDetailView reads tripId and looks up trip from lib/trips.ts */}
                <ItineraryDetailView tripId={tripId} />
            </div>
        </div>
    );
}
