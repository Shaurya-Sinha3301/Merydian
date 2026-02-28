import type { Metadata } from 'next';
import GroupsView from '@/components/itinerary/GroupsView';

export const metadata: Metadata = {
    title: 'Groups - Voyageur',
    description: 'Manage family groups and member preferences for this itinerary.',
};

interface PageProps {
    params: Promise<{ tripId: string }>;
}

export default async function TripGroupsPage({ params }: PageProps) {
    const { tripId } = await params;

    return <GroupsView tripId={tripId} />;
}
