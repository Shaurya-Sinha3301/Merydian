'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import activeGroupsData from '@/lib/agent-dashboard/data/active_groups.json';
import upcomingGroupsData from '@/lib/agent-dashboard/data/upcoming_groups.json';

const GOLD = '#c5a065';
const DARK = '#1a1a1a';
const MID = '#717171';
const LIGHT = '#e5e5e5';
const GREEN = '#8fa391';

const NOTIFICATIONS = [
    { id: 'n1', time: '09:15', title: 'Lunch reservation moved to 13:30', detail: 'Kaiseki Lunch at Kikunoi rescheduled due to traffic near the temple district.', severity: 'warning' },
    { id: 'n2', time: '08:40', title: 'Transfer confirmed — Mr. Tanaka', detail: 'Car pick-up confirmed for 10:00 AM. Driver is Mr. Tanaka.', severity: 'info' },
];

const TIMELINE_EVENTS = [
    { id: 'te1', time: '10:00', tminus: 'T-2H', title: 'Private Tea Ceremony', subtitle: 'Urasenke Konnichian.', status: null, hasWhy: false },
    { id: 'te2', time: '13:30', tminus: 'NEW TIME', title: 'Kaiseki Lunch at Kikunoi', subtitle: 'Revised due to traffic delay.', status: 'REVISED', hasWhy: true },
    { id: 'te3', time: '15:30', tminus: null, title: 'Shinkansen → Tokyo', subtitle: 'Green Car · Seat 4A.', status: null, hasWhy: false },
];

const VAULT_ITEMS = [
    { id: 'v1', icon: '✈', code: 'JL405', detail: 'Business Class · Seat 2K', status: 'CONFIRMED' },
    { id: 'v2', icon: '🏨', code: 'Ritz Carlton', detail: 'River View Suite · Check-in 15:00', status: 'CONFIRMED' },
    { id: 'v3', icon: '🚗', code: 'MK Taxi VIP', detail: 'Private Transfer · Pick-up 09:45', status: 'CONFIRMED' },
];

const INITIAL_MESSAGES = [
    { id: 'm1', sender: 'agent', name: 'AGENT_04', time: '09:15', text: 'Car confirmed for 10am pickup. Driver is Mr. Tanaka.' },
    { id: 'm2', sender: 'user', time: '09:16', text: 'Copy that. Luggage is ready.' },
    { id: 'm3', sender: 'system', text: 'Itinerary Update Detected' },
    { id: 'm4', sender: 'agent', name: 'AGENT_04', time: '11:42', text: "Shifted the lunch reservation to 13:30 due to traffic near the temple district. The 'Why' analysis is attached to your timeline." },
    { id: 'm5', sender: 'user', time: '11:45', text: 'Understood. Will adjust schedule.' },
];

const HERO_IMAGE = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&q=80';

const DEST_META: Record<string, { city: string; country: string; lat: string; lng: string; progress: number }> = {
    GRP001: { city: 'GOA', country: 'India', lat: '15.2993° N', lng: '74.1240° E', progress: 38 },
    GRP002: { city: 'MANALI', country: 'India', lat: '32.2432° N', lng: '77.1892° E', progress: 55 },
    GRP003: { city: 'KERALA', country: 'India', lat: '9.4981° N', lng: '76.3388° E', progress: 20 },
    GRP004: { city: 'JAIPUR', country: 'India', lat: '26.8242° N', lng: '75.8122° E', progress: 68 },
    DEFAULT: { city: 'KYOTO', country: 'Japan', lat: '35.0116° N', lng: '135.7681° E', progress: 45 },
};

export default function CustomerDashboardInteractive() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [familyInitial, setFamilyInitial] = useState('F');
    const [destMeta, setDestMeta] = useState(DEST_META.DEFAULT);
    const [navTab, setNavTab] = useState<'hub' | 'plan' | 'docs' | 'vip'>('hub');
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [chatInput, setChatInput] = useState('');
    const [dismissed, setDismissed] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const familyId = sessionStorage.getItem('familyId');
        if (!familyId) { router.push('/customer-login'); return; }
        let found: any = null, groupId: string | null = null;
        for (const g of activeGroupsData.groups) {
            const f = g.families.find((f: any) => f.id === familyId);
            if (f) { found = f; groupId = g.id; break; }
        }
        if (!groupId) {
            for (const g of upcomingGroupsData.groups) {
                const f = g.families.find((f: any) => f.id === familyId);
                if (f) { found = f; groupId = g.id; break; }
            }
        }
        if (!found) { router.push('/customer-login'); return; }
        setFamilyInitial((found.family_name || 'F')[0].toUpperCase());
        setDestMeta(DEST_META[groupId ?? 'DEFAULT'] ?? DEST_META.DEFAULT);
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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: `2px solid ${DARK}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ color: MID, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading dashboard...</p>
            </div>
        </div>
    );

    const activeNotifs = NOTIFICATIONS.filter(n => !dismissed.includes(n.id));

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: "'Outfit', sans-serif", background: '#f5f5f5', color: DARK, overflow: 'hidden' }}>

            {/* ── SIDEBAR ── */}
            <aside style={{ width: 72, borderRight: `1px solid ${LIGHT}`, background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ height: 72, borderBottom: `1px solid ${LIGHT}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 38, height: 38, background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{familyInitial}</span>
                    </div>
                </div>
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, gap: 2 }}>
                    {[{ id: 'hub', icon: '⊞', label: 'HUB' }, { id: 'plan', icon: '◈', label: 'PLAN' }, { id: 'docs', icon: '⬛', label: 'DOCS' }, { id: 'vip', icon: '◆', label: 'VIP' }].map(({ id, icon, label }) => (
                        <button key={id} onClick={() => setNavTab(id as any)} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 0', cursor: 'pointer', background: navTab === id ? 'rgba(0,0,0,0.03)' : 'transparent', border: 'none', borderRight: navTab === id ? `2px solid ${DARK}` : '2px solid transparent', color: navTab === id ? DARK : '#aaa', transition: 'all 0.2s', gap: 3 }}>
                            <span style={{ fontSize: 18 }}>{icon}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em' }}>{label}</span>
                        </button>
                    ))}
                </nav>
                <div style={{ height: 72, borderTop: `1px solid ${LIGHT}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={logout} title="Logout" style={{ width: 34, height: 34, borderRadius: '50%', background: DARK, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                        {familyInitial}
                    </button>
                </div>
            </aside>

            {/* ── MAIN ── */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER */}
                <header style={{ background: '#fff', borderBottom: `1px solid ${LIGHT}`, padding: '16px 32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                            <span style={{ width: 7, height: 7, background: GREEN, borderRadius: '50%', display: 'inline-block' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: GREEN, fontFamily: "'JetBrains Mono', monospace" }}>ON ROUTE · LIVE TRACKING</span>
                        </div>
                        <h1 style={{ fontSize: 30, fontWeight: 200, letterSpacing: '-0.01em', margin: 0 }}>
                            Current Expedition: <strong style={{ fontWeight: 600 }}>{destMeta.city}, {destMeta.country}</strong>
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: MID, fontFamily: "'JetBrains Mono', monospace" }}>TRIP PROGRESS</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: DARK, fontFamily: "'JetBrains Mono', monospace", marginLeft: 16 }}>{destMeta.progress}%</span>
                            </div>
                            <div style={{ width: 180, height: 3, background: LIGHT }}>
                                <div style={{ height: '100%', width: `${destMeta.progress}%`, background: DARK }} />
                            </div>
                        </div>
                        <button onClick={() => router.push('/customer-portal')} style={{ background: DARK, color: '#fff', border: 'none', borderBottom: `2px solid ${GOLD}`, padding: '10px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#333')} onMouseLeave={e => (e.currentTarget.style.background = DARK)}>
                            VIEW FULL ITINERARY →
                        </button>
                    </div>
                </header>

                {/* BODY: 3 columns */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 430px 280px', overflow: 'hidden' }}>

                    {/* ── LEFT: Hero + Timeline ── */}
                    <div style={{ borderRight: `1px solid ${LIGHT}`, overflowY: 'auto', background: '#fff' }}>

                        {/* Hero */}
                        <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
                            <img src={HERO_IMAGE} alt={destMeta.city} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%) brightness(0.85)', display: 'block' }} />
                            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", padding: '4px 9px', borderLeft: `2px solid ${GOLD}`, letterSpacing: '0.06em' }}>
                                {destMeta.lat}, {destMeta.lng}
                            </div>
                            <div style={{ position: 'absolute', bottom: 12, left: 16, color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '0.2em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{destMeta.city}</div>
                        </div>

                        {/* Timeline section */}
                        <div style={{ padding: '20px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: DARK, fontFamily: "'JetBrains Mono', monospace" }}>UPCOMING TIMELINE</span>
                                <button onClick={() => router.push('/customer-portal')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: GOLD, padding: 0, fontFamily: "'Outfit', sans-serif" }}>
                                    Full view →
                                </button>
                            </div>

                            {/* Notifications */}
                            {activeNotifs.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                                    {activeNotifs.map(n => (
                                        <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: n.severity === 'warning' ? '#fffbf5' : '#f9fffe', border: `1px solid ${n.severity === 'warning' ? '#e8d5b0' : '#c5ddd4'}`, padding: '10px 12px' }}>
                                            <div style={{ width: 3, alignSelf: 'stretch', background: n.severity === 'warning' ? GOLD : GREEN, flexShrink: 0, borderRadius: 1 }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 15, fontWeight: 600, color: DARK, marginBottom: 4 }}>{n.title}</div>
                                                <div style={{ fontSize: 13, color: MID, lineHeight: 1.5 }}>{n.detail}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                                <button onClick={() => router.push('/customer-portal')} style={{ fontSize: 11, fontWeight: 700, color: GOLD, background: 'none', border: `1px solid ${GOLD}`, padding: '3px 8px', cursor: 'pointer' }}>View</button>
                                                <button onClick={() => setDismissed(d => [...d, n.id])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Events */}
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: 42, top: 10, bottom: 10, width: 1, background: LIGHT }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {TIMELINE_EVENTS.map((evt, idx) => (
                                        <div key={evt.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}>
                                            <div style={{ width: 38, flexShrink: 0, textAlign: 'right', paddingRight: 4, paddingTop: 2 }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: evt.status === 'REVISED' ? GOLD : DARK, fontFamily: "'JetBrains Mono', monospace" }}>{evt.time}</div>
                                                {evt.tminus && <div style={{ fontSize: 9, color: evt.status === 'REVISED' ? GOLD : MID, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{evt.tminus}</div>}
                                            </div>
                                            <div style={{ position: 'absolute', left: 38, top: 6, width: idx === 0 ? 9 : 7, height: idx === 0 ? 9 : 7, borderRadius: '50%', background: evt.status === 'REVISED' ? GOLD : (idx === 0 ? '#fff' : LIGHT), border: idx === 0 ? `2px solid ${DARK}` : (evt.status === 'REVISED' ? `1px solid ${GOLD}` : 'none'), zIndex: 1 }} />
                                            <div style={{ flex: 1, background: evt.status === 'REVISED' ? '#fffbf5' : '#fafafa', border: `1px solid ${evt.status === 'REVISED' ? '#e8d5b0' : LIGHT}`, padding: '12px 16px', position: 'relative' }}>
                                                {evt.status && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, color: GOLD, border: `1px solid ${GOLD}`, padding: '1px 5px', fontFamily: "'JetBrains Mono', monospace" }}>{evt.status}</span>}
                                                <div style={{ fontSize: 17, fontWeight: 500, color: DARK, marginBottom: 5, paddingRight: evt.status ? 64 : 0 }}>{evt.title}</div>
                                                <div style={{ fontSize: 14, color: MID }}>{evt.subtitle}</div>
                                                {evt.hasWhy && (
                                                    <button onClick={() => router.push('/customer-portal')} style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: GOLD, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, display: 'inline-block' }} />
                                                        View 'Why' Analysis
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── CENTRE: CHAT ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderRight: `1px solid ${LIGHT}`, overflow: 'hidden' }}>
                        {/* Chat header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${LIGHT}`, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ width: 8, height: 8, background: GREEN, borderRadius: '50%', boxShadow: `0 0 0 3px rgba(143,163,145,0.2)`, display: 'inline-block' }} />
                                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: DARK, fontFamily: "'JetBrains Mono', monospace" }}>COMM-LINK: AGENT_04</span>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 8px', fontFamily: "'JetBrains Mono', monospace" }}>SECURE</span>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {messages.map(msg => (
                                <div key={msg.id}>
                                    {msg.sender === 'system' ? (
                                        <div style={{ textAlign: 'center', margin: '4px 0' }}>
                                            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: GOLD, border: `1px solid #e8d5b0`, padding: '4px 14px', background: '#fffbf5', letterSpacing: '0.06em' }}>
                                                · {msg.text} ·
                                            </span>
                                        </div>
                                    ) : msg.sender === 'agent' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: MID, letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace" }}>{msg.name}  [{msg.time}]</span>
                                            <div style={{ background: '#f5f5f5', border: `1px solid ${LIGHT}`, color: DARK, fontSize: 14, lineHeight: 1.65, padding: '13px 16px', maxWidth: '80%', fontWeight: 400 }}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: MID, letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace" }}>You  [{msg.time}]</span>
                                            <div style={{ background: DARK, color: '#fff', fontSize: 14, lineHeight: 1.65, padding: '13px 16px', maxWidth: '80%', fontWeight: 400 }}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{ borderTop: `1px solid ${LIGHT}`, display: 'flex', alignItems: 'center', background: '#fafafa', flexShrink: 0 }}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && send()}
                                placeholder="Type a message..."
                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: DARK, fontSize: 14, padding: '16px 20px', fontFamily: "'Outfit', sans-serif" }}
                            />
                            <button onClick={send}
                                style={{ padding: '0 20px', height: 52, background: 'none', border: 'none', borderLeft: `1px solid ${LIGHT}`, color: MID, fontSize: 18, cursor: 'pointer', transition: 'color 0.2s, background 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.color = DARK; e.currentTarget.style.background = LIGHT; }}
                                onMouseLeave={e => { e.currentTarget.style.color = MID; e.currentTarget.style.background = 'none'; }}>
                                ➤
                            </button>
                        </div>
                    </div>

                    {/* ── RIGHT: Vault + Stats + Agent ── */}
                    <div style={{ background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto', borderLeft: `1px solid ${LIGHT}` }}>

                        {/* Travel Vault */}
                        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${LIGHT}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: DARK, fontFamily: "'JetBrains Mono', monospace" }}>TRAVEL VAULT</span>
                                <span style={{ fontSize: 9, fontWeight: 700, color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 7px', fontFamily: "'JetBrains Mono', monospace" }}>SECURE</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {VAULT_ITEMS.map(item => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${LIGHT}`, padding: '11px 12px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#999')} onMouseLeave={e => (e.currentTarget.style.borderColor = LIGHT)}>
                                        <div style={{ width: 32, height: 32, background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 1 }}>{item.code}</div>
                                            <div style={{ fontSize: 12, color: MID }}>{item.detail}</div>
                                        </div>
                                        <span style={{ fontSize: 8, fontWeight: 700, color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 5px', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{item.status}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => router.push('/customer-portal')} style={{ marginTop: 12, width: '100%', background: 'none', border: `1px solid ${LIGHT}`, padding: '9px 0', fontSize: 12, fontWeight: 600, color: MID, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.color = DARK; e.currentTarget.style.borderColor = DARK; }} onMouseLeave={e => { e.currentTarget.style.color = MID; e.currentTarget.style.borderColor = LIGHT; }}>
                                View Full Itinerary →
                            </button>
                        </div>

                        {/* Today's Brief */}
                        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${LIGHT}` }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: DARK, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 12 }}>TODAY'S BRIEF</span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[
                                    { label: 'Events', value: '3', unit: 'today' },
                                    { label: 'Pickup', value: '09:45', unit: 'Mr. Tanaka' },
                                    { label: 'Check-in', value: '15:00', unit: 'Ritz Carlton' },
                                    { label: 'Flight', value: 'JL405', unit: 'Seat 2K' },
                                ].map(s => (
                                    <div key={s.label} style={{ background: '#fafafa', border: `1px solid ${LIGHT}`, padding: '12px 12px' }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</div>
                                        <div style={{ fontSize: 18, fontWeight: 600, color: DARK, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{s.unit}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Assigned Agent */}
                        <div style={{ padding: '18px 20px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: DARK, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 12 }}>ASSIGNED AGENT</span>
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
                                    {['☎', '✉'].map((ic, i) => (
                                        <div key={i} style={{ width: 30, height: 30, border: `1px solid ${LIGHT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: MID, transition: 'border-color 0.2s' }}
                                            onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD)} onMouseLeave={e => (e.currentTarget.style.borderColor = LIGHT)}>
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
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; }
      `}</style>
        </div>
    );
}
