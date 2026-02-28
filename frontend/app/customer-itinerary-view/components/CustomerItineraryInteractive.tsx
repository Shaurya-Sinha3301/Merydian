'use client';

import { useState, useEffect } from 'react';
import TripSummaryCard from './TripSummaryCard';
import DayTimelineCard from './DayTimelineCard';
import ChangeRequestInput from './ChangeRequestInput';
import CostDeltaIndicator from './CostDeltaIndicator';
import ChangeHistoryPanel from './ChangeHistoryPanel';
import ActionButtons from './ActionButtons';
import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Activity {
  id: string;
  time: string;
  title: string;
  location: string;
  description: string;
  duration: string;
  cost: number;
  image: string;
  alt: string;
  isMustVisit: boolean;
  travelTime?: string;
  highlights: string[];
}

interface DayItinerary {
  dayNumber: number;
  date: string;
  activities: Activity[];
  totalDayCost: number;
}

interface TripSummaryData {
  destination: string;
  startDate: string;
  endDate: string;
  duration: number;
  totalCost: number;
  groupSize: {
    adults: number;
    children: number;
    seniors: number;
  };
  status: 'draft' | 'submitted' | 'in-review' | 'approved';
}

interface ChangeHistoryItem {
  id: string;
  timestamp: string;
  request: string;
  status: 'accepted' | 'rejected' | 'pending';
  costImpact: number;
}

const CustomerItineraryInteractive = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCostDelta, setShowCostDelta] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Data state
  const [tripSummary, setTripSummary] = useState<TripSummaryData | null>(null);
  const [itineraryDays, setItineraryDays] = useState<DayItinerary[]>([]);
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([]);
  const [currentTotalCost, setCurrentTotalCost] = useState(0);
  const [previousTotalCost, setPreviousTotalCost] = useState(0);
  const [isLoadingError, setIsLoadingError] = useState('');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchItineraryData = async () => {
    try {
      const itinData = await apiClient.getCurrentItinerary();

      if (itinData) {
        // Calculate total cost from all days
        const totalCost = itinData.days?.reduce((sum: number, day: any) => sum + (day.total_day_cost || day.activities?.reduce((ds: number, a: any) => ds + (a.cost || 0), 0) || 0), 0) || 0;

        setTripSummary({
          destination: itinData.destination || "Destination not set",
          startDate: itinData.start_date || "TBD",
          endDate: itinData.end_date || "TBD",
          duration: itinData.days?.length || 0,
          totalCost: totalCost,
          groupSize: {
            adults: 2, // Would usually come from trip summary
            children: 0,
            seniors: 0
          },
          status: itinData.status || 'in-review'
        });

        setCurrentTotalCost(totalCost);

        const daysMapped = (itinData.days || []).map((day: any) => ({
          dayNumber: day.day_number || day.dayNumber,
          date: day.date || `Day ${day.day_number}`,
          totalDayCost: day.total_day_cost || day.activities?.reduce((sum: number, act: any) => sum + (act.cost || 0), 0) || 0,
          activities: (day.activities || []).map((act: any) => ({
            id: act.id || act.poi_id,
            time: act.time || "TBD",
            title: act.title || "Activity",
            location: act.location || "Location",
            description: act.description || "",
            duration: act.duration || "1 hour",
            cost: act.cost || 0,
            image: act.image || "https://images.unsplash.com/photo-1730423965144-62014e08dbeb",
            alt: act.alt || "Activity Image",
            isMustVisit: act.is_must_visit || act.isMustVisit || false,
            travelTime: act.travel_time || act.travelTime || "",
            highlights: act.highlights || []
          }))
        }));

        setItineraryDays(daysMapped);
        return totalCost;
      }
      return null;
    } catch (err: any) {
      console.error("Failed to load itinerary:", err);
      setIsLoadingError(err.message || 'Failed to initialize itinerary');
      return null;
    }
  };

  useEffect(() => {
    if (!isHydrated || authLoading) return;

    if (!user) {
      window.location.href = '/customer-login';
      return;
    }

    fetchItineraryData().then((totalCost) => {
      if (totalCost !== null) {
        setPreviousTotalCost(totalCost);
      }
    });
  }, [user, isHydrated, authLoading]);

  if (!isHydrated || (!tripSummary && !isLoadingError)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="h-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-96 bg-muted rounded-lg animate-pulse" />
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl max-w-lg w-full text-center">
          <h2 className="text-xl font-bold mb-2">Could Not Load Itinerary</h2>
          <p>{isLoadingError}</p>
        </div>
      </div>
    );
  }

  const handleToggleDay = (dayNumber: number) => {
    if (!isHydrated) return;

    setExpandedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayNumber)) {
        newSet.delete(dayNumber);
      } else {
        newSet.add(dayNumber);
      }
      return newSet;
    });
  };

  const handleSubmitChange = async (request: string) => {
    if (!isHydrated) return;

    setIsProcessing(true);

    try {
      setPreviousTotalCost(currentTotalCost);
      const response = await apiClient.submitFeedbackMessage(request);

      // Check if the change actually impacted the itinerary
      if (response) {
        const newChange: ChangeHistoryItem = {
          id: `ch_${Date.now()}`,
          timestamp: new Date().toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          request: `${request} (${response.action_taken || 'Processed'})`,
          status: response.success ? 'accepted' : 'rejected',
          costImpact: response.cost_analysis?.total_cost_change || 0
        };

        setChangeHistory((prev) => [newChange, ...prev]);

        if (response.itinerary_updated) {
          // Refetch itinerary completely
          await fetchItineraryData();
          setShowCostDelta(true);
          setHasChanges(true);
        }
      }
    } catch (error) {
      console.error("Failed to submit change feedback:", error);
      alert("There was an error processing your feedback. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptChanges = () => {
    if (!isHydrated) return;

    setIsProcessing(true);

    setTimeout(() => {
      setChangeHistory((prev) =>
        prev.map((item) =>
          item.status === 'pending' ? { ...item, status: 'accepted' as const } : item
        )
      );
      setShowCostDelta(false);
      setHasChanges(false);
      setIsProcessing(false);
    }, 1500);
  };

  const handleRequestDifferent = () => {
    if (!isHydrated) return;

    setIsProcessing(true);

    setTimeout(() => {
      setChangeHistory((prev) =>
        prev.map((item) =>
          item.status === 'pending' ? { ...item, status: 'rejected' as const } : item
        )
      );
      setCurrentTotalCost(previousTotalCost);
      setShowCostDelta(false);
      setHasChanges(false);
      setIsProcessing(false);
    }, 1500);
  };

  const handleApproveFinal = () => {
    if (!isHydrated) return;

    setIsProcessing(true);

    setTimeout(() => {
      alert('Itinerary approved! Your travel agent will finalize the booking details.');
      setIsProcessing(false);
    }, 1500);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="h-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-96 bg-muted rounded-lg animate-pulse" />
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <TripSummaryCard tripData={tripSummary as TripSummaryData} />

          {showCostDelta &&
            <CostDeltaIndicator
              oldCost={previousTotalCost}
              newCost={currentTotalCost}
              isVisible={showCostDelta} />

          }

          <ChangeRequestInput
            onSubmitChange={handleSubmitChange}
            isProcessing={isProcessing} />


          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Your Itinerary</h2>
            {itineraryDays.map((day) =>
              <DayTimelineCard
                key={day.dayNumber}
                dayNumber={day.dayNumber}
                date={day.date}
                activities={day.activities}
                totalDayCost={day.totalDayCost}
                isExpanded={expandedDays.has(day.dayNumber)}
                onToggleExpand={() => handleToggleDay(day.dayNumber)} />

            )}
          </div>

          <ChangeHistoryPanel
            history={changeHistory}
            isExpanded={isHistoryExpanded}
            onToggleExpand={() => setIsHistoryExpanded(!isHistoryExpanded)} />


          <ActionButtons
            hasChanges={hasChanges}
            onAcceptChanges={handleAcceptChanges}
            onRequestDifferent={handleRequestDifferent}
            onApproveFinal={handleApproveFinal}
            isProcessing={isProcessing} />

        </div>
      </div>
    </div>);

};

export default CustomerItineraryInteractive;