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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '2px solid #1a1a1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#717171', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <button
                onClick={() => router.back()}
                style={{
                  width: 40, height: 40,
                  background: '#fff',
                  border: '1px solid #e5e5e5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e5e5')}
              >
                <svg style={{ width: 20, height: 20, color: '#1a1a1a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, background: '#c5a065', borderRadius: '50%', display: 'inline-block' }} />
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c5a065', margin: 0 }}>
                    BOOKING MANAGEMENT
                  </p>
                </div>
                <h1 style={{ fontSize: 36, fontWeight: 200, letterSpacing: '-0.02em', margin: 0, color: '#1a1a1a' }}>
                  My Bookings
                </h1>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#717171', margin: '0 0 4px' }}>TOTAL BOOKINGS</p>
              <p style={{ fontSize: 24, fontWeight: 300, margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                {bookings.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1280px', margin: '0 auto', padding: '48px 40px',
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}>
        {/* Filters */}
        <div style={{ marginBottom: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Type Filter */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', marginBottom: 16 }}>Filter by Type</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button
                onClick={() => setFilterType('all')}
                style={{
                  padding: '10px 20px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: filterType === 'all' ? '#1a1a1a' : '#fff',
                  color: filterType === 'all' ? '#fff' : '#717171',
                  border: filterType === 'all' ? 'none' : '1px solid #e5e5e5',
                  borderBottom: filterType === 'all' ? '2px solid #c5a065' : '1px solid #e5e5e5',
                }}
                onMouseEnter={e => { if (filterType !== 'all') e.currentTarget.style.borderColor = '#1a1a1a'; }}
                onMouseLeave={e => { if (filterType !== 'all') e.currentTarget.style.borderColor = '#e5e5e5'; }}
              >
                All ({counts.all})
              </button>
              {[
                { id: 'flight', label: 'Flights', icon: 'M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z' },
                { id: 'train', label: 'Trains', icon: 'M6 2h12a2 2 0 012 2v13a2 2 0 01-2 2h-1l1.5 2h-2.5l-1.5-2h-4l-1.5 2H6.5L8 19H7a2 2 0 01-2-2V4a2 2 0 012-2zm0 2v11h12V4H6zm2 13a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z' },
                { id: 'cab', label: 'Cabs', icon: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z' },
                { id: 'hotel', label: 'Hotels', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z' },
                { id: 'activity', label: 'Activities', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }
              ].map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setFilterType(id as any)}
                  style={{
                    padding: '10px 20px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: filterType === id ? '#1a1a1a' : '#fff',
                    color: filterType === id ? '#fff' : '#717171',
                    border: filterType === id ? 'none' : '1px solid #e5e5e5',
                    borderBottom: filterType === id ? '2px solid #c5a065' : '1px solid #e5e5e5',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}
                  onMouseEnter={e => { if (filterType !== id) e.currentTarget.style.borderColor = '#1a1a1a'; }}
                  onMouseLeave={e => { if (filterType !== id) e.currentTarget.style.borderColor = '#e5e5e5'; }}
                >
                  <svg style={{ width: 14, height: 14 }} fill="currentColor" viewBox="0 0 24 24">
                    <path d={icon} />
                  </svg>
                  {label} ({counts[id as keyof typeof counts]})
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', marginBottom: 16 }}>Filter by Date</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { id: 'all', label: 'All Bookings' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'past', label: 'Past' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFilterStatus(id as any)}
                  style={{
                    padding: '10px 20px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: filterStatus === id ? '#1a1a1a' : '#fff',
                    color: filterStatus === id ? '#fff' : '#717171',
                    border: filterStatus === id ? 'none' : '1px solid #e5e5e5',
                    borderBottom: filterStatus === id ? '2px solid #c5a065' : '1px solid #e5e5e5',
                  }}
                  onMouseEnter={e => { if (filterStatus !== id) e.currentTarget.style.borderColor = '#1a1a1a'; }}
                  onMouseLeave={e => { if (filterStatus !== id) e.currentTarget.style.borderColor = '#e5e5e5'; }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings Grid */}
        {filteredBookings.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e5e5e5', padding: 80, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#f0f0f0', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <svg style={{ width: 32, height: 32, color: '#717171' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 300, color: '#1a1a1a', marginBottom: 12 }}>No Bookings Found</h3>
            <p style={{ fontSize: 13, color: '#717171', margin: 0 }}>
              {filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Your bookings will appear here once you have trips planned'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
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

      {/* CSS keyframes for spin */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
