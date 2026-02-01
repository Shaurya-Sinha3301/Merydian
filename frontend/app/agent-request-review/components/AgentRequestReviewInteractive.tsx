'use client';

import { useState, useEffect } from 'react';
import CustomerContextPanel from './CustomerContextPanel';
import DayTimeline from './DayTimeline';
import CostBreakdownPanel from './CostBreakdownPanel';
import ComparisonView from './ComparisonView';
import Icon from '@/components/ui/AppIcon';

interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  duration: string;
  cost: number;
  travelTime: string;
  confidenceScore: number;
  constraintFlags: string[];
  image: string;
  alt: string;
  category: 'attraction' | 'meal' | 'transport' | 'accommodation';
}

interface DayData {
  day: number;
  date: string;
  activities: Activity[];
  totalCost: number;
  totalDuration: string;
}

interface GroupMember {
  id: string;
  name: string;
  age: number;
  type: 'adult' | 'child' | 'senior';
  interests: string[];
  constraints: string[];
  image: string;
  alt: string;
}

interface CustomerInfo {
  requestId: string;
  customerName: string;
  email: string;
  phone: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetRange: string;
  groupSize: number;
  groupMembers: GroupMember[];
  mustVisit: string[];
  placesToAvoid: string[];
  specialRequirements: string[];
  submittedDate: string;
}

interface CostItem {
  category: string;
  original: number;
  modified: number;
  delta: number;
}

interface MarginData {
  totalCost: number;
  companyCut: number;
  agentCut: number;
  customerPrice: number;
  marginPercentage: number;
}

interface DayComparison {
  day: number;
  date: string;
  original: Activity[];
  modified: Activity[];
  costDelta: number;
}

const AgentRequestReviewInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [modifiedActivityIds, setModifiedActivityIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'send' | 'alternative' | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const mockCustomerInfo: CustomerInfo = {
    requestId: "TR-2026-0142",
    customerName: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    destination: "Paris, France",
    startDate: "03/15/2026",
    endDate: "03/22/2026",
    budgetRange: "$3,500 - $5,000",
    groupSize: 4,
    groupMembers: [
    {
      id: "m1",
      name: "Sarah Johnson",
      age: 38,
      type: "adult",
      interests: ["Art", "History", "Fine Dining"],
      constraints: ["Vegetarian diet"],
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_116022a91-1763299783599.png",
      alt: "Professional woman with brown hair in business casual attire smiling at camera"
    },
    {
      id: "m2",
      name: "Michael Johnson",
      age: 42,
      type: "adult",
      interests: ["Architecture", "Photography", "Wine Tasting"],
      constraints: [],
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_179c61d55-1763294391157.png",
      alt: "Middle-aged man with short dark hair wearing blue shirt outdoors"
    },
    {
      id: "m3",
      name: "Emma Johnson",
      age: 12,
      type: "child",
      interests: ["Museums", "Parks", "Ice Cream"],
      constraints: ["Limited walking distance"],
      image: "https://images.unsplash.com/photo-1673999707565-8bb553c9765b",
      alt: "Young girl with blonde hair smiling in casual clothing"
    },
    {
      id: "m4",
      name: "Robert Johnson Sr.",
      age: 68,
      type: "senior",
      interests: ["Gardens", "Cafes", "River Cruises"],
      constraints: ["Mobility issues", "Requires frequent rest"],
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_12355a758-1763292077598.png",
      alt: "Senior man with gray hair and glasses wearing casual sweater"
    }],

    mustVisit: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral", "Versailles Palace"],
    placesToAvoid: ["Crowded nightclubs", "Extreme adventure activities"],
    specialRequirements: [
    "Wheelchair accessible venues for grandfather",
    "Vegetarian meal options required",
    "Child-friendly activities preferred",
    "Prefer morning activities due to senior member"],

    submittedDate: "01/15/2026"
  };

  const mockItinerary: DayData[] = [
  {
    day: 1,
    date: "Monday, March 15, 2026",
    activities: [
    {
      id: "a1",
      time: "09:00 AM",
      title: "Eiffel Tower Visit",
      description: "Skip-the-line access to the iconic Eiffel Tower with elevator to the second floor. Wheelchair accessible.",
      duration: "2.5 hours",
      cost: 180,
      travelTime: "30 min from hotel",
      confidenceScore: 95,
      constraintFlags: ["Must-visit location"],
      image: "https://images.unsplash.com/photo-1663935831493-8cc2295ffea4",
      alt: "Eiffel Tower standing tall against blue sky in Paris",
      category: "attraction"
    },
    {
      id: "a2",
      time: "12:00 PM",
      title: "Le Jardin Vegetarian Bistro",
      description: "Authentic French vegetarian cuisine in a charming garden setting. Family-friendly atmosphere.",
      duration: "1.5 hours",
      cost: 120,
      travelTime: "15 min walk",
      confidenceScore: 88,
      constraintFlags: ["Vegetarian requirement"],
      image: "https://images.unsplash.com/photo-1560130934-590b85fc08e7",
      alt: "Elegant French restaurant interior with white tablecloths and warm lighting",
      category: "meal"
    },
    {
      id: "a3",
      time: "02:30 PM",
      title: "Seine River Cruise",
      description: "Relaxing 1-hour cruise along the Seine with audio guide. Fully accessible with seating areas.",
      duration: "1 hour",
      cost: 80,
      travelTime: "10 min walk",
      confidenceScore: 92,
      constraintFlags: [],
      image: "https://images.unsplash.com/photo-1640640157296-d5fb4d8e403b",
      alt: "Tourist boat cruising on Seine River with Paris buildings in background",
      category: "attraction"
    },
    {
      id: "a4",
      time: "04:00 PM",
      title: "Hotel Rest Period",
      description: "Return to hotel for rest and refreshment. Recommended for senior member comfort.",
      duration: "2 hours",
      cost: 0,
      travelTime: "20 min taxi",
      confidenceScore: 85,
      constraintFlags: ["Senior rest requirement"],
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_14c1f62b9-1767642733449.png",
      alt: "Luxurious hotel room with comfortable bed and elegant furnishings",
      category: "accommodation"
    }],

    totalCost: 380,
    totalDuration: "7 hours"
  },
  {
    day: 2,
    date: "Tuesday, March 16, 2026",
    activities: [
    {
      id: "a5",
      time: "09:30 AM",
      title: "Louvre Museum",
      description: "Priority access to the world's largest art museum. Wheelchair rental available. Focus on main galleries.",
      duration: "3 hours",
      cost: 200,
      travelTime: "25 min taxi",
      confidenceScore: 94,
      constraintFlags: ["Must-visit location", "Limited walking"],
      image: "https://images.unsplash.com/photo-1601950355591-5099f042e4f9",
      alt: "Louvre Museum glass pyramid entrance with historic palace building behind",
      category: "attraction"
    },
    {
      id: "a6",
      time: "01:00 PM",
      title: "Cafe de Flore",
      description: "Historic Parisian cafe with vegetarian options. Outdoor seating available for people watching.",
      duration: "1.5 hours",
      cost: 100,
      travelTime: "15 min walk",
      confidenceScore: 87,
      constraintFlags: [],
      image: "https://images.unsplash.com/photo-1603020500697-1bf30af0d368",
      alt: "Classic Parisian cafe with red awning and outdoor seating on cobblestone street",
      category: "meal"
    },
    {
      id: "a7",
      time: "03:30 PM",
      title: "Luxembourg Gardens",
      description: "Beautiful public gardens with accessible paths. Perfect for leisurely stroll and children's playground.",
      duration: "2 hours",
      cost: 0,
      travelTime: "10 min walk",
      confidenceScore: 90,
      constraintFlags: [],
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_11d8cb33b-1768250139413.png",
      alt: "Luxembourg Gardens with manicured lawns, flower beds and palace in background",
      category: "attraction"
    }],

    totalCost: 300,
    totalDuration: "6.5 hours"
  }];


  const mockCostItems: CostItem[] = [
  { category: "Attractions", original: 460, modified: 460, delta: 0 },
  { category: "Meals", original: 220, modified: 220, delta: 0 },
  { category: "Transportation", original: 100, modified: 100, delta: 0 },
  { category: "Accommodation", original: 0, modified: 0, delta: 0 }];


  const mockOriginalMargin: MarginData = {
    totalCost: 780,
    companyCut: 15,
    agentCut: 10,
    customerPrice: 975,
    marginPercentage: 25
  };

  const mockModifiedMargin: MarginData = {
    totalCost: 780,
    companyCut: 15,
    agentCut: 10,
    customerPrice: 975,
    marginPercentage: 25
  };

  const mockComparisons: DayComparison[] = mockItinerary.map((day) => ({
    day: day.day,
    date: day.date,
    original: day.activities,
    modified: day.activities,
    costDelta: 0
  }));

  const handleActivityModify = (activityId: string) => {
    if (!isHydrated) return;
    setModifiedActivityIds((prev) =>
    prev.includes(activityId) ? prev : [...prev, activityId]
    );
  };

  const handleActivitySwap = (activityId: string) => {
    if (!isHydrated) return;
    console.log('Swap activity:', activityId);
  };

  const handleActivityRemove = (activityId: string) => {
    if (!isHydrated) return;
    setModifiedActivityIds((prev) =>
    prev.includes(activityId) ? prev : [...prev, activityId]
    );
  };

  const handleActionClick = (action: 'approve' | 'send' | 'alternative') => {
    if (!isHydrated) return;
    setSelectedAction(action);
    setShowApprovalModal(true);
  };

  const handleConfirmAction = () => {
    if (!isHydrated) return;
    console.log('Action confirmed:', selectedAction);
    setShowApprovalModal(false);
    setSelectedAction(null);
  };

  if (!isHydrated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading request details...</p>
        </div>
      </div>);

  }

  return (
    <>
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Customer Context Panel - Desktop */}
        <div className="hidden lg:block lg:w-80 xl:w-96 flex-shrink-0">
          <CustomerContextPanel customerInfo={mockCustomerInfo} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Mobile Customer Info Summary */}
            <div className="lg:hidden bg-card rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{mockCustomerInfo.customerName}</h2>
                  <p className="text-sm text-muted-foreground">{mockCustomerInfo.destination}</p>
                </div>
                <span className="data-text text-xs text-muted-foreground">#{mockCustomerInfo.requestId}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Icon name="UsersIcon" size={16} />
                  <span>{mockCustomerInfo.groupSize} travelers</span>
                </div>
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Icon name="CalendarIcon" size={16} />
                  <span>{mockCustomerInfo.startDate}</span>
                </div>
              </div>
            </div>

            {/* Status Banner */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Icon name="InformationCircleIcon" size={20} className="text-primary flex-shrink-0 mt-0.5" variant="solid" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground mb-1">System-Generated Base Itinerary</h3>
                  <p className="text-sm text-muted-foreground">
                    Review the AI-generated itinerary below. You can modify activities, adjust timings, or request alternative options before sending to the customer.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setShowComparison(true)}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-smooth">

                <Icon name="ArrowsRightLeftIcon" size={18} />
                <span>Compare Versions</span>
              </button>
              <button
                onClick={() => handleActionClick('alternative')}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/90 transition-smooth">

                <Icon name="SparklesIcon" size={18} />
                <span>Request Alternatives</span>
              </button>
            </div>

            {/* Cost Breakdown */}
            <CostBreakdownPanel
              costItems={mockCostItems}
              originalMargin={mockOriginalMargin}
              modifiedMargin={mockModifiedMargin}
              hasModifications={modifiedActivityIds.length > 0} />


            {/* Itinerary Timeline */}
            <div className="space-y-8">
              {mockItinerary.map((day) =>
              <DayTimeline
                key={day.day}
                dayData={day}
                modifiedActivityIds={modifiedActivityIds}
                onActivityModify={handleActivityModify}
                onActivitySwap={handleActivitySwap}
                onActivityRemove={handleActivityRemove} />

              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 z-50 bg-card border-t border-border shadow-elevation-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => handleActionClick('approve')}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-md bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-smooth">

              <Icon name="CheckCircleIcon" size={20} variant="solid" />
              <span>Approve as Generated</span>
            </button>
            <button
              onClick={() => handleActionClick('send')}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-smooth">

              <Icon name="PaperAirplaneIcon" size={20} variant="solid" />
              <span>Send Modified Version</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {showComparison &&
      <ComparisonView
        comparisons={mockComparisons}
        onClose={() => setShowComparison(false)} />

      }

      {/* Approval Confirmation Modal */}
      {showApprovalModal &&
      <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative bg-card rounded-lg shadow-elevation-4 max-w-md w-full p-6">
            <div className="flex items-start space-x-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
            selectedAction === 'approve' ? 'bg-success/10' :
            selectedAction === 'send' ? 'bg-primary/10' : 'bg-secondary/10'}`
            }>
                <Icon
                name={
                selectedAction === 'approve' ? 'CheckCircleIcon' :
                selectedAction === 'send' ? 'PaperAirplaneIcon' : 'SparklesIcon'
                }
                size={24}
                className={
                selectedAction === 'approve' ? 'text-success' :
                selectedAction === 'send' ? 'text-primary' : 'text-secondary'
                }
                variant="solid" />

              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {selectedAction === 'approve' && 'Approve Itinerary'}
                  {selectedAction === 'send' && 'Send Modified Itinerary'}
                  {selectedAction === 'alternative' && 'Request Alternatives'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedAction === 'approve' && 'This will approve the system-generated itinerary and send it to the customer for review.'}
                  {selectedAction === 'send' && 'This will send your modified version to the customer. All changes will be highlighted.'}
                  {selectedAction === 'alternative' && 'This will request the system to generate alternative options based on current constraints.'}
                </p>
                <div className="flex space-x-3">
                  <button
                  onClick={handleConfirmAction}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white transition-smooth ${
                  selectedAction === 'approve' ? 'bg-success hover:bg-success/90' :
                  selectedAction === 'send' ? 'bg-primary hover:bg-primary/90' : 'bg-secondary hover:bg-secondary/90'}`
                  }>

                    Confirm
                  </button>
                  <button
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-smooth">

                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </>);

};

export default AgentRequestReviewInteractive;