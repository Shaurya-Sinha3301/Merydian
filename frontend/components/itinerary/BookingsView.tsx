'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Filter, Plane, Hotel, Utensils, Bus,
    CheckCircle2, Clock, AlertCircle, XCircle,
    Calendar, MapPin, Share2, Download,
    MessageSquare, Send, Sparkles, X, PlusCircle,
    MoreHorizontal, ChevronRight, Edit2, Trash2,
    Briefcase, Zap, TrendingUp, Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTripById } from '@/lib/trips';

// ─── Types & Mock Data ─────────────────────────────────────────────────────────

type BookingType = 'flight' | 'stay' | 'dining' | 'transport' | 'activity';
type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'delayed';

interface Booking {
    id: string;
    type: BookingType;
    status: BookingStatus;
    title: string;
    description: string;
    date: string;
    time?: string;
    location?: string;
    price?: string;             // Display string with currency
    metaPrimary?: string;       // e.g. Flight number, Ref number
    metaSecondary?: string;     // e.g. Date/Time info
}

interface DayGroup {
    day: number;
    title: string;
    date: string;
    bookings: Booking[];
}

const BOOKINGS_DATA: DayGroup[] = [
    {
        day: 1,
        title: 'Arrival & Check-in',
        date: 'Feb 10, 2026',
        bookings: [
            {
                id: '6E4407',
                type: 'flight',
                status: 'confirmed',
                title: 'IndiGo',
                description: 'Flight to Goa, India (GOI)',
                date: '2026-02-10',
                time: '08:30 AM',
                location: 'Indira Gandhi Int. Airport',
                price: '₹99,000.00',
                metaPrimary: '# 6E4407',
                metaSecondary: '2026-02-10 • 08:30 AM'
            },
            {
                id: 'HT9601',
                type: 'stay',
                status: 'confirmed',
                title: 'Ocean Breeze Resort',
                description: '11x Deluxe Rooms • Ocean View Wing',
                date: '2026-02-10 to 17',
                location: 'Goa, India',
                price: '₹400,400.00',
                metaPrimary: '# HT9601',
                metaSecondary: '2026-02-10 to 17'
            },
            {
                id: 'DIN-001',
                type: 'dining',
                status: 'cancelled',
                title: 'Welcome Dinner',
                description: "Group reservation at Fisherman's Wharf",
                date: '2026-02-10',
                time: '08:00 PM',
                price: '₹22,000.00',
                metaPrimary: '# DIN-001',
                metaSecondary: '2026-02-10 • 08:00 PM'
            },
            {
                id: 'TR-GOA-01',
                type: 'transport',
                status: 'delayed',
                title: 'Airport Shuttle',
                description: 'Private Coach Transfer to Resort',
                date: '2026-02-10',
                time: 'Est. 10:45 AM',
                price: 'Included',
                metaPrimary: '# TR-GOA-01',
                metaSecondary: 'Est. 10:45 AM'
            }
        ]
    },
    {
        day: 2,
        title: 'Beach Activities',
        date: 'Feb 11, 2026',
        bookings: [
            {
                id: 'ADV-09',
                type: 'activity',
                status: 'pending',
                title: 'Scuba Diving Group',
                description: 'Grand Island Trip • Waiting for vendor confirmation',
                date: '2026-02-11',
                time: '07:00 AM',
                price: '₹65,000.00',
                metaPrimary: '# ADV-09',
                metaSecondary: '2026-02-11 • 07:00 AM'
            }
        ]
    }
];

const FILTERS = [
    { id: 'all', label: 'All', icon: MoreHorizontal }, // Using MoreHorizontal as generic 'Apps' icon proxy
    { id: 'flight', label: 'Flights', icon: Plane },
    { id: 'stay', label: 'Stay', icon: Hotel },
    { id: 'dining', label: 'Dining', icon: Utensils },
    { id: 'transport', label: 'Transport', icon: Bus },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getStatusStyles(status: BookingStatus) {
    switch (status) {
        case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
        case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
        case 'delayed': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
}

function getTypeIcon(type: BookingType) {
    switch (type) {
        case 'flight': return Plane;
        case 'stay': return Hotel;
        case 'dining': return Utensils;
        case 'transport': return Bus;
        case 'activity': return Sparkles;
        default: return Briefcase;
    }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function BookingsView({ tripId }: { tripId: string }) {
    const trip = getTripById(tripId);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [activePanel, setActivePanel] = useState<'profit' | 'ai' | null>('ai');
    const [aiInput, setAiInput] = useState('');
    const [panelHovered, setPanelHovered] = useState(false);

    // ── Chat state ─────────────────────────────────────────────────────────────

    type ChatMessage = { role: 'ai' | 'user'; text: string; time: string };

    const now = () => new Date().toTimeString().slice(0, 5);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'ai',
            time: '',
            text: 'Here’s the latest optimization summary:\n\n• Preference conflict detected between Family A & C\n• Subgroup formed for 2.5h activity slots\n• Travel overhead reduced by 18%\n• Margin improved by +2.4%\n\nAsk me anything about this itinerary!',
        },
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages((prev) => prev.map((msg, i) => i === 0 ? { ...msg, time: now() } : msg));
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, activePanel]);

    const sendMessage = () => {
        const text = aiInput.trim();
        if (!text) return;
        const userMsg: ChatMessage = { role: 'user', text, time: now() };
        setMessages((prev) => [...prev, userMsg]);
        setAiInput('');
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'ai',
                    time: now(),
                    text: `I’m analyzing your request about “${text}”. Based on the current optimization, I recommend reviewing the subgroup allocations for Day 2. Would you like me to run a new optimization pass?`,
                },
            ]);
        }, 1200);
    };

    if (!trip) return <div className="p-8 text-center text-muted-foreground">Trip not found</div>;

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative bg-background h-full">

            {/* ── Sub-header: Cost Only (Title removed to avoid duplicate) ─────── */}
            {/* ── Sub-header: Filters & Cost ────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-8 py-6 shrink-0">
                {/* Left: Filters */}
                <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={cn(
                                'px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all border',
                                activeFilter === f.id
                                    ? 'neu-pressed text-slate-800 shadow-inner border-slate-200 font-bold'
                                    : 'neu-raised text-slate-500 hover:text-slate-700 hover:bg-white/60 border-transparent'
                            )}
                        >
                            <f.icon className="w-[18px] h-[18px]" /> {f.label}
                        </button>
                    ))}
                </div>

                {/* Right: Cost */}
                <div className="neu-raised-sm px-6 py-3 rounded-2xl flex flex-col items-end shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings Cost</span>
                    <span className="text-2xl font-bold text-slate-800">₹499,400.00</span>
                </div>
            </div>

            {/* ── Scrollable Content ──────────────────────────────────────────────── */}
            <div className={cn("flex-1 overflow-y-auto scrollbar-hide pb-32 px-8", panelHovered ? "overflow-hidden" : "")}>
                {BOOKINGS_DATA.map((group) => (
                    <div key={group.day} className="mb-8 relative z-0">
                        {/* Sticky Day Header */}
                        <div className="flex items-center gap-4 mb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-20 py-2">
                            <h2 className="text-xl font-bold text-slate-700">Day {group.day}: {group.title}</h2>
                            <div className="h-px flex-1 bg-slate-200" />
                            <span className="text-xs font-bold text-slate-400">{group.date}</span>
                        </div>

                        {/* Booking Cards */}
                        <div className="flex flex-col gap-4">
                            {group.bookings
                                .filter(b => activeFilter === 'all' || (activeFilter === 'transport' && b.type === 'activity' ? false : b.type === activeFilter))
                                .map((booking) => {
                                    const Icon = getTypeIcon(booking.type);
                                    const statusStyle = getStatusStyles(booking.status);
                                    const isCancelled = booking.status === 'cancelled';

                                    return (
                                        <div
                                            key={booking.id}
                                            className={cn(
                                                "neu-raised rounded-2xl p-5 border relative group hover:z-10 transition-all neu-raised-hover",
                                                isCancelled ? "opacity-60 grayscale bg-slate-100/50 border-slate-100" : "border-white"
                                            )}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-5 items-start w-full">
                                                    {/* Icon Box */}
                                                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 neu-pressed shrink-0">
                                                        <Icon className="w-6 h-6" />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className={cn("font-bold text-lg text-slate-800", isCancelled && "line-through text-slate-600")}>
                                                                {booking.title}
                                                            </h3>
                                                            <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wide border", statusStyle)}>
                                                                {booking.status}
                                                            </span>
                                                        </div>
                                                        <p className={cn("text-slate-500 text-sm mb-3", isCancelled && "text-slate-400")}>{booking.description}</p>
                                                        <div className="flex flex-wrap gap-4">
                                                            {booking.metaPrimary && (
                                                                <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                                                                    {booking.metaPrimary}
                                                                </span>
                                                            )}
                                                            {booking.metaSecondary && (
                                                                <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 flex items-center gap-1.5">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    {booking.metaSecondary}
                                                                </span>
                                                            )}
                                                            {booking.location && (
                                                                <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 flex items-center gap-1.5">
                                                                    <MapPin className="w-3.5 h-3.5" />
                                                                    {booking.location}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Price & Actions */}
                                                <div className="text-right shrink-0 ml-4">
                                                    <span className={cn("text-lg font-bold text-slate-800 block", isCancelled && "line-through text-slate-400")}>
                                                        {booking.price}
                                                    </span>
                                                    <div className="mt-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isCancelled ? (
                                                            <button className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                                                                Restore
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                            {/* "Add Booking" Placeholder */}
                            <div className="neu-raised rounded-2xl p-8 border border-white border-dashed flex flex-col items-center justify-center text-slate-400 gap-2 hover:bg-white/40 transition-colors cursor-pointer group">
                                <PlusCircle className="w-8 h-8 group-hover:text-slate-600 transition-colors" />
                                <span className="text-sm font-medium group-hover:text-slate-600 transition-colors">Add booking for Day {group.day}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Floating Panels Wrapper ─────────────────────────────────────────── */}
            <div
                className="fixed bottom-6 right-6 z-[60] flex items-end gap-3"
                onMouseEnter={() => setPanelHovered(true)}
                onMouseLeave={() => setPanelHovered(false)}
            >
                {/* Financials icon pill */}
                {activePanel !== 'profit' && (
                    <button
                        onClick={() => setActivePanel('profit')}
                        className="relative neu-card w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg border border-white/50 shrink-0"
                        title="Open Financials"
                    >
                        <Briefcase className="w-6 h-6 text-green-500" />
                        <span className="absolute -top-1 -right-1 bg-green-100 border border-green-200 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            +12%
                        </span>
                    </button>
                )}

                {/* VoyageurAI icon pill */}
                {activePanel !== 'ai' && (
                    <button
                        onClick={() => setActivePanel('ai')}
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white hover:scale-105 transition-all shadow-lg shrink-0"
                        title="Open Voyageur AI"
                    >
                        <MessageSquare className="w-6 h-6" />
                    </button>
                )}

                {/* ── Financials expanded card ── */}
                {activePanel === 'profit' && (
                    <div className="w-[360px] neu-card rounded-3xl border border-white/60 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-green-100 text-green-600">
                                    <Briefcase className="w-4 h-4" />
                                </div>
                                <h3 className="font-[Outfit] font-bold text-foreground text-lg">Financials</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 uppercase tracking-wide">+12% Margin</span>
                            </div>
                            <button
                                onClick={() => setActivePanel(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-black/5"
                                title="Minimize"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="px-5 pb-5 space-y-4">
                            {/* Inner Content Wrapper */}
                            <div className="neu-pressed rounded-2xl p-5 space-y-4">
                                {/* Total Cost */}
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] bg-slate-200/50 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider">Total</span>
                                        <span className="text-sm font-bold text-slate-800">₹499,400</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full bg-slate-800 w-[75%] rounded-full dark:bg-slate-600 shadow-sm" />
                                    </div>
                                </div>

                                {/* Paid */}
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] bg-slate-200/50 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider">Paid</span>
                                        <span className="text-sm font-bold text-green-600">₹350,000</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full bg-green-500 w-[70%] rounded-full shadow-sm" />
                                    </div>
                                </div>

                                {/* Pending */}
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] bg-slate-200/50 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider">Pending</span>
                                        <span className="text-sm font-bold text-orange-600">₹149,400</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full bg-orange-500 w-[30%] rounded-full shadow-sm" />
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-3 rounded-xl neu-raised hover:bg-white/60 text-slate-600 text-xs font-bold transition-all border border-transparent hover:border-slate-200">
                                View Detailed Report
                            </button>
                        </div>
                    </div>
                )}

                {/* ── VoyageurAI chatbot expanded card ── */}
                {activePanel === 'ai' && (
                    <div className="w-[360px] max-h-[78vh] neu-card rounded-3xl border border-white/60 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                                    <MessageSquare className="w-4 h-4" />
                                </div>
                                <h3 className="font-[Outfit] font-bold text-foreground text-base">Voyageur AI</h3>
                                {isTyping && (
                                    <span className="flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setActivePanel(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-black/5"
                                title="Minimize"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Booking Insights (Static Section) */}
                        <div className="px-5 pb-2 shrink-0">
                            <div className="neu-pressed rounded-2xl p-4 border border-slate-200/60 shadow-inner">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-100" />
                                    <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">Booking Insights</span>
                                </div>
                                <ul className="space-y-3">
                                    <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-snug">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0 shadow-sm" />
                                        <span>Flight prices to Goa increased by 5% since last check.</span>
                                    </li>
                                    <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-snug">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0 shadow-sm" />
                                        <span><span className="font-bold text-slate-800">Action Required:</span> Confirm Fisherman's Wharf deposit by Feb 1st.</span>
                                    </li>
                                    <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-snug">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0 shadow-sm" />
                                        <span>Refund for "Private Coach" processed.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Chat Area (Empty initially or minimal) */}
                        <div className="flex-1 overflow-y-auto px-4 pb-2 scrollbar-hide space-y-3 min-h-[100px]">
                            {messages.slice(1).map((msg, i) => ( // Hide the initial message if using static insights, or keep it. Let's hide the old initial message related to Optimization.
                                <div key={i} className={cn('flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                    <div className={cn(
                                        'px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed max-w-[88%] whitespace-pre-line shadow-sm',
                                        msg.role === 'ai'
                                            ? 'neu-pressed text-foreground rounded-tl-sm border border-slate-200/60'
                                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm shadow-md border-t border-white/20',
                                    )}>
                                        {msg.text}
                                    </div>
                                    <span suppressHydrationWarning className="text-[9px] text-muted-foreground/60 px-1">{msg.time}</span>
                                </div>
                            ))}
                            {/* If no user interaction yet, keep empty or show a placeholder? The static insights take up space. */}
                            {isTyping && (
                                <div className="flex items-start">
                                    <div className="neu-pressed px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center border border-slate-200/60 shadow-inner">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="px-4 pb-4 pt-2 shrink-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                    placeholder="Ask about bookings..."
                                    className="w-full neu-pressed rounded-xl py-3 pl-4 pr-10 text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none border-none bg-transparent shadow-inner transition-shadow focus:shadow-[inset_2px_2px_5px_#b8b9be,inset_-3px_-3px_7px_#ffffff]"
                                />
                                <button
                                    onClick={sendMessage}
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
