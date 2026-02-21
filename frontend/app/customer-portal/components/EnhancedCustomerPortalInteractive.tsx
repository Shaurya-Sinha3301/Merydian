'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FamilyMemberCard from './FamilyMemberCard';
import EnhancedTripCard from './EnhancedTripCard';
import PlanTripModal from './PlanTripModal';
import EnhancedAgentChatModal from './EnhancedAgentChatModal';
import activeGroupsData from '@/lib/agent-dashboard/data/active_groups.json';
import upcomingGroupsData from '@/lib/agent-dashboard/data/upcoming_groups.json';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  age: number;
  gender: string;
  passport_number: string;
}

interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming';
  groupName: string;
  thumbnail: string;
}

const EnhancedCustomerPortalInteractive = () => {
  const router = useRouter();
  const [showPlanTripModal, setShowPlanTripModal] = useState(false);
  const [showAgentChatModal, setShowAgentChatModal] = useState(false);
  const [showFamilyMembers, setShowFamilyMembers] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [familyName, setFamilyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const handleViewItinerary = (tripId: string) => {
    router.push(`/customer-itinerary/${tripId}`);
  };

  const handleViewBooking = (bookingId: string) => {
    router.push(`/customer-bookings?highlight=${bookingId}`);
  };

  useEffect(() => {
    const familyId = sessionStorage.getItem('familyId');
    
    if (!familyId) {
      router.push('/customer-login');
      return;
    }

    let foundFamily: any = null;
    let foundGroups: Trip[] = [];
    const familyGroupMap: { [key: string]: string } = {};

    activeGroupsData.groups.forEach((group: any) => {
      const family = group.families.find((f: any) => f.id === familyId);
      if (family) {
        foundFamily = family;
        const tripId = group.id;
        familyGroupMap[tripId] = group.id;
        foundGroups.push({
          id: tripId,
          destination: group.current_location,
          startDate: group.start_date,
          endDate: group.end_date,
          status: 'active' as const,
          groupName: group.group_name,
          thumbnail: getThumbnailForDestination(group.current_location)
        });
      }
    });

    upcomingGroupsData.groups.forEach((group: any) => {
      const family = group.families.find((f: any) => f.id === familyId);
      if (family) {
        if (!foundFamily) foundFamily = family;
        const tripId = group.id;
        familyGroupMap[tripId] = group.id;
        foundGroups.push({
          id: tripId,
          destination: group.current_location === 'Not Started' ? group.group_name : group.current_location,
          startDate: group.start_date,
          endDate: group.end_date,
          status: 'upcoming' as const,
          groupName: group.group_name,
          thumbnail: getThumbnailForDestination(group.group_name)
        });
      }
    });

    if (!foundFamily) {
      router.push('/customer-login');
      return;
    }

    sessionStorage.setItem('familyGroupMap', JSON.stringify(familyGroupMap));

    setFamilyName(foundFamily.family_name);
    setFamilyMembers(foundFamily.members);
    setTrips(foundGroups);
    setIsLoading(false);
  }, [router]);

  const getThumbnailForDestination = (destination: string): string => {
    const thumbnails: { [key: string]: string } = {
      'Goa': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2',
      'Manali': 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23',
      'Kerala': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944',
      'Alleppey': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944',
      'Rajasthan': 'https://images.unsplash.com/photo-1477587458883-47145ed94245',
      'Shimla': 'https://images.unsplash.com/photo-1605649487212-47bdab064df7',
      'Andaman': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19'
    };

    for (const key in thumbnails) {
      if (destination.includes(key)) {
        return thumbnails[key];
      }
    }
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800';
  };

  const handleLogout = () => {
    sessionStorage.removeItem('familyId');
    router.push('/customer-login');
  };

  // Get hero image from active trip or default
  const getHeroImage = () => {
    const activeTrip = trips.find(t => t.status === 'active');
    return activeTrip?.thumbnail || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* HERO HEADER - Full Width Destination Image */}
      <div className="relative h-[400px] overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${getHeroImage()})` }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80"></div>
        </div>

        {/* Floating Glass Navigation */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Top Bar */}
          <div className="p-6">
            <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
              <button
                onClick={() => router.push('/customer-bookings')}
                className="px-4 py-2 bg-white/95 backdrop-blur-sm text-gray-900 rounded-xl font-medium hover:bg-white transition-all flex items-center gap-2 shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                  <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                </svg>
                <span>My Bookings</span>
              </button>
              <button
                onClick={() => setShowAgentChatModal(true)}
                className="px-4 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-teal-500/50"
              >
                <div className="relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {/* AI Pulse Indicator */}
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                </div>
                <span>AI Assistant</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium hover:bg-white/30 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="flex-1 flex items-end pb-12">
            <div className="max-w-7xl mx-auto px-6 w-full">
              <div className="text-white">
                <h1 className="text-5xl font-bold mb-3 drop-shadow-lg">{familyName}</h1>
                <p className="text-xl text-white/90 mb-6 drop-shadow">Your personalized travel experience</p>
                
                {/* Quick Stats - Floating Glass Cards */}
                <div className="flex gap-4 flex-wrap">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20">
                    <div className="text-3xl font-bold">{trips.length}</div>
                    <div className="text-sm text-white/80">Active Trips</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20">
                    <div className="text-3xl font-bold">{familyMembers.length}</div>
                    <div className="text-sm text-white/80">Travelers</div>
                  </div>
                  <button
                    onClick={() => setShowPlanTripModal(true)}
                    className="bg-teal-500 hover:bg-teal-600 rounded-2xl px-6 py-3 font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-teal-500/50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Plan New Trip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="bg-gradient-to-br from-gray-50 to-teal-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Family Members Section */}
          <section className="mb-12">
            <button
              onClick={() => setShowFamilyMembers(!showFamilyMembers)}
              className="flex items-center gap-3 px-6 py-4 bg-white rounded-2xl hover:shadow-lg transition-all group border-2 border-transparent hover:border-teal-500"
            >
              <svg 
                className={`w-6 h-6 text-teal-500 transition-transform ${showFamilyMembers ? 'rotate-180' : ''}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              <span className="text-xl font-bold text-gray-900">
                {showFamilyMembers ? 'Family Members' : 'View Family Members'}
              </span>
              <span className="px-3 py-1 bg-teal-100 text-teal-700 text-sm font-bold rounded-full">
                {familyMembers.length}
              </span>
            </button>
            
            {showFamilyMembers && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 animate-fade-in">
                {familyMembers.map((member) => (
                  <FamilyMemberCard key={member.id} member={member} />
                ))}
              </div>
            )}
          </section>

          {/* Trips Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Your Journeys</h2>
            </div>

            {trips.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl shadow-lg">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No trips yet</h3>
                <p className="text-gray-600 mb-6">Start planning your next adventure!</p>
                <button
                  onClick={() => setShowPlanTripModal(true)}
                  className="px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-all inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Plan Your First Trip</span>
                </button>
              </div>
            ) : (
              <>
                {/* Active Trips */}
                {trips.filter((trip) => trip.status === 'active').length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <h3 className="text-xl font-bold text-gray-900">Active Adventures</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {trips
                        .filter((trip) => trip.status === 'active')
                        .map((trip) => (
                          <EnhancedTripCard
                            key={trip.id}
                            trip={trip}
                            onViewItinerary={() => handleViewItinerary(trip.id)}
                            onViewBooking={handleViewBooking}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Trips */}
                {trips.filter((trip) => trip.status === 'upcoming').length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <svg className="w-6 h-6 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                      </svg>
                      <h3 className="text-xl font-bold text-gray-900">Upcoming Journeys</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {trips
                        .filter((trip) => trip.status === 'upcoming')
                        .map((trip) => (
                          <EnhancedTripCard
                            key={trip.id}
                            trip={trip}
                            onViewItinerary={() => handleViewItinerary(trip.id)}
                            onViewBooking={handleViewBooking}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Modals */}
      {showPlanTripModal && (
        <PlanTripModal onClose={() => setShowPlanTripModal(false)} />
      )}

      {showAgentChatModal && (
        <EnhancedAgentChatModal onClose={() => setShowAgentChatModal(false)} />
      )}
    </>
  );
};

export default EnhancedCustomerPortalInteractive;
