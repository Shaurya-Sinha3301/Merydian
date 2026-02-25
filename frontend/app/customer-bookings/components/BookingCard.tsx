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

const BOOKING_IMAGES: Record<string, string> = {
  flight: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80',
  train: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&q=80',
  cab: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=400&q=80',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  activity: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80',
};

export default function BookingCard({ booking, onClick }: BookingCardProps) {
  const getTypeIcon = () => {
    const iconStyle = { width: 16, height: 16 };
    switch (booking.type) {
      case 'flight':
        return (
          <svg style={iconStyle} fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        );
      case 'train':
        return (
          <svg style={iconStyle} fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 2h12a2 2 0 012 2v13a2 2 0 01-2 2h-1l1.5 2h-2.5l-1.5-2h-4l-1.5 2H6.5L8 19H7a2 2 0 01-2-2V4a2 2 0 012-2zm0 2v11h12V4H6zm2 13a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/>
          </svg>
        );
      case 'cab':
        return (
          <svg style={iconStyle} fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        );
      case 'hotel':
        return (
          <svg style={iconStyle} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
          </svg>
        );
      case 'activity':
        return (
          <svg style={iconStyle} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusStyle = () => {
    switch (booking.status) {
      case 'confirmed':
        return { bg: '#8fa391', text: '#fff', label: 'CONFIRMED' };
      case 'pending':
        return { bg: '#f3f4f6', text: '#717171', label: 'PENDING' };
      case 'cancelled':
        return { bg: '#d98d8d', text: '#fff', label: 'CANCELLED' };
      case 'delayed':
        return { bg: '#d98d8d', text: '#fff', label: 'DELAYED' };
      case 'modified':
        return { bg: '#c5a065', text: '#fff', label: 'MODIFIED' };
      default:
        return { bg: '#f3f4f6', text: '#717171', label: 'UNKNOWN' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
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
        location: accommodation?.hotelName || 'N/A'
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
  const status = getStatusStyle();
  const isCancelled = booking.status === 'cancelled';

  return (
    <button
      onClick={onClick}
      className="booking-card"
      style={{
        background: '#fff',
        border: '1px solid #e5e5e5',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.3s',
        position: 'relative',
        opacity: isCancelled ? 0.6 : 1,
        filter: isCancelled ? 'grayscale(1)' : 'none',
      }}
      onMouseEnter={e => {
        if (!isCancelled) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a1a1a';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          // Colorize the image
          const img = e.currentTarget.querySelector('.booking-card-image') as HTMLImageElement;
          if (img) img.style.filter = 'grayscale(0%) contrast(100%)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5e5';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
        // Return image to greyscale
        const img = e.currentTarget.querySelector('.booking-card-image') as HTMLImageElement;
        if (img) img.style.filter = 'grayscale(80%) contrast(110%)';
      }}
    >
      {/* Image */}
      <div style={{ height: 160, overflow: 'hidden', borderBottom: '1px solid #e5e5e5', position: 'relative', background: '#f0f0f0' }}>
        <img
          className="booking-card-image"
          src={BOOKING_IMAGES[booking.type]}
          alt={booking.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(80%) contrast(110%)',
            transition: 'filter 0.5s'
          }}
        />
        {/* Type badge */}
        <div style={{
          position: 'absolute',
          top: 12, left: 12,
          background: '#fff',
          border: '1px solid #e5e5e5',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#1a1a1a'
        }}>
          {getTypeIcon()}
          {booking.type}
        </div>
        {/* Status badge */}
        <div style={{
          position: 'absolute',
          top: 12, right: 12,
          background: status.bg,
          color: status.text,
          padding: '4px 8px',
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase'
        }}>
          {status.label}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {/* Title */}
        <h3 style={{ fontSize: 18, fontWeight: 300, color: '#1a1a1a', margin: '0 0 8px', lineHeight: 1.3 }}>
          {booking.title}
        </h3>

        {/* Trip Name */}
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 16px' }}>
          {booking.tripName}
        </p>

        {/* Location Info */}
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px dotted #e5e5e5' }}>
          {(booking.type === 'flight' || booking.type === 'train' || booking.type === 'cab') && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#717171', width: 40 }}>FROM</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{locationInfo.from}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#717171', width: 40 }}>TO</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{locationInfo.to}</span>
              </div>
            </>
          )}
          {(booking.type === 'hotel' || booking.type === 'activity') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: '#717171', width: 60 }}>LOCATION</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{locationInfo.location}</span>
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', padding: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 6px' }}>DATE</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{formatDate(booking.date)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 6px' }}>TIME</p>
              <p style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', margin: 0 }}>{formatTime(booking.date)}</p>
            </div>
          </div>
        </div>

        {/* Booking Reference */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 6px' }}>BOOKING REF</p>
            <p style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{booking.bookingReference}</p>
          </div>
          <svg style={{ width: 20, height: 20, color: '#717171', transition: 'transform 0.2s' }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
        </div>
      </div>
    </button>
  );
}
