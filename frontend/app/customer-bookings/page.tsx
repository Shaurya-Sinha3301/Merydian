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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-900 font-medium">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/customer-portal')}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
                <p className="text-sm text-gray-600">{bookings.length} total bookings</p>
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
            <p className="text-sm font-semibold text-gray-900 mb-3">Filter by Type</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                  filterType === 'all'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-teal-500/50'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-teal-500'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                onClick={() => setFilterType('flight')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                  filterType === 'flight'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-blue-600'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
                Flights ({counts.flight})
              </button>
              <button
                onClick={() => setFilterType('train')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                  filterType === 'train'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-green-600'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 2h12a2 2 0 012 2v13a2 2 0 01-2 2h-1l1.5 2h-2.5l-1.5-2h-4l-1.5 2H6.5L8 19H7a2 2 0 01-2-2V4a2 2 0 012-2zm0 2v11h12V4H6zm2 13a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/>
                </svg>
                Trains ({counts.train})
              </button>
              <button
                onClick={() => setFilterType('cab')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                  filterType === 'cab'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-blue-600'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
                Cabs ({counts.cab})
              </button>
              <button
                onClick={() => setFilterType('hotel')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                  filterType === 'hotel'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-purple-600'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
                </svg>
                Hotels ({counts.hotel})
              </button>
              <button
                onClick={() => setFilterType('activity')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                  filterType === 'activity'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-[#212121] border-2 border-[#E0E0E0] hover:border-blue-600'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Activities ({counts.activity})
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Filter by Date</p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                  filterStatus === 'all'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-teal-500/50'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-teal-500'
                }`}
              >
                All Bookings
              </button>
              <button
                onClick={() => setFilterStatus('upcoming')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                  filterStatus === 'upcoming'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-teal-500/50'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-teal-500'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilterStatus('past')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                  filterStatus === 'past'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-teal-500/50'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-teal-500'
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
