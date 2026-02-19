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
    switch (booking.type) {
      case 'flight': return '✈️';
      case 'train': return '🚂';
      case 'cab': return '🚗';
      case 'hotel': return '🏨';
      case 'activity': return '🎯';
      default: return '📋';
    }
  };

  const getTypeColor = () => {
    switch (booking.type) {
      case 'flight': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'train': return 'bg-green-50 border-green-200 text-green-700';
      case 'cab': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'hotel': return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'activity': return 'bg-orange-50 border-orange-200 text-orange-700';
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
          <span className="text-xl">{getTypeIcon()}</span>
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
