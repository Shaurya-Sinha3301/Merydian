'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, Car, Plane } from 'lucide-react';
import activeGroupsData from '@/lib/agent-dashboard/data/active_groups.json';
import upcomingGroupsData from '@/lib/agent-dashboard/data/upcoming_groups.json';
import itineraryDataFile from '@/lib/agent-dashboard/data/itinerary_data.json';
import { CustomerSidebar } from '@/app/components/CustomerSidebar';

/* ─────────── helpers ─────────── */
const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};
const formatDayTitle = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};
const durationMins = (start: string, end: string) => {
  const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
};

const EVENT_IMAGES: Record<string, string> = {
  flight: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80',
  transport: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=400&q=80',
  cab: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=400&q=80',
  accommodation: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  meal: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
  activity: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80',
};
const getEventImage = (evt: any) => {
  if (evt.type === 'transport') {
    const mode = evt.transport?.mode?.toLowerCase() || '';
    if (mode === 'flight') return EVENT_IMAGES.flight;
    return EVENT_IMAGES.cab;
  }
  return EVENT_IMAGES[evt.type] || EVENT_IMAGES.activity;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: '#8fa391', text: '#fff', label: 'CONFIRMED' },
  modified: { bg: '#c5a065', text: '#fff', label: 'MODIFIED' },
  delayed: { bg: '#d98d8d', text: '#fff', label: 'DELAYED' },
  cancelled: { bg: '#d98d8d', text: '#fff', label: 'CANCELLED' },
  reserved: { bg: '#8fa391', text: '#fff', label: 'RESERVED' },
};
const getStatus = (evt: any) => {
  const s = (evt.status || 'confirmed').toLowerCase();
  return STATUS_COLORS[s] || { bg: '#8fa391', text: '#fff', label: (s).toUpperCase() };
};

/* ────────────────────────────────
   MAIN COMPONENT
──────────────────────────────── */
const EnhancedCustomerPortalInteractive = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [familyName, setFamilyName] = useState('');
  const [itinerary, setItinerary] = useState<any>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [expandedEvt, setExpandedEvt] = useState<string | null>(null);
  const [whyModal, setWhyModal] = useState<{ title: string; reason: string; originalCost: string; newCost: string; efficiency: number; whyText: string } | null>(null);
  const [acceptedPois, setAcceptedPois] = useState<string[]>([]);
  const [declinedPois, setDeclinedPois] = useState<string[]>([]);

  /* ── AI-suggested POI additions per day ── */
  const AI_POIS: Record<number, { id: string; time: string; title: string; subtitle: string; image: string; badge: string; originalCost: string; newCost: string; efficiency: number; whyReason: string; whyText: string }[]> = {
    0: [{
      id: 'poi_day1_1',
      time: '14:00',
      title: 'Calangute Spice Market Tour',
      subtitle: 'Suggested addition — 10 min from resort, gap in afternoon schedule. Authentic local experience.',
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80',
      badge: 'OPTIMAL ROUTE EFFICIENCY',
      originalCost: '₹18,500',
      newCost: '₹16,200',
      efficiency: 72,
      whyReason: 'Saves ₹2,300 · Eliminates dead-time between transfer and dinner',
      whyText: 'Your afternoon has a 2-hour scheduling gap between your resort transfer and the Beach BBQ Dinner. Calangute market is directly en-route — adding this stop costs zero extra transit time and gives your family an authentic Goan spice experience at peak freshness hours. Our model predicts 94% satisfaction uplift for family groups who include a local market visit.'
    }],
    1: [{
      id: 'poi_day2_1',
      time: '15:00',
      title: 'Aguada Fort & Lighthouse',
      subtitle: 'AI suggested stop based on schedule gap and proximity to Dolphin Cruise jetty.',
      image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&q=80',
      badge: 'HIGH SATISFACTION SCORE',
      originalCost: '₹14,000',
      newCost: '₹14,000',
      efficiency: 88,
      whyReason: 'Free entry · 89% of comparable family groups rated it top activity',
      whyText: 'Aguada Fort is 8 minutes from your Dolphin Watching Cruise jetty and has free entry. Your schedule has a 1h 30m gap between the cruise and the Cultural Dinner. This stop fills that window perfectly — historical exploration with panoramic sea views, ideal for family photos. Based on 200+ similar itineraries, groups who add Aguada rate their overall trip 23% higher.'
    }],
    2: []
  };

  useEffect(() => {
    const familyId = sessionStorage.getItem('familyId');
    if (!familyId) { router.push('/customer-login'); return; }

    let foundFamily: any = null;
    let foundGroupId: string | null = null;

    for (const group of activeGroupsData.groups) {
      const fam = group.families.find((f: any) => f.id === familyId);
      if (fam) { foundFamily = fam; foundGroupId = group.id; break; }
    }
    if (!foundGroupId) {
      for (const group of upcomingGroupsData.groups) {
        const fam = group.families.find((f: any) => f.id === familyId);
        if (fam) { foundFamily = fam; foundGroupId = group.id; break; }
      }
    }

    if (!foundFamily) { router.push('/customer-login'); return; }

    const itin = itineraryDataFile.itineraries.find((i: any) => i.groupId === foundGroupId);
    setFamilyName(foundFamily.family_name || 'Family');
    setItinerary(itin || null);
    setActiveDayIdx(0);
    setIsLoading(false);
  }, [router]);

  /* ── loading ── */
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '2px solid #1a1a1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#717171', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading your itinerary...</p>
        </div>
      </div>
    );
  }

  const days = itinerary?.days || [];
  const activeDay = days[activeDayIdx];
  const events = activeDay?.timelineEvents || [];

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif",
      background: '#fafafa',
      color: '#1a1a1a',
    }}>

      {/* ════ LEFT ICON SIDEBAR ════ */}
      <CustomerSidebar activeTab="portal" />

      {/* ════ MAIN AREA ════ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fafafa', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid #e5e5e5',
          padding: '24px 40px',
          flexShrink: 0,
          zIndex: 10,
        }}>
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
                  transition: 'border-color 0.2s',
                  flexShrink: 0
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
                    {itinerary?.itineraryName || `${familyName} Itinerary`}
                  </p>
                </div>
                <h1 style={{ fontSize: 36, fontWeight: 200, letterSpacing: '-0.02em', margin: 0, color: '#1a1a1a' }}>
                  {familyName}
                </h1>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#717171', margin: '0 0 4px' }}>DESTINATION</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                  {activeDay?.title || 'Your Journey'}
                </p>
              </div>
              <div style={{ width: 1, height: 32, background: '#e5e5e5' }} />
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#717171', margin: '0 0 4px' }}>DATES</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                  {itinerary ? `${new Date(itinerary.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(itinerary.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '—'}
                </p>
              </div>
              <button
                onClick={() => router.push('/customer-bookings')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#1a1a1a', color: '#fff',
                  border: 'none', borderBottom: '2px solid #c5a065',
                  padding: '10px 20px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
              >
                ↓ MY BOOKINGS
              </button>
            </div>
          </div>
        </header>

        {/* ── Body: Day Sidebar + Content ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Day Selector Sidebar */}
          <div style={{
            width: 96,
            background: '#fff',
            borderRight: '1px solid #e5e5e5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 32, paddingBottom: 32,
            overflowY: 'auto',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', width: '100%', position: 'relative' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute',
                top: 20, bottom: 20,
                left: '50%', transform: 'translateX(-50%)',
                width: 1,
                background: '#e5e5e5',
                zIndex: 0,
              }} />
              {days.map((_: any, i: number) => {
                const isActive = i === activeDayIdx;
                return (
                  <button
                    key={i}
                    onClick={() => { setActiveDayIdx(i); setExpandedEvt(null); }}
                    style={{
                      position: 'relative', zIndex: 1,
                      width: 40, height: 40,
                      borderRadius: '50%',
                      background: isActive ? 'white' : 'white',
                      border: isActive ? '2px solid #c5a065' : '1px solid #e5e5e5',
                      color: isActive ? '#c5a065' : '#717171',
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isActive ? '0 0 0 4px rgba(197,160,101,0.15)' : 'none',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blueprint Grid Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '48px',
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          >
            <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 80 }}>

              {/* Day Header */}
              {activeDay ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, borderBottom: '1px solid #e5e5e5', paddingBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                      <h2 style={{ fontSize: 60, fontWeight: 200, letterSpacing: '-0.02em', margin: 0, color: '#1a1a1a', lineHeight: 1 }}>
                        Day {String(activeDayIdx + 1).padStart(2, '0')}
                      </h2>
                      <span style={{ fontSize: 20, fontWeight: 300, color: '#717171' }}>
                        {formatDayTitle(activeDay.date)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                        padding: '4px 12px', background: '#f0f0f0', color: '#717171',
                      }}>
                        {events.length} EVENTS
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                        padding: '4px 12px', background: '#c5a065', color: '#fff',
                      }}>
                        ACTIVE DAY
                      </span>
                    </div>
                  </div>

                  {/* Events Timeline */}
                  <div style={{ position: 'relative' }}>
                    {/* Vertical line */}
                    <div style={{
                      position: 'absolute',
                      left: 29, top: 32, bottom: 32,
                      width: 1, background: '#e5e5e5',
                      zIndex: 0,
                    }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      {events.map((evt: any, idx: number) => {
                        const isExpanded = expandedEvt === evt.id;
                        const status = getStatus(evt);
                        const isCancelled = evt.status === 'cancelled';

                        return (
                          <div key={evt.id} style={{ position: 'relative', paddingLeft: 64 }}>
                            {/* Timeline dot */}
                            <div style={{
                              position: 'absolute',
                              left: idx === 0 ? 23 : 26,
                              top: 32,
                              width: idx === 0 ? 14 : 8,
                              height: idx === 0 ? 14 : 8,
                              borderRadius: '50%',
                              background: idx === 0 ? '#fff' : '#e5e5e5',
                              border: idx === 0 ? '2px solid #1a1a1a' : 'none',
                              zIndex: 1,
                            }} />

                            {/* Disruption Banner */}
                            {evt.disruption && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '8px 16px',
                                border: '1px dashed #d98d8d',
                                background: '#fff',
                                marginBottom: 8,
                              }}>
                                <span style={{ color: '#d98d8d', fontSize: 13 }}>⊗</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#d98d8d', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                  {isCancelled ? '1 Activity Cancelled' : 'Disruption'}
                                </span>
                                <span style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>
                                  — {evt.title}
                                </span>
                                <WhyButton onClick={() => setWhyModal({
                                  title: evt.title,
                                  reason: evt.disruption?.title || 'Change',
                                  originalCost: '₹18,500',
                                  newCost: '₹16,200',
                                  efficiency: 68,
                                  whyText: evt.disruption?.description + ' ' + (evt.disruption?.suggestedAction || ''),
                                })} />
                              </div>
                            )}

                            {/* Event Card */}
                            <div
                              style={{
                                background: isCancelled ? '#f9f9f9' : '#fff',
                                border: '1px solid #e5e5e5',
                                opacity: isCancelled ? 0.6 : 1,
                                filter: isCancelled ? 'grayscale(1)' : 'none',
                                transition: 'border-color 0.2s',
                                cursor: 'pointer',
                                position: 'relative',
                              }}
                              onClick={() => setExpandedEvt(isExpanded ? null : evt.id)}
                              onMouseEnter={e => { if (!isCancelled) (e.currentTarget as HTMLDivElement).style.borderColor = '#a0a0a0'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e5e5'; }}
                            >
                              {/* Blueprint corner indicators */}
                              {!isCancelled && isExpanded && (
                                <>
                                  <div style={{ position: 'absolute', top: 0, left: 0, width: 12, height: 12, borderLeft: '1px solid #1a1a1a', borderTop: '1px solid #1a1a1a' }} />
                                  <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRight: '1px solid #1a1a1a', borderTop: '1px solid #1a1a1a' }} />
                                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: 12, height: 12, borderLeft: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }} />
                                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRight: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }} />
                                </>
                              )}

                              {/* Card Summary Row */}
                              <div style={{ padding: 24, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                                {/* Thumbnail */}
                                <div style={{
                                  width: 96, height: 96,
                                  overflow: 'hidden',
                                  border: '1px solid #e5e5e5',
                                  flexShrink: 0,
                                  position: 'relative',
                                  background: '#f0f0f0',
                                  filter: isCancelled ? 'grayscale(1)' : 'none',
                                }}>
                                  <img
                                    src={getEventImage(evt)}
                                    alt={evt.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(1.1) contrast(0.9)', transition: 'filter 0.3s' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.filter = 'none'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%) brightness(1.1) contrast(0.9)'; }}
                                  />
                                  <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'rgba(255,255,255,0.9)', borderTop: '1px solid #e5e5e5',
                                    padding: '2px 4px', textAlign: 'center',
                                    fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                                  }}>
                                    {evt.type.toUpperCase()}_REF
                                  </div>
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <span style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 13, fontWeight: 700,
                                        background: '#1a1a1a', color: '#fff',
                                        padding: '2px 8px',
                                      }}>
                                        {formatTime(evt.startTime)}
                                      </span>
                                      <span style={{
                                        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                                        padding: '2px 6px',
                                        border: `1px solid ${status.bg}`,
                                        color: status.bg,
                                      }}>
                                        {status.label}
                                      </span>
                                    </div>
                                    <span style={{ color: '#ccc', fontSize: 20, transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                                      ⌄
                                    </span>
                                  </div>
                                  <h3 style={{ fontSize: 22, fontWeight: 300, color: '#1a1a1a', margin: '0 0 8px', lineHeight: 1.2 }}>
                                    {evt.title}
                                  </h3>
                                  <p style={{ fontSize: 14, color: '#717171', fontWeight: 300, margin: '0 0 16px', lineHeight: 1.5 }}>
                                    {evt.description}
                                  </p>
                                  <div style={{ display: 'flex', gap: 16 }}>
                                    <EventMeta icon={<Clock size={14} />} label={durationMins(evt.startTime, evt.endTime)} />
                                    <EventMeta icon={<MapPin size={14} />} label={evt.transport?.mode || evt.accommodation?.hotelName || evt.meal?.restaurantName || evt.activity?.activityType || evt.type} />
                                    {evt.transport?.mode && <EventMeta icon={evt.transport?.mode?.toLowerCase() === 'flight' ? <Plane size={14} /> : <Car size={14} />} label={evt.transport.providerName || evt.transport.mode} />}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                <div style={{ borderTop: '1px dashed #e5e5e5', display: 'flex', background: '#fafafa' }}>
                                  {/* Left: Details */}
                                  <div style={{ flex: 2, padding: 32, borderRight: '1px solid #e5e5e5', background: '#fff', position: 'relative' }}>
                                    <div style={{
                                      position: 'absolute', top: 0, left: 0,
                                      background: '#1a1a1a', color: '#fff',
                                      padding: '4px 10px',
                                      fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
                                      borderBottom: '2px solid #c5a065',
                                    }}>
                                      DETAILS
                                    </div>
                                    <div style={{ marginTop: 24 }}>
                                      {evt.disruption && (
                                        <div style={{ marginBottom: 20, padding: 16, background: '#fff9f9', border: '1px solid #d98d8d' }}>
                                          <p style={{ fontSize: 10, fontWeight: 700, color: '#d98d8d', margin: '0 0 8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                            ⚠ {evt.disruption.title}
                                          </p>
                                          <p style={{ fontSize: 13, color: '#555', margin: '0 0 6px', lineHeight: 1.6 }}>{evt.disruption.description}</p>
                                          <p style={{ fontSize: 12, color: '#8fa391', margin: 0, fontStyle: 'italic' }}>💡 {evt.disruption.suggestedAction}</p>
                                        </div>
                                      )}

                                      <h4 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 12px' }}>OVERVIEW</h4>
                                      <p style={{ fontSize: 15, color: '#333', lineHeight: 1.7, margin: '0 0 24px' }}>
                                        {evt.description}
                                        {evt.activity?.description && <> {evt.activity.description}</>}
                                        {evt.transport?.pickupLocation && (
                                          <> From <strong>{evt.transport.pickupLocation.name}</strong> to <strong>{evt.transport.dropLocation?.name}</strong>.</>
                                        )}
                                        {evt.accommodation?.roomType && (
                                          <> Room type: <strong>{evt.accommodation.roomType}</strong>.</>
                                        )}
                                      </p>

                                      {/* Logistics table */}
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                                        {/* Provider / Guide */}
                                        {(evt.transport?.providerName || evt.activity?.guideDetails?.name || evt.transport?.flightNumber) && (
                                          <div>
                                            <h4 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 10px' }}>
                                              {evt.transport ? 'PROVIDER' : 'GUIDE'}
                                            </h4>
                                            <div style={{ border: '1px solid #e5e5e5', padding: 12, background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
                                              <div style={{ width: 36, height: 36, background: '#e5e5e5', borderRadius: '2px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                                                {evt.transport?.mode === 'Flight' ? '✈' : evt.type === 'accommodation' ? '🏨' : evt.type === 'meal' ? '🍽' : '👤'}
                                              </div>
                                              <div>
                                                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>
                                                  {evt.transport?.providerName || evt.activity?.guideDetails?.name || evt.transport?.flightNumber || evt.meal?.restaurantName}
                                                </p>
                                                <p style={{ fontSize: 11, color: '#717171', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                                                  {evt.transport?.flightNumber || evt.transport?.driverDetails?.vehicleModel || evt.activity?.guideDetails?.experience || evt.meal?.cuisine || ''}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Booking Ref */}
                                        <div>
                                          <h4 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 10px' }}>BOOKING DETAILS</h4>
                                          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                            {[
                                              { k: 'Reference', v: evt.transport?.ticketStatus?.bookingReference || evt.accommodation?.bookingReference || evt.meal?.bookingReference || evt.activity?.ticketReference?.bookingId || 'N/A' },
                                              { k: 'Status', v: (evt.status || 'confirmed').toUpperCase() },
                                              { k: 'Time', v: `${formatTime(evt.startTime)} – ${formatTime(evt.endTime)}` },
                                            ].map(({ k, v }) => (
                                              <li key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px dotted #ddd', paddingBottom: 6, marginBottom: 6 }}>
                                                <span style={{ color: '#717171' }}>{k}</span>
                                                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', fontWeight: 600 }}>{v}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Quick actions */}
                                  <div style={{ flex: 1, padding: 32, background: '#f8f8f8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid #eee' }}>
                                    <div>
                                      <h4 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 16px' }}>QUICK ACTIONS</h4>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {['View Tickets', 'Contact Provider', 'Get Directions', 'Report Issue'].map((action) => (
                                          <button key={action} style={{
                                            width: '100%', textAlign: 'left',
                                            background: '#fff', border: '1px solid #e5e5e5',
                                            padding: '12px 14px',
                                            fontSize: 12, fontWeight: 500,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            cursor: 'pointer', transition: 'border-color 0.2s',
                                            color: '#1a1a1a',
                                          }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#c5a065'; (e.currentTarget as HTMLButtonElement).style.color = '#c5a065'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5e5'; (e.currentTarget as HTMLButtonElement).style.color = '#1a1a1a'; }}
                                          >
                                            {action}
                                            <span style={{ fontSize: 16 }}>→</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Next up */}
                                    <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 16, marginTop: 24 }}>
                                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 8px' }}>NEXT UP</p>
                                      {events[idx + 1] ? (
                                        <>
                                          <p style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', margin: '0 0 8px' }}>
                                            {formatTime(events[idx + 1].startTime)} • {events[idx + 1].title}
                                          </p>
                                          <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: '#c5a065', width: `${Math.min(100, (idx / events.length) * 100 + 10)}%` }} />
                                          </div>
                                        </>
                                      ) : (
                                        <p style={{ fontSize: 12, color: '#999', margin: 0 }}>End of day</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* ── AI-Recommended POI Additions ── */}
                      {/* ── AI-Recommended POI Additions ── */}
                      {(AI_POIS[activeDayIdx] || []).filter(p => !declinedPois.includes(p.id)).map((poi) => {
                        const accepted = acceptedPois.includes(poi.id);
                        return (
                          <div key={poi.id} style={{ position: 'relative', paddingLeft: 64 }}>
                            {/* Gold dot */}
                            <div style={{ position: 'absolute', left: 24, top: 28, width: 10, height: 10, borderRadius: '50%', background: '#c5a065', boxShadow: '0 0 0 4px rgba(197,160,101,0.2)', zIndex: 1 }} />

                            {/* Gradient-border card */}
                            <div>
                              {/* Badge bar */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: -1, position: 'relative', zIndex: 10 }}>
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  background: 'linear-gradient(135deg, #8fa391 0%, #d4c86a 50%, #c5a065 100%)',
                                  color: '#fff', padding: '6px 12px',
                                  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                                }}>
                                  <span style={{ fontSize: 12 }}>✦</span> AGENT RECOMMENDED: {poi.badge}
                                </div>
                                <WhyButton onClick={() => setWhyModal({ title: poi.title, reason: poi.badge, originalCost: poi.originalCost, newCost: poi.newCost, efficiency: poi.efficiency, whyText: poi.whyText })} />
                              </div>

                              {/* Card with hover gradient border */}
                              <div
                                style={{
                                  position: 'relative',
                                  transition: 'all 0.3s',
                                  boxShadow: '0 10px 30px -10px rgba(197,160,101,0.1)',
                                  cursor: 'default',
                                }}
                                onMouseEnter={e => {
                                  const el = e.currentTarget;
                                  const borderEl = el.querySelector('.hover-border') as HTMLElement;
                                  const bgEl = el.querySelector('.default-bg') as HTMLElement;
                                  const ticksEl = el.querySelector('.corner-ticks') as HTMLElement;
                                  if (borderEl) borderEl.style.opacity = '1';
                                  if (bgEl) bgEl.style.opacity = '0';
                                  if (ticksEl) ticksEl.style.opacity = '0';
                                }}
                                onMouseLeave={e => {
                                  const el = e.currentTarget;
                                  const borderEl = el.querySelector('.hover-border') as HTMLElement;
                                  const bgEl = el.querySelector('.default-bg') as HTMLElement;
                                  const ticksEl = el.querySelector('.corner-ticks') as HTMLElement;
                                  if (borderEl) borderEl.style.opacity = '0';
                                  if (bgEl) bgEl.style.opacity = '1';
                                  if (ticksEl) ticksEl.style.opacity = '1';
                                }}
                              >
                                {/* Default Background */}
                                <div className="default-bg" style={{ position: 'absolute', inset: 0, background: '#fff', border: '1px solid #e5e5e5', transition: 'opacity 0.3s', opacity: 1 }} />

                                {/* Corner Ticks (Visible by default, hidden on hover) */}
                                <div className="corner-ticks" style={{ position: 'absolute', inset: 0, transition: 'opacity 0.3s', opacity: 1, pointerEvents: 'none' }}>
                                  {['t-l', 't-r', 'b-l', 'b-r'].map(c => {
                                    const isT = c.startsWith('t');
                                    const isB = c.startsWith('b');
                                    const isL = c.endsWith('l');
                                    const isR = c.endsWith('r');
                                    return (
                                      <div key={c} style={{
                                        position: 'absolute', width: 10, height: 10, zIndex: 2,
                                        top: isT ? -1 : 'auto', bottom: isB ? -1 : 'auto',
                                        left: isL ? -1 : 'auto', right: isR ? -1 : 'auto',
                                        borderTop: isT ? '1.5px solid #c5a065' : 'none',
                                        borderBottom: isB ? '1.5px solid #c5a065' : 'none',
                                        borderLeft: isL ? '1.5px solid #c5a065' : 'none',
                                        borderRight: isR ? '1.5px solid #c5a065' : 'none',
                                      }} />
                                    );
                                  })}
                                </div>

                                {/* Hover Gradient Border */}
                                <div className="hover-border" style={{
                                  position: 'absolute', inset: 0, opacity: 0, transition: 'opacity 0.3s', pointerEvents: 'none',
                                  background: '#fffdf9',
                                  backgroundImage: 'linear-gradient(#fffdf9,#fffdf9), linear-gradient(135deg,#8fa391 0%,#d4c86a 50%,#c5a065 100%)',
                                  backgroundOrigin: 'border-box',
                                  backgroundClip: 'padding-box, border-box',
                                  border: '2px solid transparent',
                                }} />

                                <div style={{ position: 'relative', zIndex: 10, padding: 24, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                                  <div style={{ width: 80, height: 80, overflow: 'hidden', border: '1px solid #c5a065', flexShrink: 0, background: '#f0ede8' }}>
                                    <img src={poi.image} alt={poi.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, background: '#c5a065', color: '#fff', padding: '2px 8px' }}>{poi.time}</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', border: '1px solid #8fa391', color: '#8fa391', padding: '1px 6px' }}>PENDING APPROVAL</span>
                                    </div>
                                    <h3 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', margin: '0 0 6px' }}>{poi.title}</h3>
                                    <p style={{ fontSize: 13, color: '#717171', margin: '0 0 14px', lineHeight: 1.5 }}>{poi.subtitle}</p>
                                    {accepted ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px dashed #e5e5e5', paddingTop: 12 }}>
                                        <span style={{ fontSize: 12, color: '#8fa391', fontWeight: 700 }}>✓ ACCEPTED — Added to your itinerary</span>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderTop: '1px dashed #e5e5e5', paddingTop: 12 }}>
                                        <button onClick={() => setAcceptedPois(p => [...p, poi.id])} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.05em', padding: 0 }}
                                          onMouseEnter={e => (e.currentTarget.style.color = '#c5a065')}
                                          onMouseLeave={e => (e.currentTarget.style.color = '#1a1a1a')}>
                                          <span>⊕</span> ACCEPT
                                        </button>
                                        <button onClick={() => setDeclinedPois(p => [...p, poi.id])} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#717171', letterSpacing: '0.05em', padding: 0 }}
                                          onMouseEnter={e => (e.currentTarget.style.color = '#d98d8d')}
                                          onMouseLeave={e => (e.currentTarget.style.color = '#717171')}>
                                          <span>⊗</span> DECLINE
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Day Summary Box */}
                  <div style={{ marginTop: 40, paddingLeft: 64 }}>
                    <div style={{ border: '1px solid #e5e5e5', padding: 24, background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a1a1a', margin: '0 0 8px' }}>DAY SUMMARY</h4>
                        <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
                          {events.length} events · {activeDay.title}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {activeDayIdx > 0 && (
                          <button
                            onClick={() => { setActiveDayIdx(activeDayIdx - 1); setExpandedEvt(null); }}
                            style={{ padding: '10px 20px', border: '1px solid #e5e5e5', background: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', color: '#717171', textTransform: 'uppercase' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e5e5')}
                          >
                            ← PREV DAY
                          </button>
                        )}
                        {activeDayIdx < days.length - 1 && (
                          <button
                            onClick={() => { setActiveDayIdx(activeDayIdx + 1); setExpandedEvt(null); }}
                            style={{ padding: '10px 20px', background: '#1a1a1a', border: '2px solid transparent', borderBottom: '2px solid #c5a065', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
                          >
                            NEXT DAY →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <p style={{ color: '#717171', fontSize: 14 }}>No itinerary available yet.</p>
                  <button
                    onClick={() => router.push('/customer-login')}
                    style={{ marginTop: 16, padding: '12px 32px', background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    ← BACK
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* WHY? Optimization Modal */}
      {
        whyModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', width: 560, maxWidth: '90vw', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', border: '1px solid #e5e5e5', padding: 32, position: 'relative' }}>
              <button onClick={() => setWhyModal(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 20, lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a1a1a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}>✕</button>

              {/* Header */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, color: '#c5a065' }}>📊</span>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c5a065', margin: 0 }}>TECHNICAL CHANGE ANALYSIS</p>
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 300, color: '#1a1a1a', margin: '0 0 4px' }}>Optimization Logic</h2>
                <p style={{ fontSize: 13, color: '#717171', margin: 0 }}>{whyModal.title}</p>
              </div>

              {/* Persuasive text */}
              <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', padding: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: '#333', lineHeight: 1.7, margin: 0 }}>{whyModal.whyText}</p>
              </div>

              {/* Route efficiency bar */}
              <div style={{ border: '1px solid #e5e5e5', padding: 16, background: '#fafafa', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Route Efficiency</span>
                  <span style={{ fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#c5a065,#d4c86a,#8fa391)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>+{whyModal.efficiency}%</span>
                </div>
                <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${whyModal.efficiency}%`, background: 'linear-gradient(90deg,#c5a065,#d4c86a,#8fa391)', transition: 'width 0.8s ease' }} />
                </div>
                <p style={{ fontSize: 12, color: '#717171', margin: '8px 0 0', fontStyle: 'italic' }}>{whyModal.reason}</p>
              </div>

              {/* Cost comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ border: '1px solid #e5e5e5', padding: 16, background: '#fff' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#717171', margin: '0 0 8px' }}>ORIGINAL COST</p>
                  <p style={{ fontSize: 18, fontFamily: "'JetBrains Mono',monospace", color: '#aaa', textDecoration: 'line-through', margin: 0 }}>{whyModal.originalCost}</p>
                </div>
                <div style={{ border: '1px solid #c5a065', padding: 16, background: '#fffdf9' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c5a065', margin: '0 0 8px' }}>OPTIMIZED COST</p>
                  <p style={{ fontSize: 18, fontFamily: "'JetBrains Mono',monospace", color: '#1a1a1a', fontWeight: 700, margin: 0 }}>{whyModal.newCost}</p>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setWhyModal(null)} style={{ flex: 1, background: '#1a1a1a', color: '#fff', border: 'none', borderBottom: '2px solid #c5a065', padding: '12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}>
                  CONFIRM METRICS
                </button>
                <button onClick={() => setWhyModal(null)} style={{ flex: 1, background: '#fff', border: '1px solid #e5e5e5', padding: '12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', color: '#717171' }}
                  onMouseEnter={e => { (e.currentTarget.style.borderColor = '#1a1a1a'); (e.currentTarget.style.color = '#1a1a1a'); }}
                  onMouseLeave={e => { (e.currentTarget.style.borderColor = '#e5e5e5'); (e.currentTarget.style.color = '#717171'); }}>
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* CSS keyframes for spin */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div >
  );
};

/* WHY? button with green-gold gradient hover */
const WhyButton = ({ onClick }: { onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginLeft: 0,
        padding: '5px 12px',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
        cursor: 'pointer',
        border: 'none',
        background: hovered
          ? 'linear-gradient(135deg, #8fa391 0%, #d4c86a 50%, #c5a065 100%)'
          : 'rgba(197,160,101,0.1)',
        color: hovered ? '#fff' : '#c5a065',
        transition: 'all 0.25s ease',
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      WHY?
    </button>
  );
};

/* Small helper component */
const EventMeta = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555' }}>
    <span style={{ display: 'flex', alignItems: 'center', color: '#c5a065' }}>{icon}</span>
    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
  </div>
);

export default EnhancedCustomerPortalInteractive;
