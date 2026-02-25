'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import activeGroupsData from '@/lib/agent-dashboard/data/active_groups.json';
import upcomingGroupsData from '@/lib/agent-dashboard/data/upcoming_groups.json';

/* ── Design tokens ── */
const GOLD = '#c5a065';
const DARK = '#1a1a1a';
const MID = '#717171';
const LIGHT = '#e5e5e5';
const GREEN = '#8fa391';
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
            <div style={{ width: 3, height: 14, background: GOLD, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: DARK, fontFamily: FF_MONO }}>{children}</span>
        </div>
    );
}

/* ── Static data ── */
const NOTIFICATIONS = [
    { id: 'n1', time: '09:15', title: 'Lunch reservation moved to 13:30', detail: 'Kaiseki Lunch rescheduled due to traffic near the temple district.', severity: 'warning' },
    { id: 'n2', time: '08:40', title: 'Transfer confirmed — Mr. Tanaka', detail: 'Car pick-up confirmed for 10:00 AM.', severity: 'info' },
];

const TIMELINE_EVENTS = [
    { id: 'te1', time: '10:00', tminus: 'T-2H', title: 'Private Tea Ceremony', subtitle: 'Urasenke Konnichian.', status: null, hasWhy: false },
    { id: 'te2', time: '13:30', tminus: 'NEW TIME', title: 'Kaiseki Lunch at Kikunoi', subtitle: 'Revised — traffic delay.', status: 'REVISED', hasWhy: true },
    { id: 'te3', time: '15:30', tminus: null, title: 'Shinkansen → Tokyo', subtitle: 'Green Car · Seat 4A.', status: null, hasWhy: false },
];

const VAULT_ITEMS = [
    { id: 'v1', icon: '✈', code: 'JL405', detail: 'Business Class · Seat 2K', status: 'CONFIRMED' },
    { id: 'v2', icon: '🏨', code: 'Ritz Carlton', detail: 'River View Suite · Check-in 15:00', status: 'CONFIRMED' },
    { id: 'v3', icon: '🚗', code: 'MK Taxi VIP', detail: 'Private Transfer · Pick-up 09:45', status: 'CONFIRMED' },
];

const BRIEF_STATS = [
    { label: 'Events', value: '3', unit: 'today' },
    { label: 'Pickup', value: '09:45', unit: 'Mr. Tanaka' },
    { label: 'Check-in', value: '15:00', unit: 'Ritz Carlton' },
    { label: 'Flight', value: 'JL405', unit: 'Seat 2K' },
];

const INITIAL_MESSAGES = [
    { id: 'm1', sender: 'agent', name: 'AGENT_04', time: '09:15', text: 'Car confirmed for 10am pickup. Driver is Mr. Tanaka.' },
    { id: 'm2', sender: 'user', time: '09:16', text: 'Copy that. Luggage is ready.' },
    { id: 'm3', sender: 'system', text: 'Itinerary Update Detected' },
    { id: 'm4', sender: 'agent', name: 'AGENT_04', time: '11:42', text: "Shifted the lunch reservation to 13:30 due to traffic near the temple district. The 'Why' analysis is attached to your timeline." },
    { id: 'm5', sender: 'user', time: '11:45', text: 'Understood. Will adjust schedule.' },
];

const HERO_IMG = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&q=80';
const DEST: Record<string, { city: string; country: string; lat: string; lng: string; progress: number }> = {
    GRP001: { city: 'GOA', country: 'India', lat: '15.2993° N', lng: '74.1240° E', progress: 38 },
    GRP002: { city: 'MANALI', country: 'India', lat: '32.2432° N', lng: '77.1892° E', progress: 55 },
    GRP003: { city: 'KERALA', country: 'India', lat: '9.4981° N', lng: '76.3388° E', progress: 20 },
    GRP004: { city: 'JAIPUR', country: 'India', lat: '26.8242° N', lng: '75.8122° E', progress: 68 },
    DEFAULT: { city: 'KYOTO', country: 'Japan', lat: '35.0116° N', lng: '135.7681° E', progress: 45 },
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function CustomerDashboardInteractive() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [familyInitial, setFamilyInitial] = useState('F');
    const [destMeta, setDestMeta] = useState(DEST.DEFAULT);
    const [navTab, setNavTab] = useState<'hub' | 'plan' | 'docs' | 'vip'>('hub');
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [chatInput, setChatInput] = useState('');
    const [dismissed, setDismissed] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fid = sessionStorage.getItem('familyId');
        if (!fid) { router.push('/customer-login'); return; }
        let found: any = null, gid: string | null = null;
        for (const g of [...activeGroupsData.groups, ...upcomingGroupsData.groups]) {
            const f = g.families.find((f: any) => f.id === fid);
            if (f) { found = f; gid = g.id; break; }
        }
        if (!found) { router.push('/customer-login'); return; }
        setFamilyInitial((found.family_name || 'F')[0].toUpperCase());
        setDestMeta(DEST[gid ?? 'DEFAULT'] ?? DEST.DEFAULT);
        setIsLoading(false);
    }, [router]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const logout = () => { sessionStorage.removeItem('familyId'); router.push('/customer-login'); };

    const send = () => {
        const txt = chatInput.trim();
        if (!txt) return;
        const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        setMessages(p => [...p, { id: `u${Date.now()}`, sender: 'user', time: ts, text: txt }]);
        setChatInput('');
        setTimeout(() => setMessages(p => [...p, { id: `a${Date.now()}`, sender: 'agent', name: 'AGENT_04', time: ts, text: 'Noted. I will update your itinerary and confirm all changes shortly.' }]), 1200);
    };

    if (isLoading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: FF_BODY }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: `2px solid ${DARK}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ color: MID, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading dashboard...</p>
            </div>
        </div>
    );

    const activeNotifs = NOTIFICATIONS.filter(n => !dismissed.includes(n.id));

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: FF_BODY, background: '#f5f5f5', color: DARK, overflow: 'hidden' }}>

            {/* ══ SIDEBAR ══ */}
            <aside style={{ width: 72, borderRight: `1px solid ${LIGHT}`, background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ height: 72, borderBottom: `1px solid ${LIGHT}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 38, height: 38, background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{familyInitial}</span>
                    </div>
                </div>
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, gap: 2 }}>
                    {([{ id: 'hub', icon: '⊞', label: 'HUB' }, { id: 'plan', icon: '◈', label: 'PLAN' }, { id: 'docs', icon: '⬛', label: 'DOCS' }, { id: 'vip', icon: '◆', label: 'VIP' }] as const).map(({ id, icon, label }) => (
                        <button key={id} onClick={() => setNavTab(id)}
                            style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 0', cursor: 'pointer', background: navTab === id ? 'rgba(0,0,0,0.03)' : 'transparent', border: 'none', borderRight: navTab === id ? `2px solid ${DARK}` : '2px solid transparent', color: navTab === id ? DARK : '#aaa', transition: 'all 0.2s', gap: 3 }}>
                            <span style={{ fontSize: 18 }}>{icon}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em' }}>{label}</span>
                        </button>
                    ))}
                </nav>
                <div style={{ height: 72, borderTop: `1px solid ${LIGHT}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={logout} style={{ width: 34, height: 34, borderRadius: '50%', background: DARK, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                        {familyInitial}
                    </button>
                </div>
            </aside>

            {/* ══ MAIN ══ */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER */}
                <header style={{ background: '#fff', borderBottom: `1px solid ${LIGHT}`, padding: '16px 36px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ width: 7, height: 7, background: GREEN, borderRadius: '50%', display: 'inline-block' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: GREEN, fontFamily: FF_MONO }}>ON ROUTE · LIVE TRACKING</span>
                        </div>
                        <h1 style={{ fontSize: 30, fontWeight: 200, margin: 0 }}>
                            Current Expedition: <strong style={{ fontWeight: 600 }}>{destMeta.city}, {destMeta.country}</strong>
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: MID, fontFamily: FF_MONO }}>TRIP PROGRESS</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, fontFamily: FF_MONO }}>{destMeta.progress}%</span>
                            </div>
                            <div style={{ width: 180, height: 3, background: LIGHT }}>
                                <div style={{ height: '100%', width: `${destMeta.progress}%`, background: GOLD }} />
                            </div>
                        </div>
                        <button onClick={() => router.push('/customer-portal')} className="btn-dark"
                            style={{ background: DARK, color: '#fff', border: 'none', borderBottom: `2px solid ${GOLD}`, padding: '10px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: FF_BODY }}>
                            VIEW FULL ITINERARY →
                        </button>
                    </div>
                </header>

                {/* 3-COLUMN BODY */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 430px 280px', overflow: 'hidden' }}>

                    {/* ── LEFT: Hero + Timeline ── */}
                    <div style={{ borderRight: `1px solid ${LIGHT}`, overflowY: 'auto', background: '#fff' }}>

                        {/* Hero */}
                        <div style={{ position: 'relative', height: 220, overflow: 'hidden', flexShrink: 0 }}>
                            <img src={HERO_IMG} alt={destMeta.city} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(20%) brightness(0.88)', display: 'block' }} />
                            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.68)', color: '#fff', fontSize: 10, fontFamily: FF_MONO, padding: '4px 10px', borderLeft: `2px solid ${GOLD}`, letterSpacing: '0.07em' }}>
                                {destMeta.lat}, {destMeta.lng}
                            </div>
                            <div style={{ position: 'absolute', bottom: 16, left: 20, color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '0.22em', textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}>
                                {destMeta.city}
                            </div>
                            {/* gold rule at bottom of hero */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
                        </div>

                        {/* Timeline */}
                        <div style={{ padding: '24px 28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <SectionLabel>UPCOMING TIMELINE</SectionLabel>
                                <button onClick={() => router.push('/customer-portal')} className="link-gold"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: MID, fontFamily: FF_BODY }}>
                                    Full view →
                                </button>
                            </div>

                            {/* Notification banners */}
                            {activeNotifs.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                                    {activeNotifs.map(n => {
                                        const warn = n.severity === 'warning';
                                        return (
                                            <HoverCard key={n.id} revised={warn} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px' }}>
                                                <div style={{ width: 3, alignSelf: 'stretch', background: warn ? GOLD : GREEN, flexShrink: 0 }} />
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
                                        );
                                    })}
                                </div>
                            )}

                            {/* Timeline events: [time 68px] [dot-track 24px] [card flex] */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {TIMELINE_EVENTS.map((evt, idx) => {
                                    const rev = evt.status === 'REVISED';
                                    const first = idx === 0;
                                    return (
                                        <div key={evt.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                                            {/* Time */}
                                            <div style={{ width: 68, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: 10, paddingRight: 8 }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: rev ? GOLD : DARK, fontFamily: FF_MONO, lineHeight: 1 }}>{evt.time}</div>
                                                {evt.tminus && <div style={{ fontSize: 9, color: rev ? GOLD : MID, fontFamily: FF_MONO, marginTop: 3, letterSpacing: '0.08em' }}>{evt.tminus}</div>}
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
                                                    {evt.hasWhy && (
                                                        <button onClick={() => router.push('/customer-portal')} className="link-gold"
                                                            style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: GOLD, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 5, fontFamily: FF_BODY }}>
                                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, display: 'inline-block' }} />
                                                            View 'Why' Analysis
                                                        </button>
                                                    )}
                                                </HoverCard>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── CENTRE: Chat ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: `1px solid ${LIGHT}`, borderRight: `1px solid ${LIGHT}`, overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${LIGHT}`, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ width: 8, height: 8, background: GREEN, borderRadius: '50%', display: 'inline-block', boxShadow: `0 0 0 3px rgba(143,163,145,0.2)` }} />
                                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', color: DARK, fontFamily: FF_MONO }}>COMM-LINK: AGENT_04</span>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 8px', fontFamily: FF_MONO, letterSpacing: '0.1em' }}>SECURE</span>
                        </div>
                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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

                    {/* ── RIGHT: Vault + Brief + Agent ── */}
                    <div style={{ background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                        {/* TRAVEL VAULT */}
                        <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${LIGHT}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <SectionLabel>TRAVEL VAULT</SectionLabel>
                                <span style={{ fontSize: 8, fontWeight: 700, color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 7px', fontFamily: FF_MONO }}>SECURE</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {VAULT_ITEMS.map(item => (
                                    <div key={item.id} className="vault-row"
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', cursor: 'pointer', background: '#fafafa', position: 'relative' }}>
                                        <div style={{ width: 32, height: 32, background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 1 }}>{item.code}</div>
                                            <div style={{ fontSize: 11, color: MID }}>{item.detail}</div>
                                        </div>
                                        <span style={{ fontSize: 7, fontWeight: 700, color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 4px', flexShrink: 0, fontFamily: FF_MONO }}>{item.status}</span>
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
                                {BRIEF_STATS.map(s => (
                                    <div key={s.label} className="stat-tile"
                                        style={{ background: '#fafafa', padding: '11px 12px', cursor: 'default' }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontFamily: FF_MONO }}>{s.label}</div>
                                        <div className="stat-value" style={{ fontSize: 18, fontWeight: 600, color: DARK, lineHeight: 1, fontFamily: FF_MONO }}>{s.value}</div>
                                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{s.unit}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ASSIGNED AGENT */}
                        <div style={{ padding: '18px 20px' }}>
                            <div style={{ marginBottom: 14 }}><SectionLabel>ASSIGNED AGENT</SectionLabel></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${LIGHT}`, padding: 14 }}>
                                <div style={{ width: 42, height: 42, background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, flexShrink: 0 }}>A4</div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 3 }}>AGENT_04</div>
                                    <div style={{ fontSize: 12, color: GREEN, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
                                        Available · Kyoto Desk
                                    </div>
                                </div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                    {['☎', '✉'].map(ic => (
                                        <div key={ic} className="agent-btn"
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

        /* Agent contact icons */
        .agent-btn  { border: 1px solid ${LIGHT}; color: ${MID}; transition: border-color 0.2s, color 0.2s; }
        .agent-btn:hover { border-color: ${GOLD}; color: ${GOLD}; }
      `}</style>
        </div>
    );
}
