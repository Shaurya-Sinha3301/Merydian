import React from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import ItineraryView from '@/components/itinerary/ItineraryView';

interface PageProps {
  params: Promise<{
    groupId: string;
  }>;
}

export default async function ItineraryPage({ params }: PageProps) {
  const { groupId } = await params;
  
  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <NavigationBreadcrumbs />
          <ItineraryView groupId={groupId} />
        </div>
      </main>
    </div>
  );
}
