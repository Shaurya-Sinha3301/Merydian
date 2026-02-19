'use client';

interface BookingCardProps {
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
  onClick: () => void;
}

export default function BookingCard({ booking, onClick }: BookingCardProps) {
  const getTypeIcon = () => {
    const iconClass = "w-6 h-6";
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

  const getTypeColor = () => {
    switch (booking.type) {
      case 'flight': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'train': return 'bg-green-50 border-green-200 text-green-700';
      case 'cab': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'hotel': return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'activity': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'confirmed':
        return <span className="px-3 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-lg">Confirmed</span>;
      case 'pending':
        return <span className="px-3 py-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-lg">Pending</span>;
      case 'cancelled':
        return <span className="px-3 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-lg">Cancelled</span>;
      case 'delayed':
        return <span className="px-3 py-1 text-xs font-bold bg-orange-100 text-orange-800 rounded-lg">Delayed</span>;
      case 'modified':
        return <span className="px-3 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-lg">Modified</span>;
      default:
        return <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-800 rounded-lg">Unknown</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLocationInfo = () => {
    if (booking.type === 'flight' || booking.type === 'train' || booking.type === 'cab') {
      const transport = booking.details.transport;
      return {
        from: transport?.pickupLocation?.name || 'N/A',
        to: transport?.dropLocation?.name || 'N/A'
      };
    }
    if (booking.type === 'hotel') {
      const accommodation = booking.details.accommodation;
      return {
        location: accommodation?.address || 'N/A',
        rooms: accommodation?.roomNumbers?.length || 0
      };
    }
    if (booking.type === 'activity') {
      const activity = booking.details.activity;
      return {
        location: activity?.locationName || 'N/A'
      };
    }
    return {};
  };

  const locationInfo = getLocationInfo();

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-6 border-2 border-[#E0E0E0] hover:border-[#212121] transition-all text-left w-full group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`px-3 py-2 rounded-xl border-2 ${getTypeColor()} font-bold text-sm flex items-center gap-2`}>
          {getTypeIcon()}
          <span className="capitalize">{booking.type}</span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-[#212121] mb-2 group-hover:text-blue-600 transition-colors">
        {booking.title}
      </h3>

      {/* Trip Name */}
      <p className="text-xs text-[#212121]/60 mb-3 font-semibold">
        📍 {booking.tripName}
      </p>

      {/* Location Info */}
      <div className="mb-4 space-y-2">
        {(booking.type === 'flight' || booking.type === 'train' || booking.type === 'cab') && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#212121]/60">From:</span>
            <span className="font-semibold text-[#212121] truncate">{locationInfo.from}</span>
          </div>
        )}
        {(booking.type === 'flight' || booking.type === 'train' || booking.type === 'cab') && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#212121]/60">To:</span>
            <span className="font-semibold text-[#212121] truncate">{locationInfo.to}</span>
          </div>
        )}
        {booking.type === 'hotel' && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#212121]/60">Location:</span>
              <span className="font-semibold text-[#212121] truncate">{locationInfo.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#212121]/60">Rooms:</span>
              <span className="font-semibold text-[#212121]">{locationInfo.rooms}</span>
            </div>
          </>
        )}
        {booking.type === 'activity' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#212121]/60">Location:</span>
            <span className="font-semibold text-[#212121] truncate">{locationInfo.location}</span>
          </div>
        )}
      </div>

      {/* Date & Time */}
      <div className="bg-[#F5F5F5] rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-[#212121]/60 text-xs mb-1">Date</p>
            <p className="font-bold text-[#212121]">{formatDate(booking.date)}</p>
          </div>
          <div className="text-right">
            <p className="text-[#212121]/60 text-xs mb-1">Time</p>
            <p className="font-bold text-[#212121]">{formatTime(booking.date)}</p>
          </div>
        </div>
      </div>

      {/* Booking Reference */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#212121]/60 mb-1">Booking Reference</p>
          <p className="font-mono font-bold text-[#212121] text-sm">{booking.bookingReference}</p>
        </div>
        <svg className="w-5 h-5 text-[#212121] group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
        </svg>
      </div>
    </button>
  );
}
