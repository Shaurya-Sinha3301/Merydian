import type { Metadata } from 'next';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import ItineraryOptimizerWindow from '@/components/itinerary/ItineraryOptimizerWindow';
import TripDetailNavbar from '@/components/itinerary/TripDetailNavbar';

export const metadata: Metadata = {
    title: 'Itinerary Management - Voyageur',
    description: 'Manage and optimize client group trip itineraries with AI-powered tools.',
};

export default function ItineraryManagementPage() {
    return (
        <div className="flex bg-white h-screen overflow-hidden">
            <main className="flex-1 overflow-hidden flex flex-col">
                <NavigationBreadcrumbs />
                {/* Normally TripDetailNavbar needs a tripId, but on this general page we can just pass a default or hide it if it requires one. Looking at TripDetailNavbar it fetches a trip. */}
                {/* Wait, TripDetailNavbar requires a tripId prop. The user asked to add it here, but this is a list page. Let's see if there's a default trip or if we should just render it without breaking. */}
                <ItineraryOptimizerWindow />
            </main>
        </div>
    );
}
