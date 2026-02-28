'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FamilyMemberCard from './FamilyMemberCard';
import TripCard from './TripCard';
import PlanTripModal from './PlanTripModal';
import AgentChatModal from './AgentChatModal';
import DetailedItineraryModal from './DetailedItineraryModal';
import upcomingGroupsData from '@/lib/agent-dashboard/data/upcoming_groups.json';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';

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

const CustomerPortalInteractive = () => {
  const router = useRouter();
  const [showPlanTripModal, setShowPlanTripModal] = useState(false);
  const [showAgentChatModal, setShowAgentChatModal] = useState(false);
  const [showFamilyMembers, setShowFamilyMembers] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const { user } = useAuth();
  const [familyName, setFamilyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const handleViewItinerary = (tripId: string) => {
    router.push(`/customer-itinerary/${tripId}`);
  };

  const handleViewBooking = (bookingId: string) => {
    // Navigate to bookings page with the specific booking highlighted
    router.push(`/customer-bookings?highlight=${bookingId}`);
  };

  useEffect(() => {
    if (!user || user.role !== 'traveller') {
      router.push('/customer-login');
      return;
    }

    const fetchTrips = async () => {
      try {
        const res = await apiClient.getCustomerTrips();
        const apiTrips = res.items || [];

        let foundFamily: any = null;
        let foundGroups: Trip[] = [];
        const familyGroupMap: { [key: string]: string } = {};

        // Parse frontend trips from backend api
        apiTrips.forEach((trip: any) => {
          if (!foundFamily) {
            foundFamily = { family_name: user.full_name || 'Your Family', members: [] };
          }
          foundGroups.push({
            id: trip.trip_id,
            destination: trip.destination || 'Unknown',
            startDate: trip.start_date || new Date().toISOString().split('T')[0],
            endDate: trip.end_date || new Date().toISOString().split('T')[0],
            status: 'upcoming' as const,
            groupName: trip.trip_name || trip.destination,
            thumbnail: getThumbnailForDestination(trip.destination || '')
          });
          familyGroupMap[trip.trip_id] = trip.trip_id;
        });

        if (!foundFamily) {
          // Provide an empty state if no trips are found yet
          foundFamily = { family_name: user.full_name || 'Your Family', members: [] };
        }

        sessionStorage.setItem('familyGroupMap', JSON.stringify(familyGroupMap));
        setFamilyName(foundFamily.family_name);
        setFamilyMembers(foundFamily.members || []);
        setTrips(foundGroups);
      } catch (err) {
        console.error("Failed to load customer trips", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrips();
  }, [user, router]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#212121] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#212121]/60">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-[#212121] text-[#FDFDFF] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{familyName}</h1>
              <p className="text-[#FDFDFF]/70 mt-1">Welcome to your family portal</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/customer-bookings')}
                className="px-4 py-2 bg-[#FDFDFF] text-[#212121] rounded-lg font-medium hover:bg-[#EDEDED] transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                  <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                <span>My Bookings</span>
              </button>
              <button
                onClick={() => setShowAgentChatModal(true)}
                className="px-4 py-2 bg-[#FDFDFF] text-[#212121] rounded-lg font-medium hover:bg-[#EDEDED] transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>Contact Agent</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-[#EDEDED] text-[#212121] rounded-lg font-medium hover:bg-[#E0E0E0] transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Family Members Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setShowFamilyMembers(!showFamilyMembers)}
              className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-[#212121] transition-all group"
            >
              <svg
                className={`w-5 h-5 text-[#212121] transition-transform ${showFamilyMembers ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="text-xl font-bold text-[#212121]">
                {showFamilyMembers ? 'Family Members' : 'View Members'}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
                {familyMembers.length}
              </span>
            </button>
          </div>

          {showFamilyMembers && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
              {familyMembers.map((member) => (
                <FamilyMemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </section>

        {/* Trips Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#212121]">Your Trips</h2>
            <button
              onClick={() => setShowPlanTripModal(true)}
              className="px-4 py-2 bg-[#212121] text-[#FDFDFF] rounded-lg font-medium hover:bg-[#212121]/90 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Plan a Trip</span>
            </button>
          </div>

          {trips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#212121]/60">No trips found for your family.</p>
            </div>
          ) : (
            <>
              {/* Active Trips */}
              {trips.filter((trip) => trip.status === 'active').length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[#212121] mb-4">Active</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trips
                      .filter((trip) => trip.status === 'active')
                      .map((trip) => (
                        <TripCard
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
                  <h3 className="text-lg font-semibold text-[#212121] mb-4">Upcoming</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trips
                      .filter((trip) => trip.status === 'upcoming')
                      .map((trip) => (
                        <TripCard
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

      {/* Modals */}
      {showPlanTripModal && (
        <PlanTripModal onClose={() => setShowPlanTripModal(false)} />
      )}

      {showAgentChatModal && (
        <AgentChatModal onClose={() => setShowAgentChatModal(false)} />
      )}
    </>
  );
};

export default CustomerPortalInteractive;
