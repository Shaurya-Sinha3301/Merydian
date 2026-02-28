'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerSidebar } from '@/app/components/CustomerSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';

/* ── Design tokens ── */
const GOLD = 'var(--gradient-opt-gold)';
const DARK = 'var(--bp-text)';
const MID = 'var(--bp-muted)';
const LIGHT = 'var(--bp-border)';
const GREEN = 'var(--bp-sage)';
const FF_BODY = "'Outfit', sans-serif";
const FF_MONO = "'JetBrains Mono', monospace";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/* ── Corner-tick decoration ── */
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

/* ── Hoverable card ── */
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

/* ── Section label ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 16, background: GOLD, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: DARK, fontFamily: FF_MONO }}>{children}</span>
        </div>
    );
}

/* ── Trip progress helper ── */
function calcProgress(startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) return 0;
    const now = Date.now();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
}

/* ── Today's timeline events ── */
function getTodayEvents(itinerary: any): any[] {
    if (!itinerary?.days?.length) return [];
    const today = new Date().toDateString();
    const todayDay = itinerary.days.find((d: any) => new Date(d.date).toDateString() === today);
    // If no exact match for today, return first day's events as "upcoming"
    const day = todayDay || itinerary.days[0];
    return day?.timelineEvents || [];
}

/* ── Chat message type ── */
interface ChatMsg {
    id: string;
    sender: 'agent' | 'user' | 'system';
    name?: string;
    time?: string;
    text: string;
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function CustomerDashboardInteractive() {
    const { user } = useAuth();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [family, setFamily] = useState<any>(null);
    const [itinerary, setItinerary] = useState<any>(null);
    const [vaultItems, setVaultItems] = useState<any[]>([]);
    const [agentInfo, setAgentInfo] = useState<{ name: string; initials: string; status: string } | null>(null);

    // Chat state
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [agentTyping, setAgentTyping] = useState(false);
    const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const wsRef = useRef<WebSocket | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Notifications (from WS)
    const [notifications, setNotifications] = useState<{ id: string; title: string; detail: string; severity: string }[]>([]);
    const [dismissed, setDismissed] = useState<string[]>([]);

    /* ── Scroll chat to bottom ── */
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    /* ── Auth guard ── */
    useEffect(() => {
        if (!user) return;
        if (user.role !== 'traveller') {
            router.push('/customer-login');
        }
    }, [user, router]);

    /* ── Connect WebSocket ── */
    useEffect(() => {
        if (!user?.id) return;

        const userId = user.id;
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const wsUrl = `${WS_BASE}/ws/traveller/${userId}${token ? `?token=${token}` : ''}`;

        let ws: WebSocket;
        let reconnectTimer: ReturnType<typeof setTimeout>;

        const connect = () => {
            try {
                ws = new WebSocket(wsUrl);
                wsRef.current = ws;
                setWsStatus('connecting');

                ws.onopen = () => {
                    setWsStatus('connected');
                    setMessages(prev => [...prev, {
                        id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        sender: 'system',
                        text: '✓ Secure comm-link established',
                    }]);
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        const msgType = data.type || '';

                        if (msgType === 'connected') return; // welcome msg, already handled by onopen

                        if (msgType === 'itinerary_updated' || msgType === 'itinerary_change') {
                            // Refresh itinerary silently
                            apiClient.getCurrentItinerary().then(itin => setItinerary(itin)).catch(() => { });
                            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                            setNotifications(prev => [...prev, {
                                id: notifId,
                                title: data.message || 'Your itinerary has been updated',
                                detail: data.detail || 'Your agent has made changes to your schedule.',
                                severity: 'warning',
                            }]);
                            setMessages(prev => [...prev, {
                                id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                                sender: 'system',
                                text: 'Itinerary Update Detected',
                            }]);
                        } else if (msgType === 'agent_message' && data.text) {
                            const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                            setMessages(prev => [...prev, {
                                id: `a_ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                                sender: 'agent',
                                name: agentInfo?.name || 'YOUR AGENT',
                                time: ts,
                                text: data.text,
                            }]);
                        } else if (data.message) {
                            // Generic notification
                            setMessages(prev => [...prev, {
                                id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                                sender: 'system',
                                text: data.message,
                            }]);
                        }
                    } catch { }
                };

                ws.onclose = () => {
                    setWsStatus('disconnected');
                    reconnectTimer = setTimeout(connect, 5000);
                };

                ws.onerror = () => {
                    setWsStatus('disconnected');
                    ws.close();
                };
            } catch { }
        };

        connect();
        return () => {
            clearTimeout(reconnectTimer);
            wsRef.current?.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    /* ── Fetch all data on mount ── */
    useEffect(() => {
        if (!user || user.role !== 'traveller') return;

        const fetchAll = async () => {
            try {
                // 1. Family info (destination, dates, agent)
                const fam = await apiClient.getFamilyPreferences().catch(() => null);
                setFamily(fam);

                if (fam?.members) {
                    const agent = fam.members.find((m: any) => m.role === 'agent');
                    if (agent) {
                        const name = agent.full_name || agent.email || 'Your Agent';
                        const initials = name
                            .split(' ')
                            .map((w: string) => w[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();
                        setAgentInfo({ name, initials, status: 'Available' });
                    }
                }

                // 2. Itinerary (today's timeline)
                const itin = await apiClient.getCurrentItinerary().catch(() => null);
                setItinerary(itin);

                // 3. Bookings (travel vault)
                const bookings = await apiClient.getMyBookings().catch(() => ({ hotels: [], flights: [], total: 0 }));
                const all = [...(bookings.hotels || []), ...(bookings.flights || [])];
                setVaultItems(all);

            } catch (err) {
                console.error('[Dashboard] Failed to load data', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAll();
    }, [user]);

    /* ── Send message ── */
    const send = useCallback(async () => {
        const txt = chatInput.trim();
        if (!txt) return;

        const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: `u${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, sender: 'user', time: ts, text: txt }]);
        setChatInput('');
        setAgentTyping(true);

        try {
            // Send through the agent pipeline — it will process the message and return a response
            const result = await apiClient.submitFeedbackMessage(txt);
            const agentName = agentInfo?.name || 'YOUR AGENT';
            const replyTs = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

            // Build a readable reply from agent result
            let replyText = result.action_taken
                ? `${result.action_taken}.`
                : 'Understood. I\'ll review your request and update your itinerary if needed.';

            if (result.explanations?.length > 0) {
                replyText += ' ' + result.explanations.slice(0, 2).join(' ');
            }
            if (result.itinerary_updated) {
                replyText += ' Your itinerary has been updated accordingly.';
                // Silently refresh itinerary
                apiClient.getCurrentItinerary().then(itin => setItinerary(itin)).catch(() => { });
            }

            setMessages(prev => [...prev, { id: `a${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, sender: 'agent', name: agentName, time: replyTs, text: replyText }]);
        } catch {
            const agentName = agentInfo?.name || 'YOUR AGENT';
            const ts2 = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            setMessages(prev => [...prev, {
                id: `a_err${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, sender: 'agent', name: agentName, time: ts2,
                text: 'Received your message. I\'ll follow up shortly.',
            }]);
        } finally {
            setAgentTyping(false);
        }
    }, [chatInput, agentInfo]);

    /* ── Derived values ── */
    const destination = family?.destination || itinerary?.destination || 'Your Destination';
    const destDisplay = destination.toUpperCase().split(',')[0];
    const startDate = family?.start_date || itinerary?.startDate;
    const endDate = family?.end_date || itinerary?.endDate;
    const progress = calcProgress(startDate, endDate);
    const todayEvents = getTodayEvents(itinerary);

    // Build brief stats from today's events
    const accoEvent = todayEvents.find((e: any) => e.type === 'accommodation');
    const flightEvent = todayEvents.find((e: any) => e.type === 'transport' && e.title?.toLowerCase().includes('flight'));
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const briefStats = [
        { label: 'Events Today', value: String(todayEvents.length || '—'), unit: todayEvents.length ? 'scheduled' : 'no data' },
        { label: 'Check-in', value: accoEvent ? formatTime(accoEvent.startTime) : '—', unit: accoEvent?.title || 'No hotel today' },
        { label: 'Flight', value: flightEvent?.title?.split(' ')[0] || '—', unit: flightEvent ? formatTime(flightEvent.startTime) : 'No flight today' },
        { label: 'Trip Day', value: startDate ? `Day ${Math.max(1, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000))}` : '—', unit: family?.trip_name || 'Your trip' },
    ];

    const activeNotifs = notifications.filter(n => !dismissed.includes(n.id));
    const agentDisplayName = agentInfo?.name || 'Your Agent';
    const agentInitials = agentInfo?.initials || 'AG';

    /* ── Loading ── */
    if (isLoading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: FF_BODY }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: `2px solid ${DARK}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ color: MID, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading dashboard...</p>
            </div>
        </div>
    );

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
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                                background: wsStatus === 'connected' ? GREEN : wsStatus === 'connecting' ? GOLD : '#d98d8d',
                                boxShadow: wsStatus === 'connected' ? `0 0 0 3px rgba(143,163,145,0.25)` : 'none',
                                transition: 'background 0.3s',
                            }} />
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: wsStatus === 'connected' ? GREEN : MID, fontFamily: FF_MONO }}>
                                {wsStatus === 'connected' ? 'LIVE TRACKING · CONNECTED' : wsStatus === 'connecting' ? 'CONNECTING...' : 'OFFLINE · RECONNECTING'}
                            </span>
                        </div>
                        <h1 style={{ fontSize: 36, fontWeight: 200, letterSpacing: '-0.02em', margin: 0, color: DARK }}>
                            Current Expedition: <strong style={{ fontWeight: 600 }}>{destDisplay}</strong>
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: MID, fontFamily: FF_MONO }}>TRIP PROGRESS</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, fontFamily: FF_MONO }}>{progress}%</span>
                            </div>
                            <div style={{ width: 180, height: 3, background: LIGHT }}>
                                <div style={{ height: '100%', width: `${progress}%`, background: GOLD, transition: 'width 1s ease' }} />
                            </div>
                            {startDate && endDate && (
                                <div style={{ fontSize: 10, color: MID, marginTop: 4, fontFamily: FF_MONO }}>
                                    {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* 3-COLUMN BODY */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 430px 280px', overflow: 'hidden' }}>

                    {/* ── LEFT: Hero + Timeline ── */}
                    <div style={{ borderRight: `1px solid ${LIGHT}`, overflowY: 'auto', background: '#fff', position: 'relative' }}>

                        {/* Hero image — destination-based */}
                        <div style={{ position: 'sticky', top: 0, zIndex: 10, height: 200, overflow: 'hidden', flexShrink: 0 }}>
                            <img
                                src={
                                    destination.toLowerCase().includes('delhi') ? 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=900&q=80' :
                                        destination.toLowerCase().includes('goa') ? 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&q=80' :
                                            destination.toLowerCase().includes('manali') ? 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80' :
                                                'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&q=80'
                                }
                                alt={destDisplay}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(20%) brightness(0.88)', display: 'block' }}
                            />
                            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.68)', color: '#fff', fontSize: 10, fontFamily: FF_MONO, padding: '4px 10px', borderLeft: `2px solid ${GOLD}`, letterSpacing: '0.07em' }}>
                                {family?.trip_name || itinerary?.itineraryName || 'ACTIVE EXPEDITION'}
                            </div>
                            <div style={{ position: 'absolute', bottom: 16, left: 20, color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '0.22em', textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}>
                                {destDisplay}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
                        </div>

                        {/* Timeline */}
                        <div style={{ paddingBottom: 24 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '24px 28px 20px 28px',
                                position: 'sticky', top: 200, background: '#fff', zIndex: 10,
                            }}>
                                <SectionLabel>TODAY'S TIMELINE</SectionLabel>
                                <button onClick={() => router.push('/customer-portal')} className="btn-gradient-hover"
                                    style={{ border: `1px solid ${LIGHT}`, borderRadius: '2px', padding: '6px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: FF_BODY }}>
                                    Full Itinerary →
                                </button>
                            </div>

                            <div style={{ padding: '0 28px' }}>
                                {/* Notification banners */}
                                {activeNotifs.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                                        {activeNotifs.map(n => (
                                            <HoverCard key={n.id} revised={n.severity === 'warning'} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px' }}>
                                                <div style={{ width: 3, alignSelf: 'stretch', background: n.severity === 'warning' ? GOLD : GREEN, flexShrink: 0 }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 15, fontWeight: 600, color: DARK, marginBottom: 3 }}>{n.title}</div>
                                                    <div style={{ fontSize: 13, color: MID, lineHeight: 1.5 }}>{n.detail}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
                                                    <button onClick={() => router.push('/customer-portal')} className="btn-gold-outline"
                                                        style={{ fontSize: 11, fontWeight: 700, color: GOLD, background: 'none', border: `1px solid ${GOLD}`, padding: '3px 8px', cursor: 'pointer', fontFamily: FF_BODY }}>
                                                        View
                                                    </button>
                                                    <button onClick={() => setDismissed(d => [...d, n.id])}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                                                </div>
                                            </HoverCard>
                                        ))}
                                    </div>
                                )}

                                {/* Timeline events from itinerary */}
                                {todayEvents.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 0', color: MID }}>
                                        <p style={{ fontSize: 14, margin: 0 }}>No events scheduled for today.</p>
                                        <button onClick={() => router.push('/customer-portal')}
                                            style={{ marginTop: 12, background: 'none', border: `1px solid ${GOLD}`, color: GOLD, padding: '8px 20px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                            View Full Itinerary →
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {todayEvents.slice(0, 6).map((evt: any, idx: number) => {
                                            const isFirst = idx === 0;
                                            return (
                                                <div key={evt.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                                                    {/* Time */}
                                                    <div style={{ width: 68, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: 10, paddingRight: 8 }}>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: DARK, fontFamily: FF_MONO, lineHeight: 1 }}>
                                                            {evt.startTime ? formatTime(evt.startTime) : '—'}
                                                        </div>
                                                    </div>
                                                    {/* Dot */}
                                                    <div style={{ width: 24, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                                        <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1, background: LIGHT, left: '50%', transform: 'translateX(-50%)' }} />
                                                        <div style={{
                                                            marginTop: 12, width: isFirst ? 11 : 8, height: isFirst ? 11 : 8,
                                                            borderRadius: '50%', flexShrink: 0, zIndex: 1,
                                                            background: isFirst ? '#fff' : '#ccc',
                                                            border: isFirst ? `2px solid ${DARK}` : `1px solid #ccc`,
                                                        }} />
                                                    </div>
                                                    {/* Card */}
                                                    <div style={{ flex: 1, paddingLeft: 10, paddingBottom: 4 }}>
                                                        <HoverCard style={{ padding: '12px 16px' }}>
                                                            <div style={{ fontSize: 9, fontWeight: 700, color: MID, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, fontFamily: FF_MONO }}>
                                                                {evt.type?.toUpperCase()}
                                                                {evt.status && <span style={{ marginLeft: 8, color: evt.status === 'confirmed' ? GREEN : GOLD }}>{evt.status.toUpperCase()}</span>}
                                                            </div>
                                                            <div style={{ fontSize: 17, fontWeight: 500, color: DARK, marginBottom: 4, lineHeight: 1.3 }}>{evt.title}</div>
                                                            <div style={{ fontSize: 13, color: MID }}>
                                                                {evt.endTime ? `Until ${formatTime(evt.endTime)}` : evt.description || ''}
                                                            </div>
                                                        </HoverCard>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {todayEvents.length > 6 && (
                                            <button onClick={() => router.push('/customer-portal')} style={{ marginLeft: 92, background: 'none', border: 'none', color: GOLD, fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                                                +{todayEvents.length - 6} more events → Full Itinerary
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── CENTRE: Chat (WebSocket-backed) ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: `1px solid ${LIGHT}`, borderRight: `1px solid ${LIGHT}`, overflow: 'hidden' }}>
                        {/* Chat header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${LIGHT}`, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                    width: 8, height: 8,
                                    background: wsStatus === 'connected' ? GREEN : wsStatus === 'connecting' ? GOLD : '#d98d8d',
                                    borderRadius: '50%', display: 'inline-block',
                                    boxShadow: wsStatus === 'connected' ? `0 0 0 3px rgba(143,163,145,0.2)` : 'none',
                                }} />
                                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', color: DARK, fontFamily: FF_MONO }}>
                                    COMM-LINK: {agentDisplayName.toUpperCase().replace(' ', '_')}
                                </span>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: wsStatus === 'connected' ? GREEN : MID, border: `1px solid ${wsStatus === 'connected' ? GREEN : LIGHT}`, padding: '2px 8px', fontFamily: FF_MONO, letterSpacing: '0.1em' }}>
                                {wsStatus === 'connected' ? 'SECURE' : wsStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
                            </span>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {messages.length === 0 && (
                                <div style={{ textAlign: 'center', color: MID, fontSize: 13, marginTop: 40 }}>
                                    <p>Chat with your agent about your itinerary.</p>
                                    <p style={{ fontSize: 11, marginTop: 4 }}>Messages are processed by the AI agent pipeline.</p>
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
                            {agentTyping && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: MID, letterSpacing: '0.08em', fontFamily: FF_MONO }}>{agentDisplayName.toUpperCase().replace(' ', '_')}</span>
                                    <div style={{ background: '#f5f5f5', border: `1px solid ${LIGHT}`, color: MID, fontSize: 14, padding: '13px 16px', maxWidth: '60%', fontStyle: 'italic' }}>
                                        Agent is processing...
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat input */}
                        <div style={{ borderTop: `1px solid ${LIGHT}`, display: 'flex', alignItems: 'center', background: '#fafafa', flexShrink: 0 }}>
                            <input
                                type="text" value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !agentTyping && send()}
                                placeholder="Ask your agent about your itinerary..."
                                disabled={agentTyping}
                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: DARK, fontSize: 14, padding: '16px 20px', fontFamily: FF_BODY, opacity: agentTyping ? 0.5 : 1 }}
                            />
                            <button onClick={send} disabled={agentTyping} className="btn-send"
                                style={{ padding: '0 20px', height: 52, background: 'none', border: 'none', borderLeft: `1px solid ${LIGHT}`, color: MID, fontSize: 18, cursor: agentTyping ? 'not-allowed' : 'pointer', fontFamily: FF_BODY, opacity: agentTyping ? 0.4 : 1 }}>
                                ➤
                            </button>
                        </div>
                    </div>

                    {/* ── RIGHT: Vault + Brief + Agent ── */}
                    <div style={{ background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                        {/* TRAVEL VAULT */}
                        <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${LIGHT}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <SectionLabel>TRAVEL VAULT</SectionLabel>
                                <span style={{ fontSize: 8, fontWeight: 700, color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 7px', fontFamily: FF_MONO }}>SECURE</span>
                            </div>
                            {vaultItems.length === 0 ? (
                                <p style={{ fontSize: 12, color: MID, textAlign: 'center', padding: '16px 0' }}>No confirmed bookings yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {vaultItems.slice(0, 4).map(item => (
                                        <div key={item.id} className="vault-row"
                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', cursor: 'pointer', background: '#fafafa', position: 'relative' }}>
                                            <div style={{ width: 32, height: 32, background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.code}</div>
                                                <div style={{ fontSize: 11, color: MID, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail}</div>
                                            </div>
                                            <span style={{ fontSize: 7, fontWeight: 700, color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 4px', flexShrink: 0, fontFamily: FF_MONO }}>{item.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => router.push('/customer-bookings')} className="btn-outline"
                                style={{ marginTop: 12, width: '100%', background: 'none', padding: '9px 0', fontSize: 12, fontWeight: 600, color: MID, cursor: 'pointer', fontFamily: FF_BODY }}>
                                All Bookings →
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
                                        <div className="stat-value" style={{ fontSize: 16, fontWeight: 600, color: DARK, lineHeight: 1, fontFamily: FF_MONO }}>{s.value}</div>
                                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.unit}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ASSIGNED AGENT */}
                        <div style={{ padding: '18px 20px' }}>
                            <div style={{ marginBottom: 14 }}><SectionLabel>ASSIGNED AGENT</SectionLabel></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${LIGHT}`, padding: 14 }}>
                                <div style={{ width: 42, height: 42, background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, flexShrink: 0 }}>
                                    {agentInitials}
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 3 }}>{agentDisplayName}</div>
                                    <div style={{ fontSize: 12, color: GREEN, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
                                        {agentInfo?.status || 'Your dedicated travel agent'}
                                    </div>
                                </div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                    {['☎', '✉'].map(ic => (
                                        <div key={ic} className="agent-btn"
                                            onClick={() => {
                                                if (ic === '✉') {
                                                    setChatInput(`Hi, I need assistance with my trip to ${destDisplay}.`);
                                                }
                                            }}
                                            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
                                            {ic}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }

        .btn-gold-outline { transition: background 0.2s, color 0.2s; }
        .btn-gold-outline:hover { background: ${GOLD} !important; color: #fff !important; }

        .btn-send   { transition: color 0.2s, background 0.2s; }
        .btn-send:hover { color: ${GOLD} !important; background: ${LIGHT} !important; }

        .vault-row  { border: 1px solid ${LIGHT}; transition: border-color 0.2s, box-shadow 0.2s; }
        .vault-row:hover { border-color: ${GOLD}; box-shadow: 0 2px 10px rgba(197,160,101,0.12); }

        .stat-tile  { border: 1px solid ${LIGHT}; transition: border-color 0.2s, background 0.2s; }
        .stat-tile:hover { border-color: ${GOLD}; background: #fffbf5 !important; }
        .stat-value { transition: color 0.2s; }
        .stat-tile:hover .stat-value { color: ${GOLD}; }

        .btn-outline { border: 1px solid ${LIGHT}; transition: color 0.2s, border-color 0.2s; }
        .btn-outline:hover { color: ${DARK} !important; border-color: ${DARK}; border-bottom-color: ${GOLD}; }

        .btn-gradient-hover { background: transparent; color: ${DARK}; transition: all 0.2s; }
        .btn-gradient-hover:hover { background: var(--gradient-opt); color: #fff !important; border-color: transparent !important; }

        .agent-btn  { border: 1px solid ${LIGHT}; color: ${MID}; transition: border-color 0.2s, color 0.2s; }
        .agent-btn:hover { border-color: ${GOLD}; color: ${GOLD}; }
      `}</style>
        </div>
    );
}
