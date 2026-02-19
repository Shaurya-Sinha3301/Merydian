'use client';

import { useState } from 'react';
import TicketModal from '@/components/itinerary/TicketModal';

interface BookingDetailsModalProps {
  booking: {
    id: string;
    type: 'flight' | 'train' | 'cab' | 'hotel' | 'activity';
    title: string;
    date: string;
    status: 'confirmed' | 'pending' | 'cancelled' | 'delayed' | 'modified';
    bookingReference: string;
    tripName: string;
    details: any;
    ticketUrl?: string;
  };
  onClose: () => void;
}

export default function BookingDetailsModal({ booking, onClose }: BookingDetailsModalProps) {
  const [showTicket, setShowTicket] = useState(false);

  const getTypeIcon = () => {
    switch (booking.type) {
      case 'flight': return '✈️';
      case 'train': return '🚂';
      case 'cab': return '🚗';
      case 'hotel': return '🏨';
      case 'activity': return '🎯';
      default: return '📋';
    }
  };

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'confirmed':
        return <span className="px-4 py-2 text-sm font-bold bg-green-100 text-green-800 rounded-lg">✓ Confirmed</span>;
      case 'pending':
        return <span className="px-4 py-2 text-sm font-bold bg-yellow-100 text-yellow-800 rounded-lg">⏳ Pending</span>;
      case 'cancelled':
        return <span className="px-4 py-2 text-sm font-bold bg-red-100 text-red-800 rounded-lg">✕ Cancelled</span>;
      case 'delayed':
        return <span className="px-4 py-2 text-sm font-bold bg-orange-100 text-orange-800 rounded-lg">⚠ Delayed</span>;
      case 'modified':
        return <span className="px-4 py-2 text-sm font-bold bg-blue-100 text-blue-800 rounded-lg">↻ Modified</span>;
      default:
        return <span className="px-4 py-2 text-sm font-bold bg-gray-100 text-gray-800 rounded-lg">Unknown</span>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const renderTransportDetails = () => {
    const transport = booking.details.transport;
    if (!transport) return null;

    return (
      <div className="space-y-4">
        {/* Route */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <p className="text-xs text-[#212121]/60 uppercase font-bold mb-2">From</p>
            <p className="font-bold text-[#212121] text-lg mb-1">{transport.pickupLocation?.name}</p>
            <p className="text-sm text-[#212121]/60">{transport.pickupLocation?.address}</p>
          </div>
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <p className="text-xs text-[#212121]/60 uppercase font-bold mb-2">To</p>
            <p className="font-bold text-[#212121] text-lg mb-1">{transport.dropLocation?.name}</p>
            <p className="text-sm text-[#212121]/60">{transport.dropLocation?.address}</p>
          </div>
        </div>

        {/* Provider Info */}
        <div className="bg-[#F5F5F5] rounded-xl p-4">
          <p className="text-xs text-[#212121]/60 uppercase font-bold mb-3">Provider Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#212121]/60 mb-1">Provider</p>
              <p className="font-bold text-[#212121]">{transport.providerName}</p>
            </div>
            {transport.flightNumber && (
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">Flight Number</p>
                <p className="font-bold text-[#212121]">{transport.flightNumber}</p>
              </div>
            )}
            {transport.trainNumber && (
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">Train Number</p>
                <p className="font-bold text-[#212121]">{transport.trainNumber}</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Info */}
        {transport.ticketStatus && (
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <p className="text-xs text-[#212121]/60 uppercase font-bold mb-3">Ticket Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">PNR</p>
                <p className="font-mono font-bold text-[#212121]">{transport.ticketStatus.pnr || 'N/A'}</p>
              </div>
              {transport.ticketStatus.seatNumbers && (
                <div>
                  <p className="text-xs text-[#212121]/60 mb-1">Seats</p>
                  <p className="font-bold text-[#212121]">{transport.ticketStatus.seatNumbers.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Driver Details (for cabs) */}
        {transport.driverDetails && (
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <p className="text-xs text-[#212121]/60 uppercase font-bold mb-3">Driver Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">Name</p>
                <p className="font-bold text-[#212121]">{transport.driverDetails.name}</p>
              </div>
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">Contact</p>
                <p className="font-bold text-[#212121]">{transport.driverDetails.contact}</p>
              </div>
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">Vehicle</p>
                <p className="font-bold text-[#212121]">{transport.driverDetails.vehicleModel}</p>
              </div>
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">Number</p>
                <p className="font-mono font-bold text-[#212121]">{transport.driverDetails.vehicleNumber}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHotelDetails = () => {
    const accommodation = booking.details.accommodation;
    if (!accommodation) return null;

    const checkIn = formatDateTime(accommodation.checkInTime);
    const checkOut = formatDateTime(accommodation.checkOutTime);

    // Mock data for hotel details (in real app, fetch from API)
    const hotelDetails = {
      rating: 4.5,
      amenities: ['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Gym', 'Room Service', 'Beach Access', 'Parking'],
      photos: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'
      ]
    };

    return (
      <div className="space-y-4">
        {/* Hotel Info */}
        <div className="bg-[#F5F5F5] rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-[#212121]/60 uppercase font-bold mb-2">Hotel</p>
              <p className="font-bold text-[#212121] text-xl mb-2">{accommodation.hotelName}</p>
              <p className="text-sm text-[#212121]/60">{accommodation.address}</p>
            </div>
            <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span className="font-bold text-yellow-900">{hotelDetails.rating}</span>
            </div>
          </div>
        </div>

        {/* Hotel Photos */}
        <div>
          <p className="text-xs text-[#212121]/60 uppercase font-bold mb-3">Photos</p>
          <div className="grid grid-cols-3 gap-2">
            {hotelDetails.photos.map((photo, index) => (
              <div key={index} className="relative h-24 rounded-lg overflow-hidden">
                <img src={photo} alt={`Hotel ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-[#F5F5F5] rounded-xl p-4">
          <p className="text-xs text-[#212121]/60 uppercase font-bold mb-3">Amenities</p>
          <div className="grid grid-cols-2 gap-2">
            {hotelDetails.amenities.map((amenity, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="text-[#212121]">{amenity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Check-in/out */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <p className="text-xs text-[#212121]/60 uppercase font-bold mb-2">Check-in</p>
            <p className="font-bold text-[#212121] mb-1">{checkIn.date}</p>
            <p className="text-sm text-[#212121]/60">{checkIn.time}</p>
          </div>
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <p className="text-xs text-[#212121]/60 uppercase font-bold mb-2">Check-out</p>
            <p className="font-bold text-[#212121] mb-1">{checkOut.date}</p>
            <p className="text-sm text-[#212121]/60">{checkOut.time}</p>
          </div>
        </div>

        {/* Room Details */}
        <div className="bg-[#F5F5F5] rounded-xl p-4">
          <p className="text-xs text-[#212121]/60 uppercase font-bold mb-3">Room Details</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#212121]/60 mb-1">Room Type</p>
              <p className="font-bold text-[#212121]">{accommodation.roomType}</p>
            </div>
            <div>
              <p className="text-xs text-[#212121]/60 mb-1">Room Numbers</p>
              <p className="font-bold text-[#212121]">{accommodation.roomNumbers?.join(', ')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActivityDetails = () => {
    const activity = booking.details.activity;
    if (!activity) return null;

    return (
      <div className="space-y-4">
        {/* Location */}
        <div className="bg-[#F5F5F5] rounded-xl p-4">
          <p className="text-xs text-[#212121]/60 uppercase font-bold mb-2">Location</p>
          <p className="font-bold text-[#212121] text-lg mb-1">{activity.locationName}</p>
          <p className="text-sm text-[#212121]/60">{activity.address}</p>
        </div>

        {/* Activity Info */}
        <div className="bg-[#F5F5F5] rounded-xl p-4">
          <p className="text-xs text-[#212121]/60 uppercase font-bold mb-3">Activity Details</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#212121]/60 mb-1">Type</p>
              <p className="font-bold text-[#212121]">{activity.activityType}</p>
            </div>
            <div>
              <p className="text-xs text-[#212121]/60 mb-1">Description</p>
              <p className="text-sm text-[#212121]">{activity.description}</p>
            </div>
            {activity.entryFee && (
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">Entry Fee</p>
                <p className="font-bold text-[#212121]">
                  {activity.entryFee.currency} {activity.entryFee.amount}
                  {activity.entryFee.perPerson && ' per person'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Guide Details */}
        {activity.guideDetails && (
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <p className="text-xs text-[#212121]/60 uppercase font-bold mb-3">Guide Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">Name</p>
                <p className="font-bold text-[#212121]">{activity.guideDetails.name}</p>
              </div>
              <div>
                <p className="text-xs text-[#212121]/60 mb-1">Contact</p>
                <p className="font-bold text-[#212121]">{activity.guideDetails.contact}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const dateTime = formatDateTime(booking.date);

  return (
    <>
      <div className="fixed inset-0 bg-[#212121]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-[#FDFDFF] rounded-2xl max-w-3xl w-full my-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#212121]/10">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getTypeIcon()}</span>
              <div>
                <h2 className="text-2xl font-bold text-[#212121]">{booking.title}</h2>
                <p className="text-sm text-[#212121]/60 mt-1">📍 {booking.tripName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#EDEDED] hover:bg-[#E0E0E0] transition-all flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-[#212121]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
            {/* Status & Date */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              {getStatusBadge()}
              <div className="text-right">
                <p className="text-sm text-[#212121]/60 mb-1">Booking Reference</p>
                <p className="font-mono font-bold text-[#212121] text-lg">{booking.bookingReference}</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 uppercase font-bold mb-1">Date</p>
                  <p className="font-bold text-blue-900 text-lg">{dateTime.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-700 uppercase font-bold mb-1">Time</p>
                  <p className="font-bold text-blue-900 text-lg">{dateTime.time}</p>
                </div>
              </div>
            </div>

            {/* Type-specific Details */}
            {(booking.type === 'flight' || booking.type === 'train' || booking.type === 'cab') && renderTransportDetails()}
            {booking.type === 'hotel' && renderHotelDetails()}
            {booking.type === 'activity' && renderActivityDetails()}

            {/* Disruption Alert */}
            {booking.details.disruption && (
              <div className={`border-l-4 rounded-xl p-4 ${
                booking.details.disruption.severity === 'critical' ? 'border-red-600 bg-red-50' :
                booking.details.disruption.severity === 'high' ? 'border-orange-600 bg-orange-50' :
                booking.details.disruption.severity === 'medium' ? 'border-yellow-600 bg-yellow-50' :
                'border-blue-600 bg-blue-50'
              }`}>
                <p className="font-bold text-[#212121] mb-2">⚠️ {booking.details.disruption.title}</p>
                <p className="text-sm text-[#212121]/80 mb-2">{booking.details.disruption.description}</p>
                {booking.details.disruption.suggestedAction && (
                  <p className="text-xs text-[#212121]/70 bg-white/70 p-2 rounded">
                    💡 {booking.details.disruption.suggestedAction}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#212121]/10 flex gap-3">
            {booking.ticketUrl && (
              <button
                onClick={() => setShowTicket(true)}
                className="flex-1 px-6 py-3 bg-[#212121] text-[#FDFDFF] rounded-xl font-semibold hover:bg-[#212121]/90 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                  <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                </svg>
                View Ticket
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#EDEDED] text-[#212121] rounded-xl font-semibold hover:bg-[#E0E0E0] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {showTicket && (
        <TicketModal
          isOpen={showTicket}
          onClose={() => setShowTicket(false)}
          event={booking.details}
        />
      )}
    </>
  );
}
