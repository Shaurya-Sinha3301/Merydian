'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Search, Star, Clock, Key,
    Send, Minimize2, Maximize2, AlertTriangle, Crown,
    Calendar, FileText,
    CheckCircle, XCircle,
    MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTripById } from '@/lib/trips';
import VoyageurAIPanel from './VoyageurAIPanel';

// ─── Types & Mock Data ─────────────────────────────────────────────────────────

type Sentiment = 'happy' | 'neutral' | 'unhappy';
type FamilyFilter = 'all' | 'attention' | 'stable';

interface FamilyTag {
    label: string;
    variant: 'neutral' | 'warning';
}

interface Family {
    id: string;
    name: string;
    initials: string;
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
    badge: string;
    title: string;
    body?: string;
    time: string;
    accentColor: string;
    actionable?: boolean;
}

interface ChatMessage {
    role: 'guest' | 'agent';
    text: string;
    initials: string;
}

const FAMILIES: Family[] = [
    {
        id: 'sharma', name: 'Sharma Family', initials: 'SH',
        pax: 4, room: 'Room 402', lastMessageTime: 'Now', sentiment: 'happy',
        tags: [
            { label: 'VIP Platinum', variant: 'neutral' },
            { label: 'Late Checkout', variant: 'neutral' },
        ],
    },
    {
        id: 'patel', name: 'Patel Group', initials: 'PA',
        pax: 3, room: 'Villa 12', lastMessageTime: '2h ago', sentiment: 'neutral',
        lastMessage: '"Checking on the buffet status..."',
    },
    {
        id: 'mehta', name: 'Mehta Couple', initials: 'ME',
        pax: 2, room: 'Room 204', lastMessageTime: '5h ago', sentiment: 'unhappy',
        tags: [{ label: 'A/C Issue', variant: 'warning' }],
    },
    {
        id: 'singh', name: 'Singh Family', initials: 'SI',
        pax: 5, room: 'Exec Suite', lastMessageTime: '1d ago', sentiment: 'happy',
    },
    {
        id: 'kapoor', name: 'Kapoor Family', initials: 'KA',
        pax: 3, room: 'Room 318', lastMessageTime: '2d ago', sentiment: 'happy',
    },
    {
        id: 'nair', name: 'Nair Family', initials: 'NA',
        pax: 6, room: 'Suite 501', lastMessageTime: '3d ago', sentiment: 'neutral',
    },
];

const ACTIVITY_LOG: ActivityLogItem[] = [
    {
        id: 'act-1', type: 'request', badge: 'PENDING',
        title: 'Late Checkout Request',
        body: '"We\'d love to stay until 3 PM as our flight is in the evening. Any possibility for Room 402?"',
        time: '10:45 AM • Room 402',
        accentColor: 'bg-[#8d7b5b]',
        actionable: true,
    },
    {
        id: 'act-2', type: 'review', badge: 'FEEDBACK',
        title: '5-Star Dining Review',
        body: '"The seafood platter at Coastal Grill was phenomenal! The kids loved the live music near the beach."',
        time: 'Yesterday • Coastal Grill',
        accentColor: 'bg-[#4f5d4e]',
    },
    {
        id: 'act-3', type: 'system', badge: 'SYSTEM',
        title: 'Room Access Granted',
        time: 'Yesterday • Digital Key #99283',
        accentColor: 'bg-stone-300',
    },
];

const activityIcons: Record<string, React.ElementType> = {
    'act-1': Clock,
    'act-2': Star,
    'act-3': Key,
};

const INITIAL_CHAT: ChatMessage[] = [
    { role: 'guest', initials: 'S', text: 'Hello, can we get extra towels for the pool?' },
    { role: 'agent', initials: 'AG', text: "Absolutely! I've forwarded your request to Housekeeping. They should be there in about 10 minutes." },
];

// ─── Sentiment dot ─────────────────────────────────────────────────────────────

function SentimentDot({ sentiment }: { sentiment: Sentiment }) {
    return (
        <div className={cn(
            'w-2.5 h-2.5 rounded-full mt-1',
            sentiment === 'happy' ? 'bg-emerald-400' :
                sentiment === 'neutral' ? 'bg-amber-400' : 'bg-rose-400'
        )} />
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function GroupsView({ tripId }: { tripId: string }) {
    const trip = getTripById(tripId);

    const [familyFilter, setFamilyFilter] = useState<FamilyFilter>('all');
    const [search, setSearch] = useState('');
    const [activeFamilyId, setActiveFamilyId] = useState('sharma');
    const [logFilter, setLogFilter] = useState<LogFilter>('all');
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);

    // Voyageur AI floating panel
    const [aiOpen, setAiOpen] = useState(false);

    // Chat minimise/expand
    const [chatOpen, setChatOpen] = useState(true);

    // Map expand modal
    const [mapExpanded, setMapExpanded] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

    const sendChat = () => {
        const text = chatInput.trim();
        if (!text) return;
        setChatMessages(prev => [...prev, { role: 'agent', initials: 'AG', text }]);
        setChatInput('');
    };

    const filteredFamilies = FAMILIES.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            familyFilter === 'all' ||
            (familyFilter === 'attention' && (f.sentiment === 'unhappy' || f.tags?.some(t => t.variant === 'warning'))) ||
            (familyFilter === 'stable' && f.sentiment === 'happy');
        return matchSearch && matchFilter;
    });

    const filteredLog = ACTIVITY_LOG.filter(a => {
        if (logFilter === 'all') return true;
        if (logFilter === 'requests') return a.type === 'request';
        return a.type === 'review';
    });

    const activeFamily = FAMILIES.find(f => f.id === activeFamilyId);

    if (!trip) return <div className="p-8 text-center text-stone-500">Trip not found</div>;

    return (
        <div className="flex-1 flex overflow-hidden h-full relative"
            style={{ background: '#f2efea', backgroundImage: 'linear-gradient(rgba(120,113,108,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(120,113,108,0.1) 1px,transparent 1px)', backgroundSize: '24px 24px' }}>

            {/* ── LEFT SIDEBAR: Families ──────────────────────────────────────── */}
            <aside className="w-[300px] shrink-0 flex flex-col gap-3 p-4 overflow-hidden">
                {/* Header panel */}
                <div className="bg-[#faf9f6] border border-stone-200/80 shadow-sm rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <h2 className="text-sm font-bold text-stone-900 tracking-wide uppercase">Family Groups</h2>
                        <span className="bg-stone-200/50 border border-stone-200 text-stone-700 text-xs font-semibold px-2 py-1 rounded-full">
                            Active: {FAMILIES.length}
                        </span>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search family or booking ID..."
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 pl-10 pr-3 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300"
                        />
                    </div>
                    {/* Filter pills */}
                    <div className="flex gap-2">
                        {(['all', 'attention', 'stable'] as FamilyFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFamilyFilter(f)}
                                className={cn(
                                    'flex-1 py-1.5 border rounded-md text-xs font-semibold capitalize transition-all duration-150',
                                    familyFilter === f
                                        ? 'bg-stone-800 border-stone-800 text-white shadow-sm ring-2 ring-stone-400/30'
                                        : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                                )}
                            >{f}</button>
                        ))}
                    </div>
                </div>

                {/* Family cards list */}
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2.5 pr-0.5">
                    {filteredFamilies.map(family => {
                        const isActive = family.id === activeFamilyId;
                        const isWarning = family.tags?.some(t => t.variant === 'warning');
                        return (
                            <button
                                key={family.id}
                                onClick={() => setActiveFamilyId(family.id)}
                                className={cn(
                                    'w-full text-left rounded-lg border p-4 transition-all cursor-pointer',
                                    isActive
                                        ? 'bg-stone-200/50 border-stone-300'
                                        : isWarning
                                            ? 'bg-[#faf9f6] border-[#8e5a4e]/30 shadow-sm hover:border-[#8e5a4e]/50 hover:shadow-md'
                                            : 'bg-[#faf9f6] border-stone-200 shadow-sm hover:border-stone-300 hover:shadow-md'
                                )}
                                style={isActive ? {
                                    boxShadow: 'inset 3px 3px 7px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.8)',
                                } : undefined}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border border-stone-200',
                                            isWarning ? 'bg-stone-100 text-[#8e5a4e]' : 'bg-stone-100 text-stone-700'
                                        )}>
                                            {family.initials}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-stone-800 text-sm">{family.name}</h4>
                                            <span className="text-xs text-stone-500 block mt-0.5">{family.pax} Guests • {family.room}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-medium text-stone-400">{family.lastMessageTime}</span>
                                        <SentimentDot sentiment={family.sentiment} />
                                    </div>
                                </div>
                                {family.lastMessage && (
                                    <div className="mt-2 text-xs text-stone-600 bg-stone-100/50 p-2 rounded border border-stone-100 italic">
                                        {family.lastMessage}
                                    </div>
                                )}
                                {family.tags && family.tags.length > 0 && (
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100 flex-wrap">
                                        {family.tags.map((tag, i) => (
                                            <span key={i} className={cn(
                                                'text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border',
                                                tag.variant === 'warning'
                                                    ? 'bg-[#8e5a4e]/10 text-[#8e5a4e] border-[#8e5a4e]/20'
                                                    : 'bg-stone-100 text-stone-700 border-stone-200'
                                            )}>
                                                {tag.variant === 'warning' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Crown className="w-2.5 h-2.5" />}
                                                {tag.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* ── CENTER: Activity Timeline + Chat ──────────────────────────── */}
            <main className="flex-1 flex flex-col gap-4 p-4 min-w-0 overflow-hidden">

                {/* Activity Timeline */}
                <div className="flex-[1.2] bg-[#faf9f6] border border-stone-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center px-5 py-3.5 border-b border-stone-100 bg-[#faf9f6] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-stone-100 rounded text-stone-600">
                                <FileText className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm font-bold text-stone-800 tracking-wide uppercase">Activity Timeline</h2>
                        </div>
                        <div className="flex gap-1.5 bg-stone-100/50 p-1 rounded-md border border-stone-100">
                            {(['all', 'requests', 'reviews'] as LogFilter[]).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setLogFilter(f)}
                                    className={cn(
                                        'px-3 py-1 text-xs font-semibold capitalize transition-colors rounded',
                                        logFilter === f
                                            ? 'bg-white shadow-sm text-stone-700 border border-stone-200'
                                            : 'text-stone-500 hover:text-stone-700'
                                    )}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-3 bg-stone-100/20">
                        {filteredLog.map(item => {
                            const Icon = activityIcons[item.id] ?? Clock;
                            return (
                                <div key={item.id} className="group bg-white border border-stone-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
                                    {/* Left accent bar */}
                                    <div className={cn('absolute left-0 top-0 bottom-0 w-1', item.accentColor)} />
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-0.5 bg-stone-50 text-stone-500 p-2 rounded-lg shrink-0">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-bold text-stone-800">{item.title}</h3>
                                                    <span className="bg-stone-100 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-200">{item.badge}</span>
                                                </div>
                                                <p className="text-xs text-stone-500 font-medium">{item.time}</p>
                                                {item.body && (
                                                    <p className="text-sm text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100 mt-2 italic">
                                                        {item.body}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Hover actions */}
                                        {item.actionable && (
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button className="px-3 py-1.5 bg-[#4f5d4e] text-white text-xs font-semibold rounded-md hover:bg-[#3d4a3c] transition-colors flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Approve
                                                </button>
                                                <button className="px-3 py-1.5 border border-stone-200 bg-white text-stone-600 text-xs font-semibold rounded-md hover:bg-stone-50 transition-colors flex items-center gap-1">
                                                    <XCircle className="w-3 h-3" /> Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Live Chat Panel */}
                <div className={cn('bg-[#faf9f6] border border-stone-200 rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-300', chatOpen ? 'flex-1' : 'flex-[0_0_auto]')}>
                    {/* Chat header */}
                    <div className="px-5 py-3 border-b border-stone-100 bg-[#faf9f6] flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
                            <div>
                                <h3 className="font-bold text-stone-800 text-sm">
                                    {activeFamily?.name ?? 'Family'} Chat
                                </h3>
                                <span className="text-xs text-stone-400">Active now</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-1 rounded font-bold uppercase tracking-widest">
                                Secure Channel
                            </span>
                            <button
                                onClick={() => setChatOpen(o => !o)}
                                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                                title={chatOpen ? 'Minimise chat' : 'Expand chat'}
                            >
                                {chatOpen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Messages — only rendered when expanded */}
                    {chatOpen && (
                        <>
                            <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-4 bg-stone-50/50">
                                <div className="flex justify-center mb-1">
                                    <span className="text-[10px] font-bold text-stone-400 bg-stone-200/40 px-3 py-1 rounded-full uppercase tracking-widest">Today</span>
                                </div>
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={cn('flex', msg.role === 'agent' ? 'justify-end' : 'justify-start')}>
                                        <div className={cn('flex gap-2 max-w-[85%]', msg.role === 'agent' ? 'flex-row-reverse' : '')}>
                                            <div className={cn(
                                                'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1',
                                                msg.role === 'guest' ? 'bg-stone-200 text-stone-700' : 'bg-[#353b48] text-white'
                                            )}>
                                                {msg.initials}
                                            </div>
                                            <div className={cn(
                                                'px-4 py-3 text-sm rounded-2xl shadow-sm',
                                                msg.role === 'guest'
                                                    ? 'bg-white border border-stone-200 text-stone-700 rounded-tl-none'
                                                    : 'bg-[#353b48] text-white rounded-tr-none'
                                            )}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Quick action chips + input */}
                            <div className="p-4 bg-white border-t border-stone-100 shrink-0">
                                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                                    {['Send Itinerary', 'Suggest Activity', 'Room Service'].map(label => (
                                        <button key={label} className="whitespace-nowrap text-xs font-bold border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                                        placeholder="Type your message..."
                                        className="flex-1 bg-stone-50 border border-stone-200 rounded-lg py-2.5 px-4 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 transition-all"
                                    />
                                    <button
                                        onClick={sendChat}
                                        disabled={!chatInput.trim()}
                                        className="w-10 bg-[#4a647c] text-white rounded-lg flex items-center justify-center hover:bg-[#3d5368] transition-colors disabled:opacity-40"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* ── RIGHT SIDEBAR: Map + Manifest ─────────────────────────────── */}
            <aside className="w-[260px] shrink-0 flex flex-col gap-4 p-4 overflow-y-auto scrollbar-hide">

                {/* Map */}
                <div className="bg-[#faf9f6] border border-stone-200 rounded-xl shadow-sm overflow-hidden h-[180px] relative group">
                    {/* Label badge */}
                    <div className="absolute top-2.5 left-2.5 z-10 bg-white/90 backdrop-blur text-stone-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm border border-stone-200 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 bg-[#4a647c] rounded-full" />
                        Pool Sector 04
                    </div>
                    {/* Maximize button */}
                    <button
                        onClick={() => setMapExpanded(true)}
                        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 bg-white/90 backdrop-blur border border-stone-200 rounded-md shadow-sm flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                        title="Expand map"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Colorful iframe — overflow-hidden clips the OSM footer */}
                    <div className="w-full h-[220px] relative">
                        <iframe
                            src="https://www.openstreetmap.org/export/embed.html?bbox=73.74%2C15.54%2C73.78%2C15.58&layer=mapnik&marker=15.56%2C73.76"
                            width="100%" height="100%"
                            style={{ border: 'none', filter: 'sepia(30%) saturate(70%) brightness(1.05)' }}
                            scrolling="no"
                            title="Trip Location Map"
                        />
                    </div>
                </div>

                {/* Map expanded modal */}
                {mapExpanded && (
                    <div
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                        onClick={() => setMapExpanded(false)}
                    >
                        <div
                            className="relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200"
                            style={{ width: '70vw', height: '65vh' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal header - locked at top */}
                            <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-stone-200 z-10 shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[#4a647c] rounded-full" />
                                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Pool Sector 04</span>
                                </div>
                                <button
                                    onClick={() => setMapExpanded(false)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors"
                                >
                                    <Minimize2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Full-color map — pushed down 45px outside parent to clip OSM footer */}
                            <div className="flex-1 relative bg-stone-50 z-0 pointer-events-auto overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 bottom-[-45px]">
                                    <iframe
                                        src="https://www.openstreetmap.org/export/embed.html?bbox=73.72%2C15.52%2C73.80%2C15.60&layer=mapnik&marker=15.56%2C73.76"
                                        width="100%" height="100%"
                                        style={{ border: 'none', filter: 'sepia(30%) saturate(70%) brightness(1.05)' }}
                                        scrolling="no"
                                        title="Trip Location Map Expanded"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manifest Details */}
                <div className="bg-[#faf9f6] border border-stone-200/80 shadow-sm rounded-lg p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 border-b border-stone-100 pb-2">
                        <FileText className="w-4 h-4 text-stone-400" />
                        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Manifest Details</h3>
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: 'Dates', value: trip.dateRange },
                            { label: 'Guests', valueNode: <div className="flex gap-1"><span className="text-stone-800 font-bold bg-stone-100 px-1.5 py-0.5 rounded text-xs border border-stone-200">2 ADT</span><span className="text-stone-800 font-bold bg-stone-100 px-1.5 py-0.5 rounded text-xs border border-stone-200">2 CHD</span></div> },
                            { label: 'Package', value: 'PREMIUM ALL-INC', mono: true },
                        ].map(({ label, value, valueNode, mono }) => (
                            <div key={label} className="flex justify-between items-center text-sm">
                                <span className="text-stone-500 font-medium text-xs">{label}</span>
                                {valueNode ?? (
                                    <span className={cn(
                                        'text-stone-800 font-bold bg-stone-100 px-2 py-0.5 rounded border border-stone-200 text-xs',
                                        mono && 'uppercase tracking-wider text-[10px]'
                                    )}>{value}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-stone-100 border-dashed">
                        <button className="w-full py-2.5 bg-stone-100/50 border border-stone-200 text-stone-700 hover:bg-white hover:border-stone-300 hover:shadow-sm transition-all text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 uppercase tracking-widest">
                            <FileText className="w-3.5 h-3.5 text-stone-400" />
                            Open Contract PDF
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Voyageur AI Floating Panel (shared component) ─────────────────── */}
            <VoyageurAIPanel
                open={aiOpen}
                onOpenChange={setAiOpen}
                insightTag="Group Intelligence"
                insightTagColor="bg-stone-100 text-stone-700 border-stone-300"
                insightBody={
                    <ul className="space-y-2 mt-1">
                        {[
                            { dot: 'bg-emerald-400', text: <>Late checkout approved for <strong>Room 402</strong> — low risk, high satisfaction.</> },
                            { dot: 'bg-amber-400', text: <>Sharma family satisfaction dipped to 3.1 — action recommended.</> },
                            { dot: 'bg-indigo-400', text: <>2 new reviews submitted overnight — sentiment neutral.</> },
                        ].map((item, i) => (
                            <li key={i} className="flex gap-2 items-start">
                                <span className={cn('w-1.5 h-1.5 rounded-full mt-1 shrink-0', item.dot)} />
                                <span>{item.text}</span>
                            </li>
                        ))}
                    </ul>
                }
                inputPlaceholder="Ask about groups or families..."
                seedMessage="Group intelligence loaded. Ask about family satisfaction, activity requests, or logistics."
                getAIReply={(text) => `Analyzing: "${text}". Based on satisfaction scores, I recommend approving the late checkout for Room 402.`}
            />
        </div>
    );
}
