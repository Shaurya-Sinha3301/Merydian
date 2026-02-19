'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Search, Star, Clock, Key, Plane,
    Send, MoreHorizontal, Maximize2,
    Smile, Meh, Frown, AlertTriangle, Crown,
    Calendar, Users, DollarSign, FileText,
    Sparkles, Zap, MessageSquare, Minimize2,
    MapPin, CheckCircle, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTripById } from '@/lib/trips';

// ─── Types & Mock Data ─────────────────────────────────────────────────────────

type Sentiment = 'happy' | 'neutral' | 'unhappy';
type FamilyFilter = 'all' | 'urgent' | 'happy';

interface FamilyTag {
    label: string;
    color: string;
    icon?: 'vip' | 'warning';
}

interface Family {
    id: string;
    name: string;
    initial: string;
    avatarColor: string;
    pax: number;
    room: string;
    lastMessageTime: string;
    sentiment: Sentiment;
    lastMessage?: string;
    tags?: FamilyTag[];
}

type ActivityType = 'request' | 'review' | 'system';
type LogFilter = 'all' | 'requests' | 'reviews';

interface ActivityLogItem {
    id: string;
    type: ActivityType;
    title: string;
    body?: string;
    time: string;
    accentColor: string;
    iconBg: string;
    icon: React.ElementType;
    actionable?: boolean;
    faded?: boolean;
}

interface ChatMessage {
    role: 'guest' | 'agent';
    text: string;
}

interface AiMessage {
    role: 'user' | 'ai';
    text: string;
    time: string;
}

const FAMILIES: Family[] = [
    {
        id: 'sharma', name: 'Sharma Family', initial: 'S',
        avatarColor: 'bg-blue-100 text-blue-700',
        pax: 4, room: 'Suite 402', lastMessageTime: '14m ago', sentiment: 'happy',
        tags: [
            { label: 'VIP', color: 'bg-blue-100 text-blue-700', icon: 'vip' },
            { label: 'Late Checkout', color: 'bg-amber-100 text-amber-700' },
        ],
    },
    {
        id: 'patel', name: 'Patel Family', initial: 'P',
        avatarColor: 'bg-orange-100 text-orange-700',
        pax: 3, room: 'Villa 12', lastMessageTime: '2h ago', sentiment: 'neutral',
        lastMessage: '"Is the breakfast buffet open until 11?"',
    },
    {
        id: 'mehta', name: 'Mehta Family', initial: 'M',
        avatarColor: 'bg-red-100 text-red-700',
        pax: 2, room: 'Room 204', lastMessageTime: '5h ago', sentiment: 'unhappy',
        tags: [{ label: 'AC Issue', color: 'bg-red-100 text-red-700', icon: 'warning' }],
    },
    {
        id: 'singh', name: 'Singh Family', initial: 'S',
        avatarColor: 'bg-emerald-100 text-emerald-700',
        pax: 5, room: 'Exec Suite', lastMessageTime: '1d ago', sentiment: 'happy',
    },
    {
        id: 'kapoor', name: 'Kapoor Family', initial: 'K',
        avatarColor: 'bg-violet-100 text-violet-700',
        pax: 3, room: 'Room 318', lastMessageTime: '2d ago', sentiment: 'happy',
    },
    {
        id: 'nair', name: 'Nair Family', initial: 'N',
        avatarColor: 'bg-teal-100 text-teal-700',
        pax: 6, room: 'Suite 501', lastMessageTime: '3d ago', sentiment: 'neutral',
    },
];

const ACTIVITY_LOG: ActivityLogItem[] = [
    {
        id: 'act-1', type: 'request', title: 'Late Checkout Request',
        body: '"We\'d love to stay until 3 PM as our flight is in the evening. Any possibility for Room 402?"',
        time: 'Today, 10:45 AM',
        accentColor: 'border-amber-400', iconBg: 'bg-amber-100 text-amber-700',
        icon: Clock, actionable: true,
    },
    {
        id: 'act-2', type: 'review', title: '5-Star Dining Review',
        body: '"The seafood platter at Coastal Grill was phenomenal! The kids loved the live music near the beach."',
        time: 'Yesterday, 08:20 PM',
        accentColor: 'border-green-500', iconBg: 'bg-green-100 text-green-700',
        icon: Star,
    },
    {
        id: 'act-3', type: 'system', title: 'Room Access Granted',
        time: 'Yesterday, 02:00 PM',
        accentColor: 'border-slate-300', iconBg: 'bg-slate-100 text-slate-500',
        icon: Key, faded: true,
    },
    {
        id: 'act-4', type: 'system', title: 'Check-in Complete',
        time: 'Yesterday, 01:45 PM',
        accentColor: 'border-slate-300', iconBg: 'bg-slate-100 text-slate-500',
        icon: Plane, faded: true,
    },
];

const INITIAL_CHAT: ChatMessage[] = [
    { role: 'guest', text: 'Hello, can we get extra towels for the pool?' },
    { role: 'agent', text: "Of course! I've sent a request to housekeeping. They should be there in 10 mins." },
    { role: 'guest', text: 'Thank you! Also about that late checkout...' },
];

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function SentimentIcon({ sentiment }: { sentiment: Sentiment }) {
    if (sentiment === 'happy') return <Smile className="w-4 h-4 text-green-500" />;
    if (sentiment === 'neutral') return <Meh className="w-4 h-4 text-amber-500" />;
    return <Frown className="w-4 h-4 text-red-500" />;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function GroupsView({ tripId }: { tripId: string }) {
    const trip = getTripById(tripId);

    const [familyFilter, setFamilyFilter] = useState<FamilyFilter>('all');
    const [search, setSearch] = useState('');
    const [activeFamilyId, setActiveFamilyId] = useState<string>('sharma');
    const [logFilter, setLogFilter] = useState<LogFilter>('all');
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);

    // Voyageur AI panel — closed by default
    const [aiOpen, setAiOpen] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
    const [aiTyping, setAiTyping] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const aiEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    useEffect(() => {
        aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiMessages, aiTyping]);

    const sendChat = () => {
        const text = chatInput.trim();
        if (!text) return;
        setChatMessages(prev => [...prev, { role: 'agent', text }]);
        setChatInput('');
    };

    const sendAiMessage = () => {
        const text = aiInput.trim();
        if (!text) return;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setAiMessages(prev => [...prev, { role: 'user', text, time: now }]);
        setAiInput('');
        setAiTyping(true);
        setTimeout(() => {
            setAiTyping(false);
            setAiMessages(prev => [
                ...prev,
                { role: 'ai', text: 'I\'m analyzing the request. Based on satisfaction scores, I recommend approving the late checkout for Room 402 – it\'s a low-risk, high-satisfaction move.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            ]);
        }, 1400);
    };

    const filteredFamilies = FAMILIES.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            familyFilter === 'all' ||
            (familyFilter === 'happy' && f.sentiment === 'happy') ||
            (familyFilter === 'urgent' && (f.sentiment === 'unhappy' || f.tags?.some(t => t.icon === 'warning')));
        return matchSearch && matchFilter;
    });

    const filteredLog = ACTIVITY_LOG.filter(a => {
        if (logFilter === 'all') return true;
        if (logFilter === 'requests') return a.type === 'request';
        return a.type === 'review';
    });

    const activeFamilyData = FAMILIES.find(f => f.id === activeFamilyId);

    if (!trip) return <div className="p-8 text-center text-muted-foreground">Trip not found</div>;

    return (
        <div className="flex-1 flex overflow-hidden h-full bg-background relative">

            {/* ── LEFT SIDEBAR: Families ─────────────────────────────────────────── */}
            <aside className="w-[270px] shrink-0 flex flex-col border-r border-slate-200/70 overflow-hidden">
                <div className="px-4 pt-5 pb-3 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-slate-800">Families</h2>
                        <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            {FAMILIES.length} Active
                        </span>
                    </div>
                    <div className="relative mb-2.5">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Find family..."
                            className="w-full neu-pressed rounded-xl py-2 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none bg-transparent border-none"
                        />
                    </div>
                    <div className="flex gap-1.5">
                        {(['all', 'urgent', 'happy'] as FamilyFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFamilyFilter(f)}
                                className={cn(
                                    'flex-1 py-1 rounded-lg text-[10px] font-bold capitalize transition-all',
                                    familyFilter === f
                                        ? f === 'urgent' ? 'bg-red-100 text-red-600 border border-red-200'
                                            : f === 'happy' ? 'bg-green-100 text-green-700 border border-green-200'
                                                : 'bg-slate-800 text-white'
                                        : 'neu-raised text-slate-500 hover:text-slate-700'
                                )}
                            >{f}</button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-24 space-y-2.5">
                    {filteredFamilies.map(family => (
                        <button
                            key={family.id}
                            onClick={() => setActiveFamilyId(family.id)}
                            className={cn(
                                'w-full text-left rounded-2xl p-3.5 transition-all border',
                                family.id === activeFamilyId
                                    ? 'neu-pressed border-l-4 border-l-blue-500 border-blue-200'
                                    : 'neu-raised border-transparent hover:border-slate-200/60 hover:bg-white/40'
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2.5">
                                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', family.avatarColor)}>
                                        {family.initial}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-xs leading-tight">{family.name}</p>
                                        <p className="text-[10px] text-slate-500">{family.pax} Pax • {family.room}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[9px] font-bold text-slate-400">{family.lastMessageTime}</span>
                                    <SentimentIcon sentiment={family.sentiment} />
                                </div>
                            </div>
                            {family.lastMessage && (
                                <p className="text-[10px] text-slate-500 truncate mb-1.5">{family.lastMessage}</p>
                            )}
                            {family.tags && family.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                    {family.tags.map((tag, i) => (
                                        <span key={i} className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase flex items-center gap-0.5', tag.color)}>
                                            {tag.icon === 'vip' && <Crown className="w-2.5 h-2.5" />}
                                            {tag.icon === 'warning' && <AlertTriangle className="w-2.5 h-2.5" />}
                                            {tag.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </aside>

            {/* ── CENTER COLUMN ──────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* Activity Log - 50% height */}
                <div className="flex-1 overflow-hidden p-4 pb-2 flex flex-col">
                    <div className="neu-raised rounded-3xl flex flex-col overflow-hidden border border-white/60 h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-slate-200/40">
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Activity Log</h2>
                                <p className="text-[10px] text-slate-500">Reviews, requests, and system events</p>
                            </div>
                            <div className="flex gap-1 neu-pressed p-1 rounded-xl">
                                {(['all', 'requests', 'reviews'] as LogFilter[]).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setLogFilter(f)}
                                        className={cn(
                                            'px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all',
                                            logFilter === f
                                                ? 'bg-white shadow-sm text-slate-800 border border-slate-100'
                                                : 'text-slate-500 hover:text-slate-800'
                                        )}
                                    >
                                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Compact log items */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-2">
                            {filteredLog.map(item => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            'rounded-xl p-3 border-l-4 bg-white/60 flex items-start gap-3',
                                            item.accentColor,
                                            item.faded && 'opacity-55'
                                        )}
                                    >
                                        {/* Icon */}
                                        <span className={cn('p-1.5 rounded-lg shrink-0', item.iconBg)}>
                                            <Icon className="w-3 h-3" />
                                        </span>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                                <span className="font-bold text-slate-700 text-xs">{item.title}</span>
                                                <span className="text-[9px] text-slate-400 font-bold shrink-0">{item.time}</span>
                                            </div>
                                            {item.body && (
                                                <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{item.body}</p>
                                            )}
                                        </div>

                                        {/* Inline actions (if actionable) */}
                                        {item.actionable && (
                                            <div className="flex flex-col gap-1 shrink-0">
                                                <button className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg hover:bg-slate-700 transition-colors shadow">
                                                    <CheckCircle className="w-2.5 h-2.5" /> Approve
                                                </button>
                                                <button className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition-colors">
                                                    <XCircle className="w-2.5 h-2.5" /> Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Chat - 50% height */}
                <div className="flex-1 px-4 pb-4 flex flex-col">
                    <div className="neu-raised rounded-3xl flex flex-col overflow-hidden border border-white/60 h-full">
                        {/* Chat header */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/40 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="font-bold text-slate-800 text-xs">Chat</span>
                                {activeFamilyData && (
                                    <span className="text-[10px] text-slate-500">— {activeFamilyData.name}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Quick pills */}
                                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                                    {['Send Itinerary', 'Suggest Activity', 'Room Service'].map(label => (
                                        <button key={label} className="whitespace-nowrap text-[9px] neu-raised-sm px-2 py-1 rounded-lg font-bold text-slate-600 hover:text-slate-800 transition-colors border border-white/60">
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2 space-y-1.5 neu-pressed">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={cn('flex', msg.role === 'agent' ? 'justify-end' : 'justify-start')}>
                                    <div className={cn(
                                        'rounded-2xl px-3 py-1.5 text-xs max-w-[75%] shadow-sm',
                                        msg.role === 'guest'
                                            ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                            : 'bg-slate-800 text-white rounded-tr-none shadow-lg'
                                    )}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div className="px-3 py-2 border-t border-slate-200/40 shrink-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                                    placeholder="Type your message..."
                                    className="w-full neu-pressed rounded-xl py-2 pl-3 pr-9 text-xs text-slate-700 placeholder-slate-400 focus:outline-none bg-transparent border-none"
                                />
                                <button
                                    onClick={sendChat}
                                    disabled={!chatInput.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-500 text-white rounded-lg flex items-center justify-center shadow hover:bg-indigo-600 transition-colors disabled:opacity-40"
                                >
                                    <Send className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── RIGHT SIDEBAR ──────────────────────────────────────────────────── */}
            <aside className="w-[256px] shrink-0 flex flex-col gap-3 border-l border-slate-200/70 overflow-y-auto scrollbar-hide p-4">

                {/* Map */}
                <div className="neu-raised rounded-3xl p-1.5 border border-white/60 shrink-0" style={{ height: '190px' }}>
                    <div className="relative w-full h-full rounded-2xl overflow-hidden">
                        <iframe
                            src="https://www.openstreetmap.org/export/embed.html?bbox=73.74%2C15.54%2C73.80%2C15.60&layer=mapnik&marker=15.57%2C73.77"
                            width="100%" height="100%"
                            style={{ border: 'none', filter: 'saturate(0.9) contrast(1.05)' }}
                            scrolling="no"
                            title="Trip Location Map"
                        />
                        <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-white/60 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                                <span className="text-[9px] font-bold text-slate-700">Near Pool Area</span>
                            </div>
                            <button className="text-slate-400 hover:text-slate-700 transition-colors">
                                <Maximize2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Trip Details */}
                <div className="neu-raised rounded-3xl p-4 border border-white/60">
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Trip Details</h3>
                    <div className="space-y-2.5">
                        {[
                            { icon: Calendar, label: 'Dates', value: trip.dateRange },
                            { icon: Users, label: 'Groups', value: `${filteredFamilies.length} Families` },
                            { icon: DollarSign, label: 'Pkg Tier', value: 'Premium All-Inc' },
                            { icon: MapPin, label: 'Client', value: trip.client },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center justify-between pb-2 border-b border-slate-200/40 last:border-0 last:pb-0">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <Icon className="w-3 h-3" />
                                    <span className="text-[10px]">{label}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-800 text-right max-w-[120px] truncate">{value}</span>
                            </div>
                        ))}
                    </div>
                    <button className="mt-4 w-full py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-bold shadow hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        View Contract
                    </button>
                </div>

            </aside>

            {/* ── Voyageur AI Floating Button + Panel (bottom-right, closed by default) ── */}
            <div className="fixed bottom-6 right-6 z-[60] flex items-end gap-3">
                {/* AI toggle button */}
                {!aiOpen && (
                    <button
                        onClick={() => setAiOpen(true)}
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white hover:scale-105 transition-all shadow-lg"
                        title="Open Voyageur AI"
                    >
                        <MessageSquare className="w-6 h-6" />
                    </button>
                )}

                {/* AI Panel */}
                {aiOpen && (
                    <div className="w-[360px] max-h-[78vh] neu-card rounded-3xl border border-white/60 shadow-2xl flex flex-col">
                        {/* AI Panel Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                                    <MessageSquare className="w-4 h-4" />
                                </div>
                                <h3 className="font-[Outfit] font-bold text-foreground text-base">Voyageur AI</h3>
                                {aiTyping && (
                                    <span className="flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setAiOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-black/5"
                                title="Minimize"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Group Insights (Static Section) */}
                        <div className="px-5 pb-2 shrink-0">
                            <div className="neu-pressed rounded-2xl p-4 border border-slate-200/60 shadow-inner">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-100" />
                                    <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">Group Insights</span>
                                </div>
                                <ul className="space-y-3">
                                    <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-snug">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0 shadow-sm" />
                                        <span>Sharma & Singh families show high satisfaction scores.</span>
                                    </li>
                                    <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-snug">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0 shadow-sm" />
                                        <span><span className="font-bold text-slate-800">Urgent:</span> Mehta family AC complaint requires follow-up.</span>
                                    </li>
                                    <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-snug">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0 shadow-sm" />
                                        <span>1 pending late checkout request awaiting approval.</span>
                                    </li>
                                    <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-snug">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0 shadow-sm" />
                                        <span><span className="font-bold text-slate-800">Suggestion:</span> Offer Sunset Cruise upgrade to high-satisfaction families.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* AI Chat messages */}
                        <div className="flex-1 overflow-y-auto px-4 pb-2 scrollbar-hide space-y-3 min-h-[100px]">
                            {aiMessages.map((msg, i) => (
                                <div key={i} className={cn('flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                    <div className={cn(
                                        'px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed max-w-[88%] shadow-sm',
                                        msg.role === 'ai'
                                            ? 'neu-pressed text-foreground rounded-tl-sm border border-slate-200/60'
                                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm shadow-md border-t border-white/20'
                                    )}>{msg.text}</div>
                                    <span className="text-[9px] text-muted-foreground/60 px-1">{msg.time}</span>
                                </div>
                            ))}
                            {aiTyping && (
                                <div className="flex items-start">
                                    <div className="neu-pressed px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center border border-slate-200/60 shadow-inner">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            )}
                            <div ref={aiEndRef} />
                        </div>

                        {/* AI Input */}
                        <div className="px-4 pb-4 pt-2 shrink-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={aiInput}
                                    onChange={e => setAiInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') sendAiMessage(); }}
                                    placeholder="Ask about groups or families..."
                                    className="w-full neu-pressed rounded-xl py-3 pl-4 pr-10 text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none border-none bg-transparent shadow-inner transition-shadow focus:shadow-[inset_2px_2px_5px_#b8b9be,inset_-3px_-3px_7px_#ffffff]"
                                />
                                <button
                                    onClick={sendAiMessage}
                                    disabled={!aiInput.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-indigo-500 hover:bg-black/5 transition-colors disabled:opacity-30"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
