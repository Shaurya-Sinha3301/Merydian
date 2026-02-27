import ItineraryBuilderView from '@/components/itinerary/ItineraryBuilderView';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';

export default function ItineraryBuilderPage() {
    return (
        <div className="flex bg-white h-screen overflow-hidden">
            <main className="flex-1 overflow-hidden flex flex-col">
                <NavigationBreadcrumbs />
                <ItineraryBuilderView />
            </main>
        </div>
    );
}
