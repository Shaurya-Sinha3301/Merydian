import { Sidebar } from '@/components/ui/Sidebar';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import TripDetailNavbar from '@/components/itinerary/TripDetailNavbar';

interface LayoutProps {
    children: React.ReactNode;
    params: Promise<{ tripId: string }>;
}

export default async function TripDetailLayout({ children, params }: LayoutProps) {
    const { tripId } = await params;

    return (
        <div className="flex bg-background h-[calc(100vh-4rem)] overflow-hidden">
            <Sidebar collapsed />
            <div className="flex-1 flex flex-col overflow-hidden">
                <NavigationBreadcrumbs />
                <TripDetailNavbar tripId={tripId} />
                {children}
            </div>
        </div>
    );
}
