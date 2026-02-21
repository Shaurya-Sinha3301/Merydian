'use client';

import React, { useState } from 'react';
import {
    Plane, Hotel, Utensils, Bus,
    Calendar, Download, Share2,
    TrendingUp, Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTripById } from '@/lib/trips';
import VoyageurAIPanel from './VoyageurAIPanel';

// ─── Types & Mock Data ─────────────────────────────────────────────────────────

type BookingType = 'flight' | 'stay' | 'dining' | 'transport';
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
    price?: string;
    metaPrimary?: string;
    metaSecondary?: string;
    participants?: { label: string; color: string }[];
}

interface BookingRow {
    id: string;
    bookings: Booking[];
}

interface DayGroup {
    day: number;
    title: string;
    date: string;
    rows: BookingRow[];
}

const BOOKINGS_DATA: DayGroup[] = [
    {
        day: 1,
        title: 'Arrival & Check-in',
        date: '2026-02-10',
        rows: [
            {
                id: 'row-1-flight',
                bookings: [
                    {
                        id: '6E4407',
                        type: 'flight',
                        status: 'confirmed',
                        title: 'IndiGo',
                        description: 'Flight to Goa, India (GOI)',
                        date: '2026-02-10',
                        time: '08:30:00',
                        location: 'Indira Gandhi Int. Airport',
                        price: '₹99,000.00',
                        metaPrimary: '6E4407',
                        participants: [{ label: 'All Groups', color: 'bg-slate-100 text-slate-600 border border-slate-200' }]
                    }
                ]
            },
            {
                id: 'row-1-transport',
                bookings: [
                    {
                        id: 'TR-GOA-01',
                        type: 'transport',
                        status: 'delayed',
                        title: 'Airport Shuttle',
                        description: 'Private Coach Transfer to Resort',
                        date: '2026-02-10',
                        time: 'Est. 10:45',
                        price: 'Included',
                        metaPrimary: 'TR-GOA-01',
                        participants: [{ label: 'All Groups', color: 'bg-slate-100 text-slate-600 border border-slate-200' }]
                    }
                ]
            },
            {
                id: 'row-1-stay-a',
                bookings: [
                    {
                        id: 'HT9601',
                        type: 'stay',
                        status: 'confirmed',
                        title: 'Ocean Breeze Resort',
                        description: '11x Deluxe Rooms • Ocean View Wing',
                        date: '2026-02-10',
                        location: 'Calangute, Goa',
                        price: '₹400,400.00',
                        metaPrimary: 'HT9601',
                        metaSecondary: '7 Nights',
                        participants: [
                            { label: 'Family A', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
                            { label: 'Family C', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200' }
                        ]
                    }
                ]
            },
            {
                id: 'row-1-stay-b',
                bookings: [
                    {
                        id: 'LG-9921',
                        type: 'stay',
                        status: 'pending',
                        title: 'The Leela Goa',
                        description: 'Lagoon Terrace Room',
                        date: '2026-02-10',
                        location: 'Cavelossim, Goa',
                        price: '₹120,400.00',
                        metaPrimary: 'LG-9921',
                        metaSecondary: '7 Nights',
                        participants: [
                            { label: 'Family B', color: 'bg-purple-100 text-purple-700 border border-purple-200' }
                        ]
                    }
                ]
            },
            {
                id: 'row-1-dinner',
                bookings: [
                    {
                        id: 'DIN-001',
                        type: 'dining',
                        status: 'cancelled',
                        title: 'Welcome Dinner',
                        description: "Group reservation at Fisherman's Wharf",
                        date: '2026-02-10',
                        time: '20:00:00',
                        location: 'Mobor Beach',
                        price: '₹22,000.00',
                        metaPrimary: 'DIN-001',
                        participants: [{ label: 'All Groups', color: 'bg-slate-100 text-slate-600 border border-slate-200' }]
                    }
                ]
            }
        ]
    },
    {
        day: 2,
        title: 'Beach Activities',
        date: '2026-02-11',
        rows: [
            {
                id: 'row-2-breakfast',
                bookings: [
                    {
                        id: 'BK-01',
                        type: 'dining',
                        status: 'confirmed',
                        title: 'Buffet Breakfast',
                        description: 'Included at respective hotels',
                        date: '2026-02-11',
                        time: '08:00:00',
                        price: 'Included',
                        metaPrimary: 'BK-01',
                        participants: [{ label: 'All Groups', color: 'bg-slate-100 text-slate-600 border border-slate-200' }]
                    }
                ]
            },
            {
                id: 'row-2-transport-a',
                bookings: [
                    {
                        id: 'TR-02-A',
                        type: 'transport',
                        status: 'confirmed',
                        title: 'Private Cab',
                        description: 'To Fort Aguada',
                        date: '2026-02-11',
                        time: '10:00:00',
                        price: '₹2,500.00',
                        metaPrimary: 'TR-02-A',
                        participants: [
                            { label: 'Family A', color: 'bg-blue-100 text-blue-700 border border-blue-200' }
                        ]
                    }
                ]
            },
            {
                id: 'row-2-transport-bc',
                bookings: [
                    {
                        id: 'TR-02-BC',
                        type: 'transport',
                        status: 'confirmed',
                        title: 'Mini Bus Rental',
                        description: 'To Old Goa Churches',
                        date: '2026-02-11',
                        time: '10:00:00',
                        price: '₹5,000.00',
                        metaPrimary: 'TR-02-BC',
                        participants: [
                            { label: 'Family B', color: 'bg-purple-100 text-purple-700 border border-purple-200' },
                            { label: 'Family C', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200' }
                        ]
                    }
                ]
            },
            {
                id: 'row-2-activity',
                bookings: [
                    {
                        id: 'ADV-09',
                        type: 'dining',
                        status: 'pending',
                        title: 'Scuba Diving Group',
                        description: 'Grand Island Trip • Vendor confirm pending',
                        date: '2026-02-11',
                        time: '07:00:00',
                        price: '₹65,000.00',
                        metaPrimary: 'ADV-09',
                        participants: [{ label: 'All Groups', color: 'bg-slate-100 text-slate-600 border border-slate-200' }]
                    }
                ]
            }
        ]
    },
    {
        day: 3,
        title: 'Relaxation & Departure',
        date: '2026-02-12',
        rows: [
            {
                id: 'row-3-checkout',
                bookings: [
                    {
                        id: 'CHECKOUT-01',
                        type: 'stay',
                        status: 'confirmed',
                        title: 'Hotel Checkout',
                        description: 'Check-out from respective hotels',
                        date: '2026-02-12',
                        time: '11:00:00',
                        price: 'Settled',
                        metaPrimary: 'CHECKOUT-01',
                        participants: [{ label: 'All Groups', color: 'bg-slate-100 text-slate-600 border border-slate-200' }]
                    }
                ]
            },
            {
                id: 'row-3-flight-return',
                bookings: [
                    {
                        id: '6E4408',
                        type: 'flight',
                        status: 'confirmed',
                        title: 'IndiGo 6E4408',
                        description: 'Return Flight to Delhi (DEL)',
                        date: '2026-02-12',
                        time: '14:45:00',
                        location: 'Goa Int. Airport',
                        price: 'Included',
                        metaPrimary: '6E4408',
                        participants: [{ label: 'All Groups', color: 'bg-slate-100 text-slate-600 border border-slate-200' }]
                    }
                ]
            }
        ]
    }
];

const FILTERS = [
    { id: 'all', label: 'All', materialIcon: 'apps' },
    { id: 'flight', label: 'Flights', materialIcon: 'flight' },
    { id: 'stay', label: 'Stay', materialIcon: 'hotel' },
    { id: 'dining', label: 'Dining', materialIcon: 'restaurant' },
    { id: 'transport', label: 'Transport', materialIcon: 'directions_bus' },
] as const;

const AI_ALERTS = [
    { level: 'critical', dot: 'bg-red-500', text: <><span className="text-red-700 font-bold">CRITICAL:</span> Dinner cancelled [DIN-001]. Suggest: &quot;The Black Sheep Bistro&quot;.</> },
    { level: 'info', dot: 'bg-blue-500', text: <>Optimization: 2x Upgrade available @ Ocean Breeze.</> },
    { level: 'warn', dot: 'bg-amber-500', text: <>Delay Warning: High traffic probability on ARRIVAL.</> },
];

// Active Intelligence items for Command Center
const ACTIVE_INTELLIGENCE = [
    {
        level: 'critical',
        borderColor: 'border-red-500',
        hoverBg: 'hover:bg-red-50/50',
        labelColor: 'text-red-600',
        icon: 'error',
        label: 'CRITICAL',
        time: 'T-4h',
        message: 'Dinner [DIN-001] cancelled by vendor.',
        action: 'Auto-reserve alternate?',
    },
    {
        level: 'optimization',
        borderColor: 'border-indigo-500',
        hoverBg: 'hover:bg-indigo-50/50',
        labelColor: 'text-indigo-600',
        icon: 'lightbulb',
        label: 'OPTIMIZATION',
        time: null,
        message: '2x Suite Upgrades available at Ocean Breeze for ₹12k total.',
        action: null,
    },
    {
        level: 'warning',
        borderColor: 'border-amber-500',
        hoverBg: 'hover:bg-amber-50/50',
        labelColor: 'text-amber-600',
        icon: 'warning',
        label: 'TRAFFIC',
        time: null,
        message: 'Local political rally near GOI Airport. Shuttle delay likely +45min.',
        action: null,
    },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getStatusDot(status: BookingStatus) {
    switch (status) {
        case 'confirmed': return 'bg-emerald-500 shadow-[0_0_0_2px_#d1fae5]';
        case 'pending': return 'bg-amber-500 shadow-[0_0_0_2px_#fef3c7]';
        case 'cancelled': return 'bg-red-500 shadow-[0_0_0_2px_#fee2e2]';
        case 'delayed': return 'bg-amber-500 shadow-[0_0_0_2px_#fef3c7]';
        default: return 'bg-slate-400 shadow-[0_0_0_2px_#f1f5f9]';
    }
}

function getStatusLabel(status: BookingStatus): string {
    switch (status) {
        case 'confirmed': return 'CONFIRMED';
        case 'pending': return 'PENDING';
        case 'cancelled': return 'CANCELLED';
        case 'delayed': return 'DELAYED';
    }
}

function getLucideTypeIcon(type: BookingType) {
    switch (type) {
        case 'flight': return Plane;
        case 'stay': return Hotel;
        case 'dining': return Utensils;
        case 'transport': return Bus;
        default: return Calendar;
    }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function BookingsView({ tripId }: { tripId: string }) {
    const trip = getTripById(tripId);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [activePanel, setActivePanel] = useState<'profit' | 'ai' | null>(null);
    const [commandQuery, setCommandQuery] = useState('');

    if (!trip) return <div className="p-8 text-center text-muted-foreground font-mono text-sm">Trip not found.</div>;

    return (
        <div className="flex-1 flex overflow-hidden h-full bp-grid-bg bg-white">

            {/* ── Main Content ──────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* ── Sub-header: Filters & Cost ──────────────────────────────────── */}
                <div className="border-b border-slate-200 bg-white px-8 py-3 flex justify-between items-center shrink-0">
                    {/* Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {FILTERS.map((f, idx) => (
                            <React.Fragment key={f.id}>
                                {idx === 1 && <div className="h-4 w-px bg-slate-300 mx-1" />}
                                <button
                                    onClick={() => setActiveFilter(f.id)}
                                    className={cn(
                                        'px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all border',
                                        activeFilter === f.id
                                            ? 'text-white bg-slate-800 shadow-sm border-slate-800'
                                            : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white hover:border-slate-300'
                                    )}
                                >
                                    <span className="material-symbols-outlined text-[14px]">{f.materialIcon}</span>
                                    {f.label}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Total Cost */}
                    <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Manifest Cost</span>
                        <span className="text-xl font-medium text-slate-900 font-mono tracking-tight">₹499,400.00</span>
                    </div>
                </div>

                {/* ── Scrollable Booking List ──────────────────────────────────────── */}
                <div className="flex-1 overflow-auto pb-32 p-8 bg-transparent scrollbar-hide">
                    {BOOKINGS_DATA.map((group) => (
                        <div key={group.day} className="mb-10 relative z-0">

                            {/* Sticky Day Header */}
                            <div className="flex items-center gap-4 mb-4 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-20 py-2 border-b border-slate-200">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                                        Day {String(group.day).padStart(2, '0')}
                                    </span>
                                    <h2 className="text-sm font-bold text-slate-800">{group.title}</h2>
                                </div>
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className="text-xs font-mono text-slate-400">{group.date}</span>
                            </div>

                            {/* Booking Rows — always full-width, no branching */}
                            <div className="flex flex-col gap-0 border border-slate-200 bg-white rounded-sm shadow-sm">
                                {group.rows.map((row) => {
                                    // Each row renders all its bookings as separate full-width items
                                    const filteredBookings = row.bookings.filter(
                                        b => activeFilter === 'all' || b.type === activeFilter
                                    );
                                    if (filteredBookings.length === 0) return null;

                                    return filteredBookings.map((booking) => {
                                        const Icon = getLucideTypeIcon(booking.type);
                                        const isCancelled = booking.status === 'cancelled';

                                        return (
                                            <div
                                                key={booking.id}
                                                className={cn(
                                                    'group relative p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0',
                                                    isCancelled ? 'bg-slate-50/50' : ''
                                                )}
                                            >
                                                <div className={cn(
                                                    'flex justify-between items-start',
                                                    isCancelled ? 'opacity-60' : ''
                                                )}>
                                                    <div className="flex gap-4 items-start w-full">
                                                        {/* Icon Box */}
                                                        <div className={cn(
                                                            'w-10 h-10 border border-slate-200 flex items-center justify-center text-slate-400 rounded-sm shrink-0',
                                                            isCancelled ? 'bg-slate-100' : 'bg-slate-50'
                                                        )}>
                                                            <Icon className={cn('w-5 h-5', isCancelled && 'text-slate-300')} />
                                                        </div>

                                                        {/* 12-col grid */}
                                                        <div className="flex-1 grid grid-cols-12 gap-4 items-center min-w-0">
                                                            {/* Col 1-5: Title + description + participants */}
                                                            <div className="col-span-5">
                                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                    <h3 className={cn(
                                                                        'font-semibold text-sm text-slate-900',
                                                                        isCancelled && 'line-through decoration-slate-400 text-slate-500'
                                                                    )}>
                                                                        {booking.title}
                                                                    </h3>
                                                                </div>
                                                                <p className={cn(
                                                                    'text-xs truncate mb-1.5',
                                                                    isCancelled ? 'text-slate-400' : 'text-slate-500'
                                                                )}>
                                                                    {booking.description}
                                                                </p>
                                                                {/* Participants chips */}
                                                                {booking.participants && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {booking.participants.map((p, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className={cn(
                                                                                    'px-1.5 py-px rounded-sm text-[9px] font-bold',
                                                                                    p.color,
                                                                                    isCancelled && 'opacity-50'
                                                                                )}
                                                                            >
                                                                                {p.label}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Col 6-8: Meta (ref + time) */}
                                                            <div className="col-span-3">
                                                                <div className={cn(
                                                                    'font-mono text-xs flex flex-col gap-1',
                                                                    isCancelled ? 'text-slate-400' : 'text-slate-600'
                                                                )}>
                                                                    {booking.metaPrimary && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className={cn('material-symbols-outlined text-[12px]', isCancelled ? 'text-slate-300' : 'text-slate-400')}>tag</span>
                                                                            {booking.metaPrimary}
                                                                        </span>
                                                                    )}
                                                                    {booking.time && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className={cn('material-symbols-outlined text-[12px]', isCancelled ? 'text-slate-300' : 'text-slate-400')}>schedule</span>
                                                                            {booking.time}
                                                                        </span>
                                                                    )}
                                                                    {booking.metaSecondary && !booking.time && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className={cn('material-symbols-outlined text-[12px]', isCancelled ? 'text-slate-300' : 'text-slate-400')}>date_range</span>
                                                                            {booking.metaSecondary}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Col 9-10: Status */}
                                                            <div className="col-span-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={cn(
                                                                        'inline-block w-2 h-2 rounded-full shrink-0',
                                                                        getStatusDot(booking.status)
                                                                    )} />
                                                                    <span className={cn(
                                                                        'text-xs font-mono font-medium',
                                                                        isCancelled ? 'text-slate-500' : 'text-slate-700'
                                                                    )}>
                                                                        {getStatusLabel(booking.status)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Col 11-12: Price */}
                                                            <div className="col-span-2 text-right">
                                                                <span className={cn(
                                                                    'font-mono text-sm font-medium',
                                                                    isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'
                                                                )}>
                                                                    {booking.price}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hover Actions */}
                                                <div className={cn(
                                                    'absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-4',
                                                    isCancelled ? 'bg-slate-50/50' : 'bg-slate-50'
                                                )}>
                                                    {isCancelled ? (
                                                        <button className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                                            Restore
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button className="p-1.5 rounded border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors">
                                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                            </button>
                                                            <button className="p-1.5 rounded border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors">
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })}

                                {/* Add Entry Row */}
                                <div className="p-3 bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors border-t border-slate-100">
                                    <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Add Entry to Day {group.day}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Floating AI Button ──────────────────────────────────────────── */}
                <div className="fixed bottom-6 left-6 z-[60] pointer-events-none">
                    <div className="flex items-end gap-3 pointer-events-auto">
                        {/* AI button */}
                        <button
                            onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
                            title="Voyageur AI"
                            className={cn(
                                'relative w-10 h-10 rounded-full flex items-center justify-center border shadow-md transition-all hover:scale-105',
                                activePanel === 'ai'
                                    ? 'bg-stone-800 text-white border-stone-800'
                                    : 'bg-[#faf9f6] text-stone-600 border-stone-300 hover:border-stone-500 hover:text-stone-900'
                            )}
                        >
                            {/* Compass-rose logo */}
                            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" />
                                <path d="M12 2 L13.5 9 L12 7 L10.5 9 Z" fill="currentColor" opacity="0.9" />
                                <path d="M12 22 L10.5 15 L12 17 L13.5 15 Z" fill="currentColor" opacity="0.4" />
                                <path d="M22 12 L15 10.5 L17 12 L15 13.5 Z" fill="currentColor" opacity="0.6" />
                                <path d="M2 12 L9 13.5 L7 12 L9 10.5 Z" fill="currentColor" opacity="0.6" />
                                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                            </svg>
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">3</div>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Command Center Sidebar ─────────────────────────────────────────── */}
            <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col shadow-2xl relative z-40 text-[13px] shrink-0">
                {/* Sidebar Header */}
                <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-900 text-base">terminal</span>
                        <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.15em]">Command Center</h2>
                    </div>
                    <div className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">

                    {/* Efficiency Matrix */}
                    <section className="px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Efficiency Matrix</h3>
                            <span className="text-[9px] font-mono font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+12.4% Optimal</span>
                        </div>
                        <div className="space-y-3">
                            {/* Budget Burn Rate card */}
                            <div className="bg-white border border-slate-200 rounded p-3">
                                <div className="flex justify-between text-[9px] mb-1.5 font-mono font-bold text-slate-500 uppercase">
                                    <span>Budget Burn Rate</span>
                                    <span className="text-slate-900">78%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '78%' }} />
                                </div>
                                <div className="flex justify-between items-end mt-3 pt-2 border-t border-slate-200/50">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="text-[9px] uppercase text-slate-400 font-bold block mb-0.5">Remaining</span>
                                            <div className="font-mono text-[11px] font-semibold text-slate-700">₹140,600</div>
                                        </div>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <div>
                                            <span className="text-[9px] uppercase text-slate-400 font-bold block mb-0.5">Net Margin</span>
                                            <div className="font-mono text-[11px] font-bold text-green-600">+₹52.4k</div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono">EST. EOM</div>
                                </div>
                            </div>

                            {/* Pax / Vendor grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white border border-slate-200 rounded p-2 flex flex-col justify-between">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Pax Ready</span>
                                    <span className="text-sm font-mono font-medium leading-none">18/22</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded p-2 flex flex-col justify-between">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Vendor Conf.</span>
                                    <span className="text-sm font-mono font-medium leading-none">92%</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Active Intelligence */}
                    <section className="px-4 py-3 bg-slate-50/30">
                        <div className="flex items-center gap-1.5 mb-3">
                            <span className="material-symbols-outlined text-slate-400 text-sm">bolt</span>
                            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Intelligence</h3>
                        </div>
                        <div className="space-y-2">
                            {ACTIVE_INTELLIGENCE.map((item, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'pl-3 py-1.5 pr-2 border-l-2 bg-white transition-colors',
                                        item.borderColor,
                                        item.hoverBg
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-0.5">
                                        <span className={cn('text-[9px] font-bold uppercase tracking-tight flex items-center gap-1', item.labelColor)}>
                                            <span className="material-symbols-outlined text-[10px]">{item.icon}</span>
                                            {item.label}
                                        </span>
                                        {item.time && (
                                            <span className="text-[9px] text-slate-300 font-mono">{item.time}</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] leading-snug text-slate-600 font-medium">{item.message}</p>
                                    {item.action && (
                                        <button className="mt-1 text-[10px] text-blue-600 font-medium hover:underline">{item.action}</button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Command query input */}
                        <div className="mt-4 relative">
                            <input
                                type="text"
                                value={commandQuery}
                                onChange={(e) => setCommandQuery(e.target.value)}
                                placeholder="Ask Nex Intelligence..."
                                className="w-full bg-white border border-slate-200 py-2 pl-8 pr-3 text-[11px] font-mono text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 rounded shadow-sm"
                            />
                            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-300 text-[14px]">alternate_email</span>
                        </div>
                    </section>
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-slate-200 bg-white grid grid-cols-2 gap-2 shrink-0">
                    <button className="flex items-center justify-center gap-1.5 py-1.5 px-3 border border-slate-200 rounded text-[9px] font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-widest transition-all">
                        <span className="material-symbols-outlined text-[12px]">ios_share</span> Export
                    </button>
                    <button className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-900 text-white rounded text-[9px] font-bold hover:bg-slate-800 uppercase tracking-widest transition-all">
                        <span className="material-symbols-outlined text-[12px]">save</span> Archive
                    </button>
                </div>
            </aside>

            {/* Shared Voyageur AI Panel */}
            <VoyageurAIPanel
                open={activePanel === 'ai'}
                onOpenChange={(open) => setActivePanel(open ? 'ai' : null)}
                insightTag="Active Alerts"
                insightTagColor="bg-indigo-50 text-indigo-800 border-indigo-200"
                insightBody={
                    <ul className="space-y-2 mt-1">
                        {AI_ALERTS.map((alert, i) => (
                            <li key={i} className="flex gap-2 items-start">
                                <span className={cn('w-1.5 h-1.5 rounded-full mt-1 shrink-0', alert.dot)} />
                                <span>{alert.text}</span>
                            </li>
                        ))}
                    </ul>
                }
                inputPlaceholder="Query booking manifest..."
                seedMessage="Booking manifest loaded. 3 alerts detected. Ask me anything about this trip."
                getAIReply={(text) => `Analyzing: "${text}". Checking booking conflicts and availability across all families.`}
            />
        </div>
    );
}
