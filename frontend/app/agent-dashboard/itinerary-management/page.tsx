import type { Metadata } from 'next';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import ItineraryOptimizerWindow from '@/components/itinerary/ItineraryOptimizerWindow';

export const metadata: Metadata = {
    title: 'Itinerary Management - Voyageur',
    description: 'Manage and optimize client group trip itineraries with AI-powered tools.',
};

export default function ItineraryManagementPage() {
    return (
        <div className="flex bg-white h-screen overflow-hidden">
            <main className="flex-1 overflow-hidden flex flex-col">
                <NavigationBreadcrumbs />
                <ItineraryOptimizerWindow />
            </main>
        </div>
    );
}
