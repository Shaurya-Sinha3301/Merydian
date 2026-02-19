import type { Metadata } from 'next';
import GroupsView from '@/components/itinerary/GroupsView';

type PageProps = {
    params: Promise<{ tripId: string }>;
};

export const metadata: Metadata = {
    title: 'Trip Groups – Voyageur Studio',
    description: 'Manage trip groups, family requests, and live communication.',
};

export default async function TripGroupsPage({ params }: PageProps) {
    const { tripId } = await params;
    return <GroupsView tripId={tripId} />;
}
