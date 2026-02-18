'use client';

import { useState } from 'react';
import DashboardNavbar from './components/DashboardNavbar';
import LeftSidebar from './components/LeftSidebar';
import MainContent from './components/MainContent';
import RightSidebar from './components/RightSidebar';
import QuickFeedback from './components/QuickFeedback';
import { submitDemoFeedback, ItineraryData } from '@/lib/demoApi';

export default function CustomerDashboard() {
    const [itineraryData, setItineraryData] = useState<ItineraryData | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);

    const handleFeedbackSubmit = async (message: string) => {
        setIsLoading(true);
        try {
            const response = await submitDemoFeedback(message);

            if (response.success) {
                // Update itinerary with the new data
                setItineraryData(response.updated_itinerary);

                // Clear the is_new flag after 3 seconds
                setTimeout(() => {
                    setItineraryData(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            days: prev.days.map(day => ({
                                ...day,
                                items: day.items.map(item => ({
                                    ...item,
                                    is_new: false
                                }))
                            }))
                        };
                    });
                }, 3000);
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Navbar - Fixed at top */}
            <DashboardNavbar />

            {/* Main Layout - 3 Column Grid */}
            <div className="pt-16">
                {/* Desktop: 3 columns | Tablet: 2 columns | Mobile: 1 column */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_360px] gap-6 p-6 max-w-[1920px] mx-auto">

                    {/* Left Sidebar - Trip Navigation */}
                    <aside className="hidden lg:block">
                        <LeftSidebar />
                    </aside>

                    {/* Main Content - Scrollable */}
                    <main className="min-h-screen">
                        <MainContent itineraryData={itineraryData} />
                    </main>

                    {/* Right Sidebar - Widgets */}
                    <aside className="hidden xl:block space-y-6">
                        <QuickFeedback
                            onFeedbackSubmit={handleFeedbackSubmit}
                            isLoading={isLoading}
                        />
                        <RightSidebar />
                    </aside>
                </div>
            </div>
        </div>
    );
}
