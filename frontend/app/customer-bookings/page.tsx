'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BookingCard from './components/BookingCard';
import BookingDetailsModal from './components/BookingDetailsModal';
import itineraryDataFile from '@/lib/agent-dashboard/data/itinerary_data.json';
import activeGroupsData from '@/lib/agent-dashboard/data/active_groups.json';
import upcomingGroupsData from '@/lib/agent-dashboard/data/upcoming_groups.json';

interface Booking {
  id: string;
  type: 'flight' | 'train' | 'cab' | 'hotel' | 'activity';
  title: string;
  date: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'delayed' | 'modified';
  bookingReference: string;
  tripName: string;
  details: any;
  ticketUrl?: string;
}

export default function CustomerBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'flight' | 'train' | 'cab' | 'hotel' | 'activity'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'past'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for highlight parameter
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get('highlight');
    
    if (highlightId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === highlightId);
      if (booking) {
        setSelectedBooking(booking);
      }
    }
  }, [bookings]);

  useEffect(() => {
    const familyId = sessionStorage.getItem('familyId');
    
    if (!familyId) {
      router.push('/customer-login');
      return;
    }

    // Extract bookings from itinerary data
    const extractedBookings: Booking[] = [];
    const familyGroupMap = JSON.parse(sessionStorage.getItem('familyGroupMap') || '{}');

    // Find all trips for this family
    const familyTrips: string[] = [];
    
    [...activeGroupsData.groups, ...upcomingGroupsData.groups].forEach((group: any) => {
      const family = group.families.find((f: any) => f.id === familyId);
      if (family) {
        familyTrips.push(group.id);
      }
    });

    // Extract bookings from itineraries
    itineraryDataFile.itineraries.forEach((itinerary: any) => {
      if (familyTrips.includes(itinerary.groupId) || Object.values(familyGroupMap).includes(itinerary.groupId)) {
        itinerary.days.forEach((day: any) => {
          day.timelineEvents.forEach((event: any) => {
            // Extract transport bookings (flights, trains, cabs)
            if (event.type === 'transport' && event.transport?.ticketStatus) {
              const mode = event.transport.mode.toLowerCase();
              const ticketStatus = event.transport.ticketStatus;
              
              // Safely extract booking reference
              let bookingRef = 'N/A';
              let ticketUrl = undefined;
              
              if (typeof ticketStatus === 'string') {
                bookingRef = ticketStatus;
              } else if (typeof ticketStatus === 'object' && ticketStatus !== null) {
                bookingRef = ticketStatus.bookingReference || ticketStatus.bookingId || 'N/A';
                ticketUrl = ticketStatus.ticketUrl;
              }
              
              extractedBookings.push({
                id: event.id,
                type: mode === 'flight' ? 'flight' : mode === 'train' ? 'train' : 'cab',
                title: event.title,
                date: event.startTime,
                status: event.status || 'confirmed',
                bookingReference: bookingRef,
                tripName: itinerary.itineraryName,
                details: event,
                ticketUrl: ticketUrl
              });
            }

            // Extract hotel bookings
            if (event.type === 'accommodation' && event.accommodation) {
              // Safely extract booking reference
              let bookingRef = 'N/A';
              const accBookingRef = event.accommodation.bookingReference;
              
              if (typeof accBookingRef === 'string') {
                bookingRef = accBookingRef;
              } else if (typeof accBookingRef === 'object' && accBookingRef !== null) {
                bookingRef = accBookingRef.bookingReference || accBookingRef.bookingId || 'N/A';
              }
              
              extractedBookings.push({
                id: event.id,
                type: 'hotel',
                title: event.accommodation.hotelName,
                date: event.accommodation.checkInTime,
                status: event.status || 'confirmed',
                bookingReference: bookingRef,
                tripName: itinerary.itineraryName,
                details: event,
                ticketUrl: event.accommodation.confirmationUrl
              });
            }

            // Extract activity bookings (if they have tickets)
            if (event.type === 'activity' && event.activity?.ticketReference) {
              // Safely extract booking reference
              let bookingRef = 'N/A';
              const actTicketRef = event.activity.ticketReference;
              
              if (typeof actTicketRef === 'string') {
                bookingRef = actTicketRef;
              } else if (typeof actTicketRef === 'object' && actTicketRef !== null) {
                bookingRef = actTicketRef.bookingReference || actTicketRef.bookingId || 'N/A';
              }
              
              extractedBookings.push({
                id: event.id,
                type: 'activity',
                title: event.title,
                date: event.startTime,
                status: event.status || 'confirmed',
                bookingReference: bookingRef,
                tripName: itinerary.itineraryName,
                details: event,
                ticketUrl: event.activity.ticketUrl
              });
            }
          });
        });
      }
    });

    // Sort by date (newest first)
    extractedBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setBookings(extractedBookings);
    setFilteredBookings(extractedBookings);
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    let filtered = bookings;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(b => b.type === filterType);
    }

    // Filter by status (upcoming/past)
    if (filterStatus !== 'all') {
      const now = new Date();
      if (filterStatus === 'upcoming') {
        filtered = filtered.filter(b => new Date(b.date) >= now);
      } else {
        filtered = filtered.filter(b => new Date(b.date) < now);
      }
    }

    setFilteredBookings(filtered);
  }, [filterType, filterStatus, bookings]);

  const getBookingCounts = () => {
    return {
      all: bookings.length,
      flight: bookings.filter(b => b.type === 'flight').length,
      train: bookings.filter(b => b.type === 'train').length,
      cab: bookings.filter(b => b.type === 'cab').length,
      hotel: bookings.filter(b => b.type === 'hotel').length,
      activity: bookings.filter(b => b.type === 'activity').length,
    };
  };

  const counts = getBookingCounts();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#212121] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#212121]">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF]">
      {/* Header */}
      <div className="bg-white border-b border-[#212121]/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/customer-portal')}
                className="w-10 h-10 rounded-full bg-[#EDEDED] hover:bg-[#E0E0E0] transition-all flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-[#212121]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#212121]">My Bookings</h1>
                <p className="text-sm text-[#212121]/60">{bookings.length} total bookings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Type Filter */}
          <div>
            <p className="text-sm font-semibold text-[#212121] mb-3">Filter by Type</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterType === 'all'
                    ? 'bg-[#212121] text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-[#212121]'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                onClick={() => setFilterType('flight')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterType === 'flight'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-blue-600'
                }`}
              >
                ✈️ Flights ({counts.flight})
              </button>
              <button
                onClick={() => setFilterType('train')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterType === 'train'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-green-600'
                }`}
              >
                🚂 Trains ({counts.train})
              </button>
              <button
                onClick={() => setFilterType('cab')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterType === 'cab'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-yellow-600'
                }`}
              >
                🚗 Cabs ({counts.cab})
              </button>
              <button
                onClick={() => setFilterType('hotel')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterType === 'hotel'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-purple-600'
                }`}
              >
                🏨 Hotels ({counts.hotel})
              </button>
              <button
                onClick={() => setFilterType('activity')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterType === 'activity'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-orange-600'
                }`}
              >
                🎯 Activities ({counts.activity})
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <p className="text-sm font-semibold text-[#212121] mb-3">Filter by Date</p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterStatus === 'all'
                    ? 'bg-[#212121] text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-[#212121]'
                }`}
              >
                All Bookings
              </button>
              <button
                onClick={() => setFilterStatus('upcoming')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterStatus === 'upcoming'
                    ? 'bg-[#212121] text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-[#212121]'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilterStatus('past')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterStatus === 'past'
                    ? 'bg-[#212121] text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-[#212121]'
                }`}
              >
                Past
              </button>
            </div>
          </div>
        </div>

        {/* Bookings Grid */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E0E0E0]">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#212121] mb-2">No Bookings Found</h3>
            <p className="text-sm text-[#212121]/60">
              {filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Your bookings will appear here once you have trips planned'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onClick={() => setSelectedBooking(booking)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}
