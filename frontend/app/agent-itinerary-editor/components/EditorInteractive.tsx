'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import ItineraryTimeline from './ItineraryTimeline';
import ActivityLibrary from './ActivityLibrary';
import CostAnalysisPanel from './CostAnalysisPanel';
import ComparisonView from './ComparisonView';

import AgentWorkflowTabs from '@/components/common/AgentWorkflowTabs';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';

interface Activity {
  id: string;
  name: string;
  category: string;
  location: string;
  duration: number;
  priceRange: string;
  price: number;
  description: string;
  image: string;
  alt: string;
  rating: number;
  tags: string[];
}

interface TimelineActivity {
  id: string;
  name: string;
  location: string;
  startTime: string;
  endTime: string;
  duration: number;
  cost: number;
  category: string;
  description: string;
  image: string;
  alt: string;
  travelTime?: number;
  constraints?: string[];
}

interface DayItinerary {
  day: number;
  date: string;
  activities: TimelineActivity[];
  totalCost: number;
  totalDuration: number;
}

const EditorInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showActivityLibrary, setShowActivityLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [itinerary, setItinerary] = useState<DayItinerary[]>([
    {
      day: 1,
      date: 'Monday, January 20, 2026',
      activities: [
        {
          id: 'act-001',
          name: 'Eiffel Tower Summit Tour',
          location: 'Champ de Mars, Paris',
          startTime: '09:00',
          endTime: '12:00',
          duration: 180,
          cost: 89,
          category: 'attractions',
          description: 'Skip-the-line access to all three levels including summit with panoramic city views',
          image: "https://images.unsplash.com/photo-1654714696948-d38186f04df7",
          alt: 'Eiffel Tower illuminated at dusk with golden lights against purple sky',
          travelTime: 0
        },
        {
          id: 'act-002',
          name: 'Seine River Cruise',
          location: 'Port de la Bourdonnais',
          startTime: '14:00',
          endTime: '15:30',
          duration: 90,
          cost: 35,
          category: 'relaxation',
          description: 'Scenic boat tour along the Seine with audio guide and refreshments',
          image: "https://images.unsplash.com/photo-1532789778906-6ee7fe6c9ef1",
          alt: 'Tourist boat cruising on Seine River with historic Parisian buildings in background',
          travelTime: 30
        },
        {
          id: 'act-003',
          name: 'Le Jules Verne Restaurant',
          location: 'Eiffel Tower, 2nd Floor',
          startTime: '19:00',
          endTime: '21:30',
          duration: 150,
          cost: 285,
          category: 'dining',
          description: 'Michelin-starred dining experience with breathtaking views of Paris',
          image: "https://images.unsplash.com/photo-1517807918616-f60475f77328",
          alt: 'Elegant fine dining table setting with white tablecloth and wine glasses overlooking city',
          travelTime: 15
        }],

      totalCost: 409,
      totalDuration: 420
    },
    {
      day: 2,
      date: 'Tuesday, January 21, 2026',
      activities: [
        {
          id: 'act-004',
          name: 'Louvre Museum Private Tour',
          location: 'Rue de Rivoli',
          startTime: '09:30',
          endTime: '13:30',
          duration: 240,
          cost: 195,
          category: 'culture',
          description: 'Expert-guided tour of world-famous artworks including Mona Lisa and Venus de Milo',
          image: "https://images.unsplash.com/photo-1601950355591-5099f042e4f9",
          alt: 'Glass pyramid entrance of Louvre Museum with classical architecture in background',
          travelTime: 0
        },
        {
          id: 'act-005',
          name: 'Montmartre Walking Tour',
          location: 'Montmartre District',
          startTime: '15:00',
          endTime: '17:30',
          duration: 150,
          cost: 45,
          category: 'culture',
          description: 'Discover the artistic heart of Paris with visits to Sacré-Cœur and Place du Tertre',
          image: "https://images.unsplash.com/photo-1660925912263-68be34f72759",
          alt: 'White domed Sacré-Cœur Basilica illuminated at night on hilltop',
          travelTime: 45
        }],

      totalCost: 240,
      totalDuration: 390
    }]
  );

  const originalCost = 649;
  const modifiedCost = itinerary.reduce((sum, day) => sum + day.totalCost, 0);

  const costBreakdown = [
    {
      category: 'Attractions',
      original: 284,
      modified: 284,
      change: 0,
      icon: 'BuildingLibraryIcon'
    },
    {
      category: 'Dining',
      original: 285,
      modified: 285,
      change: 0,
      icon: 'CakeIcon'
    },
    {
      category: 'Activities',
      original: 80,
      modified: 80,
      change: 0,
      icon: 'BoltIcon'
    }];


  const marginAnalysis = {
    totalCost: modifiedCost,
    customerPrice: Math.round(modifiedCost * 1.25),
    grossMargin: Math.round(modifiedCost * 0.25),
    companyCut: Math.round(modifiedCost * 0.25 * 0.7),
    agentCut: Math.round(modifiedCost * 0.25 * 0.3),
    marginPercentage: 25
  };

  const comparisonData = [
    {
      day: 1,
      date: 'Monday, January 20, 2026',
      original: [
        {
          id: 'act-001',
          name: 'Eiffel Tower Summit Tour',
          location: 'Champ de Mars',
          time: '09:00 - 12:00',
          cost: 89,
          image: "https://images.unsplash.com/photo-1654714696948-d38186f04df7",
          alt: 'Eiffel Tower illuminated at dusk with golden lights against purple sky',
          status: 'unchanged' as const
        },
        {
          id: 'act-002',
          name: 'Seine River Cruise',
          location: 'Port de la Bourdonnais',
          time: '14:00 - 15:30',
          cost: 35,
          image: "https://images.unsplash.com/photo-1532789778906-6ee7fe6c9ef1",
          alt: 'Tourist boat cruising on Seine River with historic Parisian buildings in background',
          status: 'unchanged' as const
        }],

      modified: [
        {
          id: 'act-001',
          name: 'Eiffel Tower Summit Tour',
          location: 'Champ de Mars',
          time: '09:00 - 12:00',
          cost: 89,
          image: "https://images.unsplash.com/photo-1654714696948-d38186f04df7",
          alt: 'Eiffel Tower illuminated at dusk with golden lights against purple sky',
          status: 'unchanged' as const
        },
        {
          id: 'act-002',
          name: 'Seine River Cruise',
          location: 'Port de la Bourdonnais',
          time: '14:00 - 15:30',
          cost: 35,
          image: "https://images.unsplash.com/photo-1532789778906-6ee7fe6c9ef1",
          alt: 'Tourist boat cruising on Seine River with historic Parisian buildings in background',
          status: 'unchanged' as const
        },
        {
          id: 'act-003',
          name: 'Le Jules Verne Restaurant',
          location: 'Eiffel Tower, 2nd Floor',
          time: '19:00 - 21:30',
          cost: 285,
          image: "https://images.unsplash.com/photo-1517807918616-f60475f77328",
          alt: 'Elegant fine dining table setting with white tablecloth and wine glasses overlooking city',
          status: 'added' as const
        }],

      costChange: 285
    }];


  const handleActivityEdit = (dayIndex: number, activityId: string) => {
    setHasUnsavedChanges(true);
  };

  const handleActivityDelete = (dayIndex: number, activityId: string) => {
    setItinerary((prev) => {
      const newItinerary = [...prev];
      newItinerary[dayIndex].activities = newItinerary[dayIndex].activities.filter(
        (a) => a.id !== activityId
      );
      newItinerary[dayIndex].totalCost = newItinerary[dayIndex].activities.reduce(
        (sum, a) => sum + a.cost,
        0
      );
      return newItinerary;
    });
    setHasUnsavedChanges(true);
  };

  const handleActivityReorder = (dayIndex: number, fromIndex: number, toIndex: number) => {
    setItinerary((prev) => {
      const newItinerary = [...prev];
      const [removed] = newItinerary[dayIndex].activities.splice(fromIndex, 1);
      newItinerary[dayIndex].activities.splice(toIndex, 0, removed);
      return newItinerary;
    });
    setHasUnsavedChanges(true);
  };

  const handleTimeAdjust = (dayIndex: number, activityId: string, newStartTime: string) => {
    setItinerary((prev) => {
      const newItinerary = [...prev];
      const activity = newItinerary[dayIndex].activities.find((a) => a.id === activityId);
      if (activity) {
        activity.startTime = newStartTime;
        const [hours, minutes] = newStartTime.split(':').map(Number);
        const endMinutes = hours * 60 + minutes + activity.duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        activity.endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
      }
      return newItinerary;
    });
    setHasUnsavedChanges(true);
  };

  const handleActivitySelect = (activity: Activity) => {
    setShowActivityLibrary(false);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
    setHasUnsavedChanges(false);
  };

  const handlePreviewCustomerView = () => {
    window.open('/customer-itinerary-view', '_blank');
  };

  const handleSendUpdatedItinerary = async () => {
    if (hasUnsavedChanges) {
      await handleSaveChanges();
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">

        <AgentWorkflowTabs requestId="REQ-2026-001" />
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="text-muted-foreground">Loading editor...</span>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">

      <AgentWorkflowTabs
        requestId="REQ-2026-001"
        hasUnsavedChanges={hasUnsavedChanges} />

      <NavigationBreadcrumbs
        requestContext={{
          customerName: 'Sarah Johnson',
          destination: 'Paris, France',
          requestId: 'REQ-2026-001'
        }} />


      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">Edit Itinerary</h1>
            <p className="text-sm text-muted-foreground">
              Make modifications and track cost impacts in real-time
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowComparison(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-smooth">

              <Icon name="ArrowsRightLeftIcon" size={18} />
              <span className="text-sm font-medium">Compare</span>
            </button>
            <button
              onClick={handlePreviewCustomerView}
              className="flex items-center space-x-2 px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-smooth">

              <Icon name="EyeIcon" size={18} />
              <span className="text-sm font-medium">Preview</span>
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges || isSaving}
              className="flex items-center space-x-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed">

              {isSaving ?
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  <span className="text-sm">Saving...</span>
                </> :

                <>
                  <Icon name="CheckIcon" size={18} />
                  <span className="text-sm">Save Changes</span>
                </>
              }
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timeline Editor */}
          <div className="lg:col-span-2 space-y-6">
            <ItineraryTimeline
              itinerary={itinerary}
              onActivityEdit={handleActivityEdit}
              onActivityDelete={handleActivityDelete}
              onActivityReorder={handleActivityReorder}
              onTimeAdjust={handleTimeAdjust} />


            {/* Quick Actions */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setShowActivityLibrary(true)}
                  className="flex flex-col items-center space-y-2 p-3 rounded-md bg-muted hover:bg-muted/80 transition-smooth">

                  <Icon name="PlusCircleIcon" size={24} className="text-primary" />
                  <span className="text-xs font-medium text-foreground">Add Activity</span>
                </button>
                <button className="flex flex-col items-center space-y-2 p-3 rounded-md bg-muted hover:bg-muted/80 transition-smooth">
                  <Icon name="ArrowPathIcon" size={24} className="text-primary" />
                  <span className="text-xs font-medium text-foreground">Optimize Route</span>
                </button>
                <button className="flex flex-col items-center space-y-2 p-3 rounded-md bg-muted hover:bg-muted/80 transition-smooth">
                  <Icon name="ClockIcon" size={24} className="text-primary" />
                  <span className="text-xs font-medium text-foreground">Adjust Times</span>
                </button>
                <button className="flex flex-col items-center space-y-2 p-3 rounded-md bg-muted hover:bg-muted/80 transition-smooth">
                  <Icon name="DocumentDuplicateIcon" size={24} className="text-primary" />
                  <span className="text-xs font-medium text-foreground">Duplicate Day</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cost Analysis Sidebar */}
          <div className="space-y-6">
            <CostAnalysisPanel
              originalCost={originalCost}
              modifiedCost={modifiedCost}
              breakdown={costBreakdown}
              marginAnalysis={marginAnalysis} />


            {/* Send to Customer */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Send Updated Itinerary</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Review all changes and send the updated itinerary to the customer for approval.
              </p>
              <button
                onClick={handleSendUpdatedItinerary}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md bg-success text-success-foreground font-medium hover:bg-success/90 transition-smooth">

                <Icon name="PaperAirplaneIcon" size={18} />
                <span>Send to Customer</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Activity Library Modal */}
      {showActivityLibrary &&
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card rounded-lg shadow-elevation-4 w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Activity Library</h2>
              <button
                onClick={() => setShowActivityLibrary(false)}
                className="p-2 rounded-md hover:bg-muted transition-smooth">

                <Icon name="XMarkIcon" size={24} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ActivityLibrary onActivitySelect={handleActivitySelect} />
            </div>
          </div>
        </div>
      }

      {/* Comparison View Modal */}
      {showComparison &&
        <ComparisonView
          comparison={comparisonData}
          onClose={() => setShowComparison(false)} />

      }
    </div>);

};

export default EditorInteractive;