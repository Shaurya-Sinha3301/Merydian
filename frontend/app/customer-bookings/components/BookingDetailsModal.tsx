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
    const iconClass = "w-8 h-8";
    switch (booking.type) {
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

  const getStatusBadge = () => {
    const style = { padding: '6px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const };
    switch (booking.status) {
      case 'confirmed':
        return <span style={{ ...style, background: '#8fa391', color: '#fff' }}>✓ CONFIRMED</span>;
      case 'pending':
        return <span style={{ ...style, background: '#f3f4f6', color: '#717171', border: '1px solid #e5e5e5' }}>⏳ PENDING</span>;
      case 'cancelled':
        return <span style={{ ...style, background: '#d98d8d', color: '#fff' }}>✕ CANCELLED</span>;
      case 'delayed':
        return <span style={{ ...style, background: '#d98d8d', color: '#fff' }}>⚠ DELAYED</span>;
      case 'modified':
        return <span style={{ ...style, background: '#c5a065', color: '#fff' }}>↻ MODIFIED</span>;
      default:
        return <span style={{ ...style, background: '#f3f4f6', color: '#717171' }}>UNKNOWN</span>;
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Route */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 12px' }}>FROM</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>{transport.pickupLocation?.name}</p>
            <p style={{ fontSize: 12, color: '#717171', margin: 0 }}>{transport.pickupLocation?.address}</p>
          </div>
          <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 12px' }}>TO</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>{transport.dropLocation?.name}</p>
            <p style={{ fontSize: 12, color: '#717171', margin: 0 }}>{transport.dropLocation?.address}</p>
          </div>
        </div>

        {/* Provider Info */}
        <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 16px' }}>PROVIDER DETAILS</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontSize: 10, color: '#717171', margin: '0 0 6px' }}>Provider</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{transport.providerName}</p>
            </div>
            {transport.flightNumber && (
              <div>
                <p style={{ fontSize: 10, color: '#717171', margin: '0 0 6px' }}>Flight Number</p>
                <p style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', margin: 0 }}>{transport.flightNumber}</p>
              </div>
            )}
            {transport.trainNumber && (
              <div>
                <p style={{ fontSize: 10, color: '#717171', margin: '0 0 6px' }}>Train Number</p>
                <p style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', margin: 0 }}>{transport.trainNumber}</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Info */}
        {transport.ticketStatus && (
          <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 16px' }}>TICKET INFORMATION</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ fontSize: 10, color: '#717171', margin: '0 0 6px' }}>PNR</p>
                <p style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', margin: 0 }}>{transport.ticketStatus.pnr || 'N/A'}</p>
              </div>
              {transport.ticketStatus.seatNumbers && (
                <div>
                  <p style={{ fontSize: 10, color: '#717171', margin: '0 0 6px' }}>Seats</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{transport.ticketStatus.seatNumbers.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Driver Details (for cabs) */}
        {transport.driverDetails && (
          <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 16px' }}>DRIVER INFORMATION</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ fontSize: 10, color: '#717171', margin: '0 0 6px' }}>Name</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{transport.driverDetails.name}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#717171', margin: '0 0 6px' }}>Contact</p>
                <p style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', margin: 0 }}>{transport.driverDetails.contact}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#717171', margin: '0 0 6px' }}>Vehicle</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{transport.driverDetails.vehicleModel}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#717171', margin: '0 0 6px' }}>Number</p>
                <p style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', margin: 0 }}>{transport.driverDetails.vehicleNumber}</p>
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
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 800, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', border: '1px solid #e5e5e5', margin: '32px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 32, borderBottom: '1px solid #e5e5e5' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  {getTypeIcon()}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c5a065', margin: '0 0 4px' }}>
                    {booking.type}
                  </p>
                  <h2 style={{ fontSize: 24, fontWeight: 300, color: '#1a1a1a', margin: 0 }}>{booking.title}</h2>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#717171', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg style={{ width: 14, height: 14 }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
                {booking.tripName}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36,
                background: '#fff',
                border: '1px solid #e5e5e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: '#717171'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a1a1a'; (e.currentTarget as HTMLButtonElement).style.color = '#1a1a1a'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5e5'; (e.currentTarget as HTMLButtonElement).style.color = '#717171'; }}
            >
              <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: 32, maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Status & Reference */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
              {getStatusBadge()}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 6px' }}>BOOKING REFERENCE</p>
                <p style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{booking.bookingReference}</p>
              </div>
            </div>

            {/* Date & Time */}
            <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 8px' }}>DATE</p>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{dateTime.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 8px' }}>TIME</p>
                  <p style={{ fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', margin: 0 }}>{dateTime.time}</p>
                </div>
              </div>
            </div>

            {/* Type-specific Details */}
            {(booking.type === 'flight' || booking.type === 'train' || booking.type === 'cab') && renderTransportDetails()}
            {booking.type === 'hotel' && renderHotelDetails()}
            {booking.type === 'activity' && renderActivityDetails()}

            {/* Disruption Alert */}
            {booking.details.disruption && (
              <div style={{
                borderLeft: booking.details.disruption.severity === 'critical' || booking.details.disruption.severity === 'high' ? '2px solid #d98d8d' : '2px solid #c5a065',
                background: '#fafafa',
                border: '1px solid #e5e5e5',
                padding: 16,
                marginTop: 24
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#d98d8d', margin: '0 0 8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ⚠ {booking.details.disruption.title}
                </p>
                <p style={{ fontSize: 13, color: '#555', margin: '0 0 8px', lineHeight: 1.6 }}>{booking.details.disruption.description}</p>
                {booking.details.disruption.suggestedAction && (
                  <p style={{ fontSize: 12, color: '#8fa391', margin: 0, fontStyle: 'italic', background: '#fff', padding: 8, border: '1px solid #e5e5e5' }}>
                    💡 {booking.details.disruption.suggestedAction}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: 32, borderTop: '1px solid #e5e5e5', display: 'flex', gap: 12 }}>
            {booking.ticketUrl && (
              <button
                onClick={() => setShowTicket(true)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: '#1a1a1a',
                  color: '#fff',
                  border: 'none',
                  borderBottom: '2px solid #c5a065',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
              >
                <svg style={{ width: 16, height: 16 }} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                  <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                </svg>
                View Ticket
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: '#fff',
                color: '#717171',
                border: '1px solid #e5e5e5',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a1a1a'; (e.currentTarget as HTMLButtonElement).style.color = '#1a1a1a'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5e5'; (e.currentTarget as HTMLButtonElement).style.color = '#717171'; }}
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

      {/* CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400&display=swap');
      `}</style>
    </>
  );
}
