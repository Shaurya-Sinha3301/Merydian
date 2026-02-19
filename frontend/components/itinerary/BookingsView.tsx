'use client';

import { useState } from 'react';
import {
    Filter, Plane, Hotel, Utensils, Bus,
    CheckCircle2, Clock, AlertCircle, XCircle,
    Calendar, MapPin, Share2, Download,
    MessageSquare, Send, Sparkles, X, PlusCircle,
    MoreHorizontal, ChevronRight, Edit2, Trash2,
    Briefcase, Zap
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
        case 'activity': return Sparkles; // Using Sparkles for 'sports'
        default: return Briefcase;
    }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function BookingsView({ tripId }: { tripId: string }) {
    const trip = getTripById(tripId);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [activePanel, setActivePanel] = useState<'finance' | 'ai' | null>('ai');

    if (!trip) return <div className="p-8 text-center text-muted-foreground">Trip not found</div>;

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50 h-full">

            {/* ── Sub-header: Title & Cost ────────────────────────────────────────── */}
            <div className="flex items-end justify-between px-8 pt-6 pb-2 shrink-0">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <button className="neu-raised rounded-lg p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                            <ArrowLeftIcon />
                        </button>
                        <h1 className="text-3xl font-bold text-slate-800">{trip.title}</h1>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Destination</span>
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {trip.dateRange}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {trip.members.length} Travelers</span>
                    </div>
                </div>
                <div className="neu-raised-sm px-6 py-3 rounded-2xl flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings Cost</span>
                    <span className="text-2xl font-bold text-slate-800">₹499,400.00</span>
                </div>
            </div>

            {/* ── Helpers: Local ArrowLeft since we removed import ── */}
            {/* (Actually, let's just use ChevronLeft or similar if ArrowLeft isn't imported, but I'll add the SVG or reuse a similar icon) */}
            {/* ...Wait, I can just not render the back button here since it's in the navbar. 
                The prompt said: "Implement this new Bookings page... navbar we have is present in it so figure out effective code".
                The design has a sticky top main navbar (implemented in Layout) AND a page title header.
                In the design image, there is a back arrow next to the title "Goa Beach Retreat".
                However, our shared navbar ALREADY has a back arrow and the trip title.
                Displaying it twice is redundant.
                I will HIDE the title/back button row from this view if it duplicates the shared navbar.
                BUT, the shared navbar has "Paris Culinary Tour" (Trip Title).
                The design shows "Goa Beach Retreat 2026" as the main page title.
                I'll render the "Total Bookings Cost" and a Filter row.
            */}

            {/* ── Filter Row ──────────────────────────────────────────────────────── */}
            <div className="px-8 pb-6 pt-4 shrink-0">
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
            </div>

            {/* ── Scrollable Content ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-32 px-8">
                {BOOKINGS_DATA.map((group) => (
                    <div key={group.day} className="mb-8 relative z-0">
                        {/* Sticky Day Header */}
                        <div className="flex items-center gap-4 mb-4 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-20 py-2">
                            <h2 className="text-xl font-bold text-slate-700">Day {group.day}: {group.title}</h2>
                            <div className="h-px flex-1 bg-slate-200" />
                            <span className="text-xs font-bold text-slate-400">{group.date}</span>
                        </div>

                        {/* Booking Cards */}
                        <div className="flex flex-col gap-4">
                            {group.bookings
                                .filter(b => activeFilter === 'all' || (activeFilter === 'transport' && b.type === 'activity' ? false : b.type === activeFilter)) // simplistic mapping, activity -> transport? no, activity needs its own or falls under all. Let's precise it later.
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
            <div className="absolute bottom-6 right-6 z-[60] flex flex-col items-end gap-4 pointer-events-none">

                {/* Panel Icons */}
                <div className="flex items-end gap-3 pointer-events-auto">
                    {/* Finance Icon */}
                    <button
                        onClick={() => setActivePanel(activePanel === 'finance' ? null : 'finance')}
                        className={cn(
                            "neu-raised rounded-full w-14 h-14 flex items-center justify-center text-slate-500 transition-all relative border border-white/50",
                            activePanel === 'finance' ? "neu-pressed text-blue-600" : "hover:text-slate-800 hover:bg-white"
                        )}
                    >
                        <Briefcase className="w-6 h-6" />
                        <div className="absolute -top-1 -right-1 bg-green-100 border border-green-200 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">+12%</div>
                    </button>

                    {/* AI Icon */}
                    <button
                        onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
                        className={cn(
                            "neu-raised rounded-full w-14 h-14 flex items-center justify-center text-slate-500 transition-all relative border border-white/50",
                            activePanel === 'ai' ? "neu-pressed text-indigo-600" : "hover:text-slate-800 hover:bg-white"
                        )}
                    >
                        <MessageSquare className="w-6 h-6" />
                        <div className="absolute -top-1 -right-1 bg-red-100 border border-red-200 text-red-600 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">3</div>
                    </button>
                </div>

                {/* ── Financials Panel ────────────────────────────────────────────── */}
                {activePanel === 'finance' && (
                    <div className="pointer-events-auto w-[360px] neu-raised rounded-3xl p-6 shadow-xl border border-white/50 bg-[#eef2f6] animate-in slide-in-from-bottom-5 fade-in duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                                    <Briefcase className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-slate-700 text-lg">Financials</h3>
                            </div>
                            <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="neu-pressed rounded-xl p-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-500">Budget Utilized</span>
                                    <span className="font-bold text-slate-700">78%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[78%] rounded-full" />
                                </div>
                                <div className="mt-3 flex justify-between items-end">
                                    <div>
                                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Remaining</span>
                                        <div className="font-semibold text-slate-700">₹140,600</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Profit Margin</span>
                                        <div className="font-bold text-green-600">+ ₹52,400</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="p-3 rounded-xl neu-raised hover:bg-white/50 text-xs font-semibold text-slate-600 flex flex-col items-center gap-1">
                                    <Download className="w-5 h-5 text-slate-400" /> Export PDF
                                </button>
                                <button className="p-3 rounded-xl neu-raised hover:bg-white/50 text-xs font-semibold text-slate-600 flex flex-col items-center gap-1">
                                    <Share2 className="w-5 h-5 text-slate-400" /> Share Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Voyageur AI Panel ───────────────────────────────────────────── */}
                {activePanel === 'ai' && (
                    <div className="pointer-events-auto w-[360px] neu-raised rounded-3xl p-6 shadow-xl border border-white/50 bg-[#eef2f6] animate-in slide-in-from-bottom-5 fade-in duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                                    <MessageSquare className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-slate-700 text-lg">Voyageur AI</h3>
                            </div>
                            <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="bg-slate-200/50 rounded-2xl p-4 border border-slate-200/60 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-3 h-3 text-purple-500" />
                                <span className="text-[10px] uppercase font-bold text-purple-500 tracking-wider">Booking Alerts</span>
                            </div>
                            <ul className="space-y-2.5">
                                <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-tight">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                                    <span><span className="text-red-600 font-semibold">Action Required:</span> Dinner at Fisherman's Wharf cancelled. Re-booking suggested at "The Black Sheep Bistro".</span>
                                </li>
                                <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-tight">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                    <span>Hotel "Ocean Breeze" has 2 room upgrades available for free.</span>
                                </li>
                                <li className="flex gap-2 items-start text-[11px] text-slate-600 leading-tight">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                                    <span>Transport delay expected for Day 1 arrival due to traffic.</span>
                                </li>
                            </ul>
                        </div>
                        <div className="relative">
                            <input
                                className="w-full neu-pressed rounded-xl py-3 px-4 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 border-none bg-transparent shadow-inner"
                                placeholder="Ask about bookings..."
                                type="text"
                            />
                            <button className="absolute right-2 top-1.5 p-1.5 rounded-lg text-indigo-500 hover:bg-slate-200 transition-colors">
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

// Simple ArrowLeft icon component helper since we're not importing it to avoid conflicts if we change imports
function ArrowLeftIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
        </svg>
    );
}
