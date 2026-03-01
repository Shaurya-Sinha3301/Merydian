'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerSidebar } from '@/app/components/CustomerSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { wsService } from '@/services/websocket.service';

/* ── Design tokens ── */
const GOLD = 'var(--gradient-opt-gold)';
const DARK = 'var(--bp-text)';
const MID = 'var(--bp-muted)';
const LIGHT = 'var(--bp-border)';
const GREEN = 'var(--bp-sage)';
const FF_BODY = "'Outfit', sans-serif";
const FF_MONO = "'JetBrains Mono', monospace";

/* ── Corner-tick decoration (shown on hover) ── */
function CornerTick({ color = GOLD }: { color?: string }) {
    const pairs: [string, string][] = [['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']];
    const S = 9;
    return (
        <>
            {pairs.map(([v, h]) => (
                <div key={`${v}${h}`} style={{
                    position: 'absolute', width: S, height: S, zIndex: 4, pointerEvents: 'none',
                    ...(v === 'top' ? { top: -1 } : { bottom: -1 }),
                    ...(h === 'left' ? { left: -1 } : { right: -1 }),
                    borderTop: v === 'top' ? `2px solid ${color}` : 'none',
                    borderBottom: v === 'bottom' ? `2px solid ${color}` : 'none',
                    borderLeft: h === 'left' ? `2px solid ${color}` : 'none',
                    borderRight: h === 'right' ? `2px solid ${color}` : 'none',
                }} />
            ))}
        </>
    );
}

/* ── Hoverable card (timeline / notification) ── */
function HoverCard({ children, style, revised = false }: { children: React.ReactNode; style?: React.CSSProperties; revised?: boolean }) {
    const [hov, setHov] = useState(false);
    return (
        <div style={{
            position: 'relative', transition: 'border-color 0.2s, box-shadow 0.2s',
            border: `1px solid ${hov ? (revised ? GOLD : '#aaa') : (revised ? '#e8d5b0' : LIGHT)}`,
            background: revised ? '#fffbf5' : '#fafafa',
            boxShadow: hov ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
            ...style,
        }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
            {hov && <CornerTick color={revised ? GOLD : '#aaa'} />}
            {children}
        </div>
    );
}

/* ── Section label with gold accent bar ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 16, background: GOLD, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: DARK, fontFamily: FF_MONO }}>{children}</span>
        </div>
    );
}

/* ── Destination image lookup (fallback, keyed by destination substring) ── */
const DEST_IMAGES: Record<string, string> = {
    'goa': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&q=80',
    'delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=900&q=80',
    'manali': 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=900&q=80',
    'kerala': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=900&q=80',
    'jaipur': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=900&q=80',
    'mumbai': 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=900&q=80',
    'kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&q=80',
    'default': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=80',
};
function getDestImage(dest: string) {
    const d = (dest || '').toLowerCase();
    for (const key of Object.keys(DEST_IMAGES)) {
        if (d.includes(key)) return DEST_IMAGES[key];
    }
    return DEST_IMAGES.default;
}

/* ── Helper: compute trip progress from dates ── */
function computeProgress(startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function CustomerDashboardInteractive() {
    const { user } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [trip, setTrip] = useState<any>(null);
    const [itinerary, setItinerary] = useState<any>(null);
    const [familyPrefs, setFamilyPrefs] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [dismissed, setDismissed] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Derived data from real trip/itinerary
    const destination = trip?.destination || itinerary?.destination || familyPrefs?.destination || '';
    const destCity = destination.split(',')[0]?.trim().toUpperCase() || 'YOUR TRIP';
    const destCountry = destination.split(',')[1]?.trim() || '';
    const heroImg = getDestImage(destination);
    const progress = computeProgress(trip?.start_date || itinerary?.start_date, trip?.end_date || itinerary?.end_date);
    const tripName = trip?.trip_name || familyPrefs?.trip_name || `${destCity} Trip`;

    // Today's activities from itinerary
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayDay = itinerary?.days?.find((d: any) => d.date === todayStr) || itinerary?.days?.[0];
    const todayActivities: any[] = todayDay?.activities || [];

    // Build timeline events from real itinerary
    const timelineEvents = todayActivities.map((act: any, idx: number) => ({
        id: act.poi_id || `act_${idx}`,
        time: act.time || '--:--',
        title: act.title || 'Activity',
        subtitle: act.location || act.description || '',
        duration: act.duration ? `${Math.floor(act.duration / 60)}h ${act.duration % 60}m` : '',
        cost: act.cost,
        status: null,
        hasWhy: false,
    }));

    // Build brief stats from real data
    const briefStats = [
        { label: 'Events', value: String(todayActivities.length), unit: 'today' },
        { label: 'Day', value: todayDay?.day_number ? `Day ${todayDay.day_number}` : '-', unit: `of ${itinerary?.days?.length || '-'}` },
        { label: 'Destination', value: destCity.slice(0, 8), unit: destCountry.slice(0, 12) },
        { label: 'Status', value: trip?.status?.toUpperCase() || 'ACTIVE', unit: `${trip?.iteration_count || 0} iterations` },
    ];

    const fetchData = useCallback(async () => {
        try {
            // Fetch trips for this user
            const res = await apiClient.getCustomerTrips();
            const trips = res.items || [];
            const activeTrip = trips.find((t: any) => t.status === 'active') || trips[0];
            if (activeTrip) setTrip(activeTrip);

            // Fetch current itinerary
            try {
                const itin = await apiClient.getCurrentItinerary();
                if (itin) setItinerary(itin);
            } catch { /* no itinerary yet */ }

            // Fetch family preferences for name etc.
            try {
                const prefs = await apiClient.getFamilyPreferences();
                if (prefs) setFamilyPrefs(prefs);
            } catch { /* might not have family set up */ }
        } catch (error) {
            console.error('Failed to load dashboard data', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user || user.role !== 'traveller') {
            router.push('/customer-login');
            return;
        }
        fetchData();
    }, [user, router, fetchData]);

    // WebSocket: live updates
    useEffect(() => {
        if (!user?.id) return;
        wsService.connect('traveller', user.id);
        const unsub = wsService.on('itinerary_updated', (payload: any) => {
            // Auto-refresh dashboard data
            fetchData();
            setMessages(prev => [...prev, {
                id: `sys_${Date.now()}`,
                sender: 'system',
                text: 'Itinerary Updated — your trip has been modified',
            }]);
        });
        return () => { unsub(); wsService.disconnect(); };
    }, [user?.id, fetchData]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = async () => {
        const txt = chatInput.trim();
        if (!txt || chatLoading) return;
        const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        setMessages(p => [...p, { id: `u${Date.now()}`, sender: 'user', time: ts, text: txt }]);
        setChatInput('');
        setChatLoading(true);
        try {
            const response = await apiClient.submitFeedbackMessage(txt);
            const explanationText = response.explanations?.length
                ? response.explanations.join('\n')
                : 'Noted. Your request has been processed.';
            const autoTag = response.auto_approved ? ' [Auto-Approved ✓]' : '';

            // Cost info
            let costInfo = '';
            if (response.cost_analysis) {
                const delta = response.cost_analysis.total_cost_change;
                if (delta !== 0) costInfo = ` | Cost: ${delta > 0 ? '+' : ''}₹${delta.toFixed(0)}`;
            }

            setMessages(p => [...p, {
                id: `a${Date.now()}`,
                sender: 'agent',
                name: 'AI_AGENT',
                time: ts,
                text: explanationText + autoTag + costInfo,
            }]);

            // Refresh itinerary if optimizer made changes
            if (response.itinerary_updated) {
                await fetchData();
                setMessages(p => [...p, {
                    id: `sys_${Date.now()}`,
                    sender: 'system',
                    text: 'Itinerary Updated — timeline refreshed',
                }]);
            }
        } catch (err: any) {
            setMessages(p => [...p, { id: `a${Date.now()}`, sender: 'agent', name: 'SYSTEM', time: ts, text: `Error: ${err.message || 'Failed to process request.'}` }]);
        } finally {
            setChatLoading(false);
        }
    };

    if (isLoading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: FF_BODY }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: `2px solid ${DARK}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ color: MID, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading dashboard...</p>
            </div>
        </div>
    );

    // No trip found — show empty state
    if (!trip && !itinerary) {
        return (
            <div style={{ display: 'flex', height: '100vh', fontFamily: FF_BODY, background: '#f5f5f5', color: DARK }}>
                <CustomerSidebar activeTab="dashboard" />
                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 48 }}>🗺️</div>
                    <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>No Active Trip Found</h2>
                    <p style={{ color: MID, fontSize: 14, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
                        Your travel agent hasn't initialized a trip for your account yet.
                        Once a trip is created with your email, it will appear here automatically.
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: FF_BODY, background: '#f5f5f5', color: DARK, overflow: 'hidden' }}>

            {/* ══ SIDEBAR ══ */}
            <CustomerSidebar activeTab="dashboard" />

            {/* ══ MAIN ══ */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER */}
                <header style={{ background: '#fff', borderBottom: `1px solid ${LIGHT}`, padding: '24px 40px', flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ width: 8, height: 8, background: GREEN, borderRadius: '50%', display: 'inline-block' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: GREEN, fontFamily: FF_MONO }}>
                                {trip?.status?.toUpperCase() || 'ACTIVE'} · {tripName}
                            </span>
                        </div>
                        <h1 style={{ fontSize: 36, fontWeight: 200, letterSpacing: '-0.02em', margin: 0, color: DARK }}>
                            Current Expedition: <strong style={{ fontWeight: 600 }}>{destCity}{destCountry ? `, ${destCountry}` : ''}</strong>
                        </h1>
                        {trip?.start_date && trip?.end_date && (
                            <p style={{ margin: '6px 0 0', fontSize: 12, color: MID, fontFamily: FF_MONO }}>
                                {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: MID, fontFamily: FF_MONO }}>TRIP PROGRESS</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, fontFamily: FF_MONO }}>{progress}%</span>
                            </div>
                            <div style={{ width: 180, height: 3, background: LIGHT }}>
                                <div style={{ height: '100%', width: `${progress}%`, background: GOLD, transition: 'width 0.5s' }} />
                            </div>
                        </div>
                    </div>
                </header>

                {/* 3-COLUMN BODY */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 430px 280px', overflow: 'hidden' }}>

                    {/* ── LEFT: Hero + Timeline ── */}
                    <div style={{ borderRight: `1px solid ${LIGHT}`, overflowY: 'auto', background: '#fff', position: 'relative' }}>

                        {/* Hero */}
                        <div style={{ position: 'sticky', top: 0, zIndex: 10, height: 220, overflow: 'hidden', flexShrink: 0 }}>
                            <img src={heroImg} alt={destCity} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(20%) brightness(0.88)', display: 'block' }} />
                            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.68)', color: '#fff', fontSize: 10, fontFamily: FF_MONO, padding: '4px 10px', borderLeft: `2px solid ${GOLD}`, letterSpacing: '0.07em' }}>
                                {itinerary?.days?.length || 0} DAYS · {todayActivities.length} ACTIVITIES TODAY
                            </div>
                            <div style={{ position: 'absolute', bottom: 16, left: 20, color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '0.22em', textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}>
                                {destCity}
                            </div>
                            {/* gold rule at bottom of hero */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
                        </div>

                        {/* Timeline */}
                        <div style={{ paddingBottom: 24 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '24px 28px 20px 28px',
                                position: 'sticky', top: 220, background: '#fff', zIndex: 10
                            }}>
                                <SectionLabel>UPCOMING TIMELINE</SectionLabel>
                                <button onClick={() => router.push('/customer-portal')} className="btn-gradient-hover"
                                    style={{ border: `1px solid ${LIGHT}`, borderRadius: '2px', padding: '6px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: FF_BODY }}>
                                    Full Itinerary →
                                </button>
                            </div>

                            <div style={{ padding: '0 28px' }}>
                                {/* Info banner when itinerary exists */}
                                {itinerary && todayActivities.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                                        <HoverCard revised={false} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px' }}>
                                            <div style={{ width: 3, alignSelf: 'stretch', background: GREEN, flexShrink: 0 }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 15, fontWeight: 600, color: DARK, marginBottom: 3 }}>
                                                    {todayDay?.day_number ? `Day ${todayDay.day_number}` : 'Today'} — {todayActivities.length} activities scheduled
                                                </div>
                                                <div style={{ fontSize: 13, color: MID, lineHeight: 1.5 }}>
                                                    {todayDay?.date ? new Date(todayDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'View your full itinerary for details.'}
                                                </div>
                                            </div>
                                            <button onClick={() => router.push('/customer-portal')} className="btn-gold-outline"
                                                style={{ fontSize: 11, fontWeight: 700, color: GOLD, background: 'none', border: `1px solid ${GOLD}`, padding: '3px 8px', cursor: 'pointer', fontFamily: FF_BODY, flexShrink: 0 }}>
                                                View
                                            </button>
                                        </HoverCard>
                                    </div>
                                )}

                                {/* No itinerary yet */}
                                {!itinerary && (
                                    <div style={{ padding: '24px 0', textAlign: 'center', color: MID }}>
                                        <p style={{ fontSize: 14 }}>Your itinerary is being prepared by your travel agent. Check back soon!</p>
                                    </div>
                                )}

                                {/* Timeline events from real itinerary */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {timelineEvents.map((evt, idx) => {
                                        const rev = evt.status === 'REVISED';
                                        const first = idx === 0;
                                        return (
                                            <div key={evt.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                                                {/* Time */}
                                                <div style={{ width: 68, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: 10, paddingRight: 8 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: rev ? GOLD : DARK, fontFamily: FF_MONO, lineHeight: 1 }}>{evt.time}</div>
                                                    {evt.duration && <div style={{ fontSize: 9, color: rev ? GOLD : MID, fontFamily: FF_MONO, marginTop: 3, letterSpacing: '0.08em' }}>{evt.duration}</div>}
                                                </div>
                                                {/* Dot + line track */}
                                                <div style={{ width: 24, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                                    <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1, background: LIGHT, left: '50%', transform: 'translateX(-50%)' }} />
                                                    <div style={{
                                                        marginTop: 12, width: first ? 11 : 8, height: first ? 11 : 8, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                                                        background: rev ? GOLD : (first ? '#fff' : '#ccc'),
                                                        border: first ? `2px solid ${DARK}` : rev ? `2px solid ${GOLD}` : `1px solid #ccc`,
                                                        boxShadow: rev ? `0 0 0 3px rgba(197,160,101,0.18)` : 'none',
                                                    }} />
                                                </div>
                                                {/* Card */}
                                                <div style={{ flex: 1, paddingLeft: 10, paddingBottom: 4 }}>
                                                    <HoverCard revised={rev} style={{ padding: '12px 16px' }}>
                                                        {evt.status && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700, color: GOLD, border: `1px solid ${GOLD}`, padding: '1px 6px', fontFamily: FF_MONO, letterSpacing: '0.1em' }}>{evt.status}</span>}
                                                        <div style={{ fontSize: 17, fontWeight: 500, color: DARK, marginBottom: 5, paddingRight: evt.status ? 66 : 0, lineHeight: 1.3 }}>{evt.title}</div>
                                                        <div style={{ fontSize: 14, color: MID }}>{evt.subtitle}</div>
                                                        {evt.cost != null && evt.cost > 0 && (
                                                            <div style={{ marginTop: 6, fontSize: 12, color: GOLD, fontFamily: FF_MONO, fontWeight: 600 }}>
                                                                ₹{evt.cost.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </HoverCard>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── CENTRE: Chat ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: `1px solid ${LIGHT}`, borderRight: `1px solid ${LIGHT}`, overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${LIGHT}`, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ width: 8, height: 8, background: GREEN, borderRadius: '50%', display: 'inline-block', boxShadow: `0 0 0 3px rgba(143,163,145,0.2)` }} />
                                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', color: DARK, fontFamily: FF_MONO }}>COMM-LINK: AI ASSISTANT</span>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 8px', fontFamily: FF_MONO, letterSpacing: '0.1em' }}>SECURE</span>
                        </div>
                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Welcome message when empty */}
                            {messages.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: MID }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>AI Travel Assistant</div>
                                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                                        Ask me to modify your itinerary — add locations, remove stops, change schedules.
                                        Your request runs through the optimizer and updates are applied automatically.
                                    </div>
                                </div>
                            )}
                            {messages.map(msg => (
                                <div key={msg.id}>
                                    {msg.sender === 'system' ? (
                                        <div style={{ textAlign: 'center', margin: '4px 0' }}>
                                            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: GOLD, border: `1px solid #e8d5b0`, padding: '4px 14px', background: '#fffbf5', letterSpacing: '0.06em' }}>· {msg.text} ·</span>
                                        </div>
                                    ) : msg.sender === 'agent' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: MID, letterSpacing: '0.08em', fontFamily: FF_MONO }}>{msg.name} [{msg.time}]</span>
                                            <div style={{ background: '#f5f5f5', border: `1px solid ${LIGHT}`, color: DARK, fontSize: 14, lineHeight: 1.7, padding: '13px 16px', maxWidth: '82%' }}>{msg.text}</div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: MID, letterSpacing: '0.08em', fontFamily: FF_MONO }}>You [{msg.time}]</span>
                                            <div style={{ background: DARK, color: '#fff', fontSize: 14, lineHeight: 1.7, padding: '13px 16px', maxWidth: '82%' }}>{msg.text}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {/* Typing indicator */}
                            {chatLoading && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: MID, letterSpacing: '0.08em', fontFamily: FF_MONO }}>AI_AGENT</span>
                                    <div style={{ background: '#f5f5f5', border: `1px solid ${LIGHT}`, padding: '13px 16px', maxWidth: '82%', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: 'pulse 1s infinite' }} />
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: 'pulse 1s infinite 0.2s' }} />
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: 'pulse 1s infinite 0.4s' }} />
                                        <span style={{ fontSize: 12, color: MID, marginLeft: 6 }}>Running optimizer...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        {/* Input */}
                        <div style={{ borderTop: `1px solid ${LIGHT}`, display: 'flex', alignItems: 'center', background: '#fafafa', flexShrink: 0 }}>
                            <input type="text" value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && send()}
                                placeholder="Type a message..."
                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: DARK, fontSize: 14, padding: '16px 20px', fontFamily: FF_BODY }} />
                            <button onClick={send} className="btn-send"
                                style={{ padding: '0 20px', height: 52, background: 'none', border: 'none', borderLeft: `1px solid ${LIGHT}`, color: MID, fontSize: 18, cursor: 'pointer', fontFamily: FF_BODY }}>
                                ➤
                            </button>
                        </div>
                    </div>

                    {/* ── RIGHT: Trip Details + Brief + AI ── */}
                    <div style={{ background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                        {/* TRIP DETAILS */}
                        <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${LIGHT}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <SectionLabel>TRIP DETAILS</SectionLabel>
                                <span style={{ fontSize: 8, fontWeight: 700, color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 7px', fontFamily: FF_MONO }}>{trip?.status?.toUpperCase() || 'ACTIVE'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    { icon: '📍', code: destination || 'Pending', detail: `Trip: ${tripName}` },
                                    { icon: '📅', code: trip?.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--', detail: trip?.end_date ? `to ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Dates pending' },
                                    { icon: '👥', code: `${trip?.families?.length || 1} Families`, detail: `${trip?.iteration_count || 0} optimizer iterations` },
                                ].map((item, i) => (
                                    <div key={i} className="vault-row"
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', background: '#fafafa', position: 'relative' }}>
                                        <div style={{ width: 32, height: 32, background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 1 }}>{item.code}</div>
                                            <div style={{ fontSize: 11, color: MID }}>{item.detail}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => router.push('/customer-portal')} className="btn-outline"
                                style={{ marginTop: 12, width: '100%', background: 'none', padding: '9px 0', fontSize: 12, fontWeight: 600, color: MID, cursor: 'pointer', fontFamily: FF_BODY }}>
                                View Full Itinerary →
                            </button>
                        </div>

                        {/* TODAY'S BRIEF */}
                        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${LIGHT}` }}>
                            <div style={{ marginBottom: 14 }}><SectionLabel>TODAY'S BRIEF</SectionLabel></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {briefStats.map(s => (
                                    <div key={s.label} className="stat-tile"
                                        style={{ background: '#fafafa', padding: '11px 12px', cursor: 'default' }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontFamily: FF_MONO }}>{s.label}</div>
                                        <div className="stat-value" style={{ fontSize: 18, fontWeight: 600, color: DARK, lineHeight: 1, fontFamily: FF_MONO }}>{s.value}</div>
                                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{s.unit}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI ASSISTANT */}
                        <div style={{ padding: '18px 20px' }}>
                            <div style={{ marginBottom: 14 }}><SectionLabel>AI ASSISTANT</SectionLabel></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${LIGHT}`, padding: 14 }}>
                                <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #0d9488, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, flexShrink: 0, borderRadius: 8 }}>AI</div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 3 }}>Voyageur AI</div>
                                    <div style={{ fontSize: 12, color: GREEN, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
                                        Online · Optimizer Connected
                                    </div>
                                </div>
                            </div>
                            <p style={{ fontSize: 11, color: MID, marginTop: 10, lineHeight: 1.6 }}>
                                Chat with the AI assistant to request changes. Your feedback runs through the optimizer and updates are applied automatically.
                            </p>
                        </div>

                    </div>
                </div>
            </main>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }

        .btn-dark   { transition: background 0.2s; }
        .btn-dark:hover { background: #333 !important; }

        .link-gold  { transition: opacity 0.2s; }
        .link-gold:hover { opacity: 0.7; color: ${GOLD} !important; }

        .btn-gold-outline { transition: background 0.2s, color 0.2s; }
        .btn-gold-outline:hover { background: ${GOLD} !important; color: #fff !important; }

        .btn-send   { transition: color 0.2s, background 0.2s; }
        .btn-send:hover { color: ${GOLD} !important; background: ${LIGHT} !important; }

        /* Vault rows */
        .vault-row  { border: 1px solid ${LIGHT}; transition: border-color 0.2s, box-shadow 0.2s; }
        .vault-row:hover { border-color: ${GOLD}; box-shadow: 0 2px 10px rgba(197,160,101,0.12); }

        /* Stat tiles */
        .stat-tile  { border: 1px solid ${LIGHT}; transition: border-color 0.2s, background 0.2s; }
        .stat-tile:hover { border-color: ${GOLD}; background: #fffbf5 !important; }
        .stat-value { transition: color 0.2s; }
        .stat-tile:hover .stat-value { color: ${GOLD}; }

        /* View full btn */
        .btn-outline { border: 1px solid ${LIGHT}; transition: color 0.2s, border-color 0.2s; }
        .btn-outline:hover { color: ${DARK} !important; border-color: ${DARK}; border-bottom-color: ${GOLD}; }

        /* Full view btn timeline */
        .btn-gradient-hover { background: transparent; color: ${DARK}; transition: all 0.2s; }
        .btn-gradient-hover:hover { background: var(--gradient-opt); color: #fff !important; border-color: transparent !important; box-shadow: 0 2px 8px rgba(197,160,101,0.25); }

        /* Agent contact icons */
        .agent-btn  { border: 1px solid ${LIGHT}; color: ${MID}; transition: border-color 0.2s, color 0.2s; }
        .agent-btn:hover { border-color: ${GOLD}; color: ${GOLD}; }
      `}</style>
        </div>
    );
}
