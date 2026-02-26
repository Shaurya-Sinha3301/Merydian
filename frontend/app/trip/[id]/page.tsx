'use client';

import { useParams } from 'next/navigation';
// import DashboardNavbar from '@/app/customer-dashboard/components/DashboardNavbar';
import TripHeader from './components/TripHeader';
// import BigMap from '@/app/my-trips/components/BigMap';
// import ScrollableCalendar from '@/app/my-trips/components/ScrollableCalendar';
// import FamilyMembers from '@/app/my-trips/components/FamilyMembers';
// import DocVault from '@/app/my-trips/components/DocVault';
import AgentChatPanel from '@/components/chat/AgentChatPanel';

export default function TripDetailPage() {
    const params = useParams();
    const tripId = params.id as string;

    return (
        <div className="min-h-screen bg-[#F0F2F5]">
            {/* <DashboardNavbar /> */}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 p-6 max-w-[1920px] mx-auto pt-24 h-[calc(100vh-1rem)]">
                {/* Main Content: Map, Calendar, Docs */}
                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    <TripHeader tripId={tripId} />
                    {/* <BigMap /> */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* <ScrollableCalendar /> */}
                        {/* <FamilyMembers /> */}
                    </div>
                    {/* <DocVault /> */}
                </div>

                {/* Right Sidebar: Chat */}
                <div className="h-full flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900">Trip Assistant</h2>
                        <p className="text-xs text-gray-500">Ask for changes or suggestions</p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <AgentChatPanel tripId={tripId} />
                    </div>
                </div>
            </div>

        </div>
    );
}
