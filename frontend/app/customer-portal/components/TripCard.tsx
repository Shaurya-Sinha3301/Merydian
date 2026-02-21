'use client';

import { useState, useEffect } from 'react';
import itineraryDataFile from '@/lib/agent-dashboard/data/itinerary_data.json';

interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming';
  groupName: string;
  thumbnail: string;
}

interface TripCardProps {
  trip: Trip;
  onViewItinerary: () => void;
  onViewBooking?: (bookingId: string) => void;
}

interface TripBooking {
  id: string;
  type: 'flight' | 'train' | 'cab' | 'hotel' | 'activity';
  title: string;
  date: string;
  bookingReference: string;
}

const TripCard = ({ trip, onViewItinerary, onViewBooking }: TripCardProps) => {
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [showAllBookings, setShowAllBookings] = useState(false);

  useEffect(() => {
    // Extract bookings for this trip
    const familyGroupMap = JSON.parse(sessionStorage.getItem('familyGroupMap') || '{}');
    const groupId = familyGroupMap[trip.id] || trip.id;
    
    const itinerary = itineraryDataFile.itineraries.find((itin: any) => itin.groupId === groupId);
    
    if (itinerary) {
      const tripBookings: TripBooking[] = [];
      
      itinerary.days.forEach((day: any) => {
        day.timelineEvents.forEach((event: any) => {
          // Transport bookings
          if (event.type === 'transport' && event.transport?.ticketStatus) {
            const mode = event.transport.mode.toLowerCase();
            const ticketStatus = event.transport.ticketStatus;
            
            // Safely extract booking reference
            let bookingRef = 'N/A';
            if (typeof ticketStatus === 'string') {
              bookingRef = ticketStatus;
            } else if (typeof ticketStatus === 'object' && ticketStatus !== null) {
              bookingRef = ticketStatus.bookingReference || ticketStatus.bookingId || 'N/A';
            }
            
            tripBookings.push({
              id: event.id,
              type: mode === 'flight' ? 'flight' : mode === 'train' ? 'train' : 'cab',
              title: event.title,
              date: event.startTime,
              bookingReference: bookingRef
            });
          }
          
          // Hotel bookings
          if (event.type === 'accommodation' && event.accommodation) {
            // Safely extract booking reference
            let bookingRef = 'N/A';
            const accBookingRef = event.accommodation.bookingReference;
            
            if (typeof accBookingRef === 'string') {
              bookingRef = accBookingRef;
            } else if (typeof accBookingRef === 'object' && accBookingRef !== null) {
              bookingRef = accBookingRef.bookingReference || accBookingRef.bookingId || 'N/A';
            }
            
            tripBookings.push({
              id: event.id,
              type: 'hotel',
              title: event.accommodation.hotelName,
              date: event.accommodation.checkInTime,
              bookingReference: bookingRef
            });
          }
          
          // Activity bookings
          if (event.type === 'activity' && event.activity?.ticketReference) {
            // Safely extract booking reference
            let bookingRef = 'N/A';
            const actTicketRef = event.activity.ticketReference;
            
            if (typeof actTicketRef === 'string') {
              bookingRef = actTicketRef;
            } else if (typeof actTicketRef === 'object' && actTicketRef !== null) {
              bookingRef = actTicketRef.bookingReference || actTicketRef.bookingId || 'N/A';
            }
            
            tripBookings.push({
              id: event.id,
              type: 'activity',
              title: event.title,
              date: event.startTime,
              bookingReference: bookingRef
            });
          }
        });
      });
      
      setBookings(tripBookings);
    }
  }, [trip.id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getBookingIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'flight':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        );
      case 'train':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 2h12a2 2 0 012 2v13a2 2 0 01-2 2h-1l1.5 2h-2.5l-1.5-2h-4l-1.5 2H6.5L8 19H7a2 2 0 01-2-2V4a2 2 0 012-2zm0 2v11h12V4H6zm2 13a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/>
          </svg>
        );
      case 'cab':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        );
      case 'hotel':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
          </svg>
        );
      case 'activity':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
            <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
          </svg>
        );
    }
  };

  const displayedBookings = showAllBookings ? bookings : bookings.slice(0, 3);

  return (
    <div className="bg-[#FDFDFF] rounded-2xl overflow-hidden shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.95)] transition-all">
      {/* Thumbnail */}
      <div className="h-48 overflow-hidden relative">
        <img src={trip.thumbnail} alt={trip.destination} className="w-full h-full object-cover" />
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            trip.status === 'active' 
              ? 'bg-green-500 text-white' 
              : 'bg-[#212121] text-[#FDFDFF]'
          } shadow-[4px_4px_8px_rgba(0,0,0,0.2)]`}>
            {trip.status === 'active' ? 'Active' : 'Upcoming'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-[#212121] mb-2">{trip.groupName}</h3>
        
        <div className="flex items-center gap-2 text-sm text-[#212121]/60 mb-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
          </svg>
          <span>{trip.destination}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-[#212121]/60 mb-4">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
          </svg>
          <span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
        </div>

        {/* Bookings Section */}
        {bookings.length > 0 && (
          <div className="mb-4 bg-[#F5F5F5] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-[#212121] uppercase">Bookings ({bookings.length})</p>
              {bookings.length > 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllBookings(!showAllBookings);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  {showAllBookings ? 'Show Less' : `+${bookings.length - 3} More`}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {displayedBookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewBooking) {
                      onViewBooking(booking.id);
                    }
                  }}
                  className="w-full flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 text-blue-600">
                      {getBookingIcon(booking.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#212121] truncate group-hover:text-blue-600">
                        {booking.title}
                      </p>
                      <p className="text-xs text-[#212121]/60 font-mono">
                        {booking.bookingReference}
                      </p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-[#212121]/40 group-hover:text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onViewItinerary}
          className="w-full py-2.5 bg-[#EDEDED] text-[#212121] rounded-lg font-medium hover:bg-[#E0E0E0] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
            <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
          </svg>
          <span>View Itinerary</span>
        </button>
      </div>
    </div>
  );
};

export default TripCard;
