'use client';

import { useState, useEffect } from 'react';
import TripSummaryCard from './TripSummaryCard';
import DayTimelineCard from './DayTimelineCard';
import ChangeRequestInput from './ChangeRequestInput';
import CostDeltaIndicator from './CostDeltaIndicator';
import ChangeHistoryPanel from './ChangeHistoryPanel';
import ActionButtons from './ActionButtons';

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
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCostDelta, setShowCostDelta] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const tripSummary: TripSummaryData = {
    destination: "Yosemite National Park, California",
    startDate: "03/15/2026",
    endDate: "03/19/2026",
    duration: 5,
    totalCost: 4850.00,
    groupSize: {
      adults: 2,
      children: 1,
      seniors: 0
    },
    status: 'in-review'
  };

  const [currentTotalCost, setCurrentTotalCost] = useState(tripSummary.totalCost);
  const [previousTotalCost, setPreviousTotalCost] = useState(tripSummary.totalCost);

  const itineraryDays: DayItinerary[] = [
  {
    dayNumber: 1,
    date: "Monday, March 15, 2026",
    totalDayCost: 980.00,
    activities: [
    {
      id: "d1a1",
      time: "09:00 AM",
      title: "Arrival & Check-in at Yosemite Valley Lodge",
      location: "Yosemite Valley Lodge, Yosemite Village",
      description: "Check into your accommodation and settle in. The lodge offers stunning views of Yosemite Falls and easy access to valley attractions.",
      duration: "1.5 hours",
      cost: 320.00,
      image: "https://images.unsplash.com/photo-1730423965144-62014e08dbeb",
      alt: "Rustic wooden lodge building with stone chimney surrounded by tall pine trees in mountain valley",
      isMustVisit: false,
      travelTime: "15 min walk",
      highlights: ["Valley views", "Near shuttle stops", "Restaurant on-site"]
    },
    {
      id: "d1a2",
      time: "11:00 AM",
      title: "Yosemite Valley Visitor Center",
      location: "Yosemite Valley Visitor Center, Yosemite Village",
      description: "Orient yourself with park maps, exhibits, and ranger recommendations. Learn about the park's geology, wildlife, and history through interactive displays.",
      duration: "1 hour",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1589004264768-3c3a7791dcc4",
      alt: "Modern visitor center building with large glass windows displaying nature exhibits and information boards",
      isMustVisit: false,
      travelTime: "5 min shuttle",
      highlights: ["Free admission", "Park orientation", "Ranger talks"]
    },
    {
      id: "d1a3",
      time: "01:00 PM",
      title: "Lunch at Degnan's Kitchen",
      location: "Degnan's Kitchen, Yosemite Village",
      description: "Casual dining with sandwiches, salads, and pizza. Family-friendly atmosphere with quick service perfect for refueling before afternoon adventures.",
      duration: "1 hour",
      cost: 85.00,
      image: "https://images.unsplash.com/photo-1645683977398-0df870a29c80",
      alt: "Outdoor cafe seating area with wooden tables and umbrellas surrounded by forest setting",
      isMustVisit: false,
      travelTime: "10 min walk",
      highlights: ["Quick service", "Outdoor seating", "Kid-friendly menu"]
    },
    {
      id: "d1a4",
      time: "02:30 PM",
      title: "Lower Yosemite Fall Trail",
      location: "Lower Yosemite Fall Trailhead, Yosemite Valley",
      description: "Easy 1-mile loop trail offering spectacular views of North America's tallest waterfall. Wheelchair accessible with paved paths and viewing platforms.",
      duration: "1.5 hours",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1692642156885-93a8ae4ce905",
      alt: "Massive waterfall cascading down granite cliff face with mist creating rainbow in sunlight",
      isMustVisit: true,
      travelTime: "20 min walk",
      highlights: ["Wheelchair accessible", "Waterfall views", "Photography spot"]
    },
    {
      id: "d1a5",
      time: "06:00 PM",
      title: "Dinner at The Ahwahnee Dining Room",
      location: "The Ahwahnee Hotel, Yosemite Valley",
      description: "Fine dining experience in a historic setting with floor-to-ceiling windows overlooking the valley. Features seasonal California cuisine with locally sourced ingredients.",
      duration: "2 hours",
      cost: 575.00,
      image: "https://images.unsplash.com/photo-1711906455635-94a977cb8f2c",
      alt: "Elegant dining room with high wooden beam ceilings, large windows, and white tablecloth tables",
      isMustVisit: false,
      highlights: ["Historic venue", "Fine dining", "Valley views"]
    }]

  },
  {
    dayNumber: 2,
    date: "Tuesday, March 16, 2026",
    totalDayCost: 1120.00,
    activities: [
    {
      id: "d2a1",
      time: "07:00 AM",
      title: "Sunrise at Tunnel View",
      location: "Tunnel View, Wawona Road",
      description: "Iconic viewpoint offering panoramic vistas of El Capitan, Half Dome, and Bridalveil Fall. Best visited at sunrise for dramatic lighting and fewer crowds.",
      duration: "1 hour",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1603805260929-4aff56bfc550",
      alt: "Panoramic mountain valley view at sunrise with granite cliffs and waterfall visible through morning mist",
      isMustVisit: true,
      travelTime: "25 min drive",
      highlights: ["Sunrise views", "Photography", "Iconic vista"]
    },
    {
      id: "d2a2",
      time: "09:00 AM",
      title: "Glacier Point Road Scenic Drive",
      location: "Glacier Point Road",
      description: "Scenic 16-mile drive with multiple pullouts offering spectacular valley views. Stop at Washburn Point and Glacier Point for breathtaking panoramas.",
      duration: "2 hours",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1731845811106-2e8a0637ff7c",
      alt: "Winding mountain road through pine forest with granite peaks visible in distance",
      isMustVisit: false,
      travelTime: "Continuous drive",
      highlights: ["Scenic pullouts", "Multiple viewpoints", "Photo opportunities"]
    },
    {
      id: "d2a3",
      time: "12:00 PM",
      title: "Picnic Lunch at Glacier Point",
      location: "Glacier Point",
      description: "Enjoy packed lunch at 7,214 feet elevation with unobstructed views of Half Dome, Yosemite Valley, and High Sierra peaks. Picnic tables available.",
      duration: "1 hour",
      cost: 65.00,
      image: "https://images.unsplash.com/photo-1657873961975-75bfbe1a26a3",
      alt: "Wooden picnic table on mountain overlook with expansive valley and mountain range views",
      isMustVisit: false,
      travelTime: "At location",
      highlights: ["Panoramic views", "Outdoor dining", "High elevation"]
    },
    {
      id: "d2a4",
      time: "02:00 PM",
      title: "Mariposa Grove of Giant Sequoias",
      location: "Mariposa Grove, South Entrance",
      description: "Walk among ancient giant sequoias including the famous Grizzly Giant and California Tunnel Tree. Easy trails with interpretive signs explaining sequoia ecology.",
      duration: "3 hours",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1611207365619-091ba83348d0",
      alt: "Massive ancient sequoia tree trunk with person standing at base showing enormous scale",
      isMustVisit: true,
      travelTime: "1 hour drive",
      highlights: ["Giant sequoias", "Ancient trees", "Nature trails"]
    },
    {
      id: "d2a5",
      time: "07:00 PM",
      title: "Dinner at Wawona Hotel Dining Room",
      location: "Wawona Hotel, Wawona",
      description: "Historic hotel dining room serving American cuisine in Victorian-era setting. Seasonal menu featuring local ingredients and classic preparations.",
      duration: "1.5 hours",
      cost: 455.00,
      image: "https://images.unsplash.com/photo-1673663096530-f34ca2255ff1",
      alt: "Victorian-style dining room with white tablecloths, antique chandeliers, and period furniture",
      isMustVisit: false,
      highlights: ["Historic setting", "American cuisine", "Victorian ambiance"]
    },
    {
      id: "d2a6",
      time: "09:00 PM",
      title: "Stargazing at Glacier Point",
      location: "Glacier Point",
      description: "Experience world-class stargazing from one of the best dark sky locations in California. Rangers often provide telescope viewing and constellation talks.",
      duration: "1.5 hours",
      cost: 600.00,
      image: "https://images.unsplash.com/photo-1723403815625-80568407b776",
      alt: "Night sky filled with countless stars and Milky Way visible above dark mountain silhouette",
      isMustVisit: false,
      highlights: ["Dark sky viewing", "Ranger programs", "Milky Way visible"]
    }]

  },
  {
    dayNumber: 3,
    date: "Wednesday, March 17, 2026",
    totalDayCost: 890.00,
    activities: [
    {
      id: "d3a1",
      time: "08:00 AM",
      title: "Mirror Lake Trail",
      location: "Mirror Lake Trailhead, Yosemite Valley",
      description: "Moderate 5-mile loop trail around seasonal Mirror Lake with reflections of Half Dome and surrounding cliffs. Best in spring when water levels are high.",
      duration: "3 hours",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1690945190962-b20f65ab3367",
      alt: "Calm lake surface perfectly reflecting towering granite cliff and pine trees in crystal clear water",
      isMustVisit: true,
      travelTime: "15 min shuttle",
      highlights: ["Reflection views", "Moderate hike", "Half Dome views"]
    },
    {
      id: "d3a2",
      time: "12:00 PM",
      title: "Lunch at Curry Village Pavilion",
      location: "Curry Village, Yosemite Valley",
      description: "Buffet-style dining with variety of hot and cold options. Outdoor seating with views of Glacier Point and Half Dome. Family-friendly atmosphere.",
      duration: "1 hour",
      cost: 95.00,
      image: "https://images.unsplash.com/photo-1708940354035-7592737c5b52",
      alt: "Outdoor pavilion dining area with wooden benches and mountain views in background",
      isMustVisit: false,
      travelTime: "10 min shuttle",
      highlights: ["Buffet options", "Outdoor seating", "Mountain views"]
    },
    {
      id: "d3a3",
      time: "02:00 PM",
      title: "Valley View Trail & Beach",
      location: "Valley View, Yosemite Valley",
      description: "Short walk to scenic viewpoint and sandy beach area along Merced River. Perfect for relaxation, wading, and photography of El Capitan and Cathedral Rocks.",
      duration: "2 hours",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1721697311616-d6bfe134f51a",
      alt: "Sandy riverbank with clear flowing water and massive granite cliff walls in background",
      isMustVisit: false,
      travelTime: "20 min shuttle",
      highlights: ["River access", "Beach area", "El Capitan views"]
    },
    {
      id: "d3a4",
      time: "05:00 PM",
      title: "Yosemite Museum & Ansel Adams Gallery",
      location: "Yosemite Museum, Yosemite Village",
      description: "Explore Native American cultural exhibits and view iconic Ansel Adams photographs. Free admission with rotating exhibits and educational programs.",
      duration: "1.5 hours",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1714309571261-6332d46cb147",
      alt: "Museum gallery interior with framed black and white landscape photographs on white walls",
      isMustVisit: false,
      travelTime: "5 min walk",
      highlights: ["Free admission", "Cultural exhibits", "Photography gallery"]
    },
    {
      id: "d3a5",
      time: "07:00 PM",
      title: "Dinner at Mountain Room Restaurant",
      location: "Yosemite Valley Lodge, Yosemite Village",
      description: "Upscale casual dining with floor-to-ceiling windows overlooking Yosemite Falls. Menu features steaks, seafood, and California wine selection.",
      duration: "2 hours",
      cost: 495.00,
      image: "https://images.unsplash.com/photo-1668457891048-e13ffdf9c9bc",
      alt: "Modern restaurant interior with large windows showing waterfall view and contemporary table settings",
      isMustVisit: false,
      highlights: ["Waterfall views", "Upscale dining", "Wine selection"]
    },
    {
      id: "d3a6",
      time: "09:00 PM",
      title: "Evening Ranger Program",
      location: "Yosemite Valley Amphitheater",
      description: "Free educational program led by park rangers covering topics like wildlife, geology, and park history. Family-friendly presentations with Q&A sessions.",
      duration: "1 hour",
      cost: 300.00,
      image: "https://images.unsplash.com/photo-1733158576496-1956bda86329",
      alt: "Outdoor amphitheater with wooden benches facing presentation area under evening sky",
      isMustVisit: false,
      highlights: ["Free program", "Educational", "Family-friendly"]
    }]

  },
  {
    dayNumber: 4,
    date: "Thursday, March 18, 2026",
    totalDayCost: 950.00,
    activities: [
    {
      id: "d4a1",
      time: "07:30 AM",
      title: "Vernal Fall via Mist Trail",
      location: "Mist Trail Trailhead, Happy Isles",
      description: "Challenging 5.4-mile round trip hike to 317-foot Vernal Fall. Steep granite stairs with spectacular waterfall views. Expect to get wet from mist in spring.",
      duration: "4 hours",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1708082227645-301bb5001f68",
      alt: "Powerful waterfall plunging over granite cliff with hikers on stone steps visible through mist",
      isMustVisit: true,
      travelTime: "15 min shuttle",
      highlights: ["Challenging hike", "Waterfall views", "Granite stairs"]
    },
    {
      id: "d4a2",
      time: "12:30 PM",
      title: "Lunch at Half Dome Village Pavilion",
      location: "Half Dome Village, Yosemite Valley",
      description: "Quick-service dining with pizza, burgers, and salads. Convenient location near trailheads with outdoor seating and mountain views.",
      duration: "1 hour",
      cost: 75.00,
      image: "https://images.unsplash.com/photo-1635350644510-73413001e899",
      alt: "Casual outdoor dining pavilion with picnic tables and mountain backdrop",
      isMustVisit: false,
      travelTime: "5 min walk",
      highlights: ["Quick service", "Convenient location", "Outdoor seating"]
    },
    {
      id: "d4a3",
      time: "02:00 PM",
      title: "Bridalveil Fall",
      location: "Bridalveil Fall Parking Area, Wawona Road",
      description: "Short 0.5-mile walk to base of 620-foot waterfall. Wheelchair accessible paved trail with viewing area. Heaviest flow in spring with dramatic wind-blown spray.",
      duration: "1 hour",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1655664333691-4f344bcfe814",
      alt: "Tall narrow waterfall dropping from cliff face with wind blowing spray creating ethereal effect",
      isMustVisit: true,
      travelTime: "15 min drive",
      highlights: ["Short walk", "Accessible", "Dramatic views"]
    },
    {
      id: "d4a4",
      time: "04:00 PM",
      title: "El Capitan Meadow",
      location: "El Capitan Meadow, Northside Drive",
      description: "Relaxing meadow walk with unobstructed views of El Capitan's 3,000-foot granite face. Watch rock climbers through provided telescopes. Perfect for sunset.",
      duration: "1.5 hours",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1705736466811-cdd43910dc76",
      alt: "Open grassy meadow with massive vertical granite cliff wall rising in background",
      isMustVisit: false,
      travelTime: "10 min drive",
      highlights: ["Climber watching", "Sunset views", "Easy walk"]
    },
    {
      id: "d4a5",
      time: "07:00 PM",
      title: "Farewell Dinner at The Ahwahnee Bar",
      location: "The Ahwahnee Hotel, Yosemite Valley",
      description: "Casual bar dining with craft cocktails and small plates. Historic setting with Native American decor and cozy fireplace. Lighter alternative to main dining room.",
      duration: "2 hours",
      cost: 475.00,
      image: "https://images.unsplash.com/photo-1689976601112-fb77c872d128",
      alt: "Rustic bar interior with stone fireplace, wooden beams, and Native American artwork on walls",
      isMustVisit: false,
      highlights: ["Historic bar", "Craft cocktails", "Cozy atmosphere"]
    },
    {
      id: "d4a6",
      time: "09:30 PM",
      title: "Night Photography at Valley View",
      location: "Valley View, Yosemite Valley",
      description: "Capture stunning night photos of El Capitan and Cathedral Rocks under starlight. Bring tripod for long exposures. Minimal light pollution for clear shots.",
      duration: "1.5 hours",
      cost: 400.00,
      image: "https://images.unsplash.com/photo-1601408186180-291d12d27619",
      alt: "Night landscape with granite cliffs silhouetted against star-filled sky and Milky Way visible",
      isMustVisit: false,
      highlights: ["Night photography", "Star trails", "Minimal crowds"]
    }]

  },
  {
    dayNumber: 5,
    date: "Friday, March 19, 2026",
    totalDayCost: 910.00,
    activities: [
    {
      id: "d5a1",
      time: "08:00 AM",
      title: "Breakfast at Degnan's Deli",
      location: "Degnan's Deli, Yosemite Village",
      description: "Quick breakfast with fresh pastries, coffee, and breakfast sandwiches. Grab-and-go options perfect for early departure preparation.",
      duration: "45 minutes",
      cost: 55.00,
      image: "https://images.unsplash.com/photo-1724668639673-35461076a746",
      alt: "Cozy deli interior with display case of fresh pastries and coffee bar",
      isMustVisit: false,
      travelTime: "5 min walk",
      highlights: ["Quick service", "Fresh pastries", "Grab-and-go"]
    },
    {
      id: "d5a2",
      time: "09:00 AM",
      title: "Cook's Meadow Loop",
      location: "Cook's Meadow, Yosemite Valley",
      description: "Easy 1-mile loop through meadow with views of Half Dome, Glacier Point, and Sentinel Rock. Wheelchair accessible with interpretive signs about meadow ecology.",
      duration: "1 hour",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1721697302051-3948312a032b",
      alt: "Flat meadow trail with wildflowers and granite domes visible across open grassland",
      isMustVisit: false,
      travelTime: "10 min walk",
      highlights: ["Easy loop", "Accessible", "Meadow views"]
    },
    {
      id: "d5a3",
      time: "10:30 AM",
      title: "Yosemite Valley Chapel",
      location: "Yosemite Valley Chapel, Southside Drive",
      description: "Visit California's oldest structure still in use, built in 1879. Beautiful wooden chapel with stained glass windows and peaceful garden setting.",
      duration: "30 minutes",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1728939862879-a1f788974d2c",
      alt: "Small white wooden chapel with steeple surrounded by tall pine trees in forest clearing",
      isMustVisit: false,
      travelTime: "5 min drive",
      highlights: ["Historic building", "Peaceful setting", "Architecture"]
    },
    {
      id: "d5a4",
      time: "11:30 AM",
      title: "Check-out & Souvenir Shopping",
      location: "Yosemite Valley Lodge & Village Store",
      description: "Check out of accommodation and browse Yosemite-themed souvenirs, books, and outdoor gear. Pick up last-minute gifts and mementos.",
      duration: "1.5 hours",
      cost: 180.00,
      image: "https://images.unsplash.com/photo-1641810780576-bedc599529f7",
      alt: "Gift shop interior with shelves of souvenirs, books, and outdoor merchandise",
      isMustVisit: false,
      travelTime: "At location",
      highlights: ["Souvenir shopping", "Gift items", "Books & gear"]
    },
    {
      id: "d5a5",
      time: "01:00 PM",
      title: "Departure Lunch at Yosemite Valley Lodge Food Court",
      location: "Yosemite Valley Lodge, Yosemite Village",
      description: "Final meal with multiple food stations offering variety of cuisines. Quick service perfect for departure day with takeout options available.",
      duration: "1 hour",
      cost: 75.00,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_12e829c5a-1766141825897.png",
      alt: "Modern food court with multiple service counters and casual seating area",
      isMustVisit: false,
      travelTime: "At location",
      highlights: ["Multiple options", "Quick service", "Takeout available"]
    },
    {
      id: "d5a6",
      time: "02:30 PM",
      title: "Departure via Tunnel View",
      location: "Tunnel View, Wawona Road",
      description: "Final stop at iconic Tunnel View for last photos and memories. Perfect farewell to Yosemite with panoramic valley vista before heading home.",
      duration: "30 minutes",
      cost: 0.00,
      image: "https://images.unsplash.com/photo-1603805260929-4aff56bfc550",
      alt: "Panoramic valley overlook with granite cliffs, waterfall, and forest visible in afternoon light",
      isMustVisit: true,
      travelTime: "15 min drive",
      highlights: ["Final photos", "Panoramic views", "Memorable farewell"]
    }]

  }];


  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([
  {
    id: "ch1",
    timestamp: "01/15/2026 02:30 PM",
    request: "Replace the museum visit on Day 3 with more outdoor activities",
    status: 'accepted',
    costImpact: -50.00
  },
  {
    id: "ch2",
    timestamp: "01/16/2026 10:15 AM",
    request: "Add stargazing activity on Day 2",
    status: 'accepted',
    costImpact: 600.00
  }]
  );

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

  const handleSubmitChange = (request: string) => {
    if (!isHydrated) return;

    setIsProcessing(true);

    setTimeout(() => {
      const newChange: ChangeHistoryItem = {
        id: `ch${changeHistory.length + 1}`,
        timestamp: new Date().toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        request,
        status: 'pending',
        costImpact: Math.random() > 0.5 ? Math.floor(Math.random() * 500) : -Math.floor(Math.random() * 300)
      };

      setChangeHistory((prev) => [...prev, newChange]);
      setPreviousTotalCost(currentTotalCost);
      setCurrentTotalCost((prev) => prev + newChange.costImpact);
      setShowCostDelta(true);
      setHasChanges(true);
      setIsProcessing(false);
    }, 2000);
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
          <TripSummaryCard tripData={tripSummary} />

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