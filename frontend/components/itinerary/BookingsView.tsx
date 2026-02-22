'use client';

import React, { useState } from 'react';
import {
    Plane, Hotel, Utensils, Bus,
    Calendar, TrendingUp, Minimize2
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
    timeRange: string;
    rows: BookingRow[];
}

// ─── Family tag colour map — matches ItineraryDetailView ─────────────────────
const FAM_COLORS: Record<string, string> = {
    'FAM A': 'bg-blue-50 text-blue-700 border-blue-400',
    'FAM B': 'bg-amber-50 text-amber-700 border-amber-400',
    'FAM C': 'bg-rose-50 text-rose-700 border-rose-400',
    'All': 'bg-slate-50 text-slate-600 border-slate-300',
};

const ALL_FAMILIES = [
    { label: 'FAM A', color: FAM_COLORS['FAM A'] },
    { label: 'FAM B', color: FAM_COLORS['FAM B'] },
    { label: 'FAM C', color: FAM_COLORS['FAM C'] },
];

const BOOKINGS_DATA: DayGroup[] = [
    {
        day: 1,
        title: 'Day 1: Paris Sightseeing',
        date: 'OCT 12',
        timeRange: '08:00 – 17:30',
        rows: [
            {
                id: 'row-1-flight',
                bookings: [
                    {
                        id: 'AI-142',
                        type: 'flight',
                        status: 'confirmed',
                        title: 'Air India AI-142',
                        description: 'DEL → CDG · Charles de Gaulle, Terminal 2E',
                        date: 'OCT 12',
                        time: '02:15 UTC+1',
                        location: 'CDG T2E',
                        price: '₹2,85,000',
                        metaPrimary: 'AI-142',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-1-transfer',
                bookings: [
                    {
                        id: 'TRN-CDG-01',
                        type: 'transport',
                        status: 'confirmed',
                        title: 'Private Coach Transfer',
                        description: 'CDG → Hôtel Le Marais · Luggage pre-loaded',
                        date: 'OCT 12',
                        time: '08:30 UTC+1',
                        price: 'Included',
                        metaPrimary: 'TRN-CDG-01',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-1-hotel-a',
                bookings: [
                    {
                        id: 'HTL-LM-01',
                        type: 'stay',
                        status: 'confirmed',
                        title: 'Hôtel Le Marais',
                        description: '8× Deluxe Rooms · Classic Parisian Wing',
                        date: 'OCT 12',
                        location: 'Paris 3e, Le Marais',
                        price: '₹3,84,000',
                        metaPrimary: 'HTL-LM-01',
                        metaSecondary: '3 Nights',
                        participants: [
                            { label: 'FAM A', color: FAM_COLORS['FAM A'] },
                            { label: 'FAM B', color: FAM_COLORS['FAM B'] },
                        ],
                    },
                ],
            },
            {
                id: 'row-1-hotel-b',
                bookings: [
                    {
                        id: 'HTL-VD-01',
                        type: 'stay',
                        status: 'pending',
                        title: 'Villa des Artistes',
                        description: '4× Superior Suite · Garden View',
                        date: 'OCT 12',
                        location: 'Paris 6e, Saint-Germain',
                        price: '₹1,44,000',
                        metaPrimary: 'HTL-VD-01',
                        metaSecondary: '3 Nights',
                        participants: [
                            { label: 'FAM C', color: FAM_COLORS['FAM C'] },
                        ],
                    },
                ],
            },
            {
                id: 'row-1-breakfast',
                bookings: [
                    {
                        id: 'DIN-CDF-01',
                        type: 'dining',
                        status: 'confirmed',
                        title: 'Breakfast at Café de Flore',
                        description: 'Croissants, café au lait · Full group sync',
                        date: 'OCT 12',
                        time: '08:00 UTC+1',
                        price: '₹18,000',
                        metaPrimary: 'DIN-CDF-01',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-1-dinner',
                bookings: [
                    {
                        id: 'DIN-BL-01',
                        type: 'dining',
                        status: 'confirmed',
                        title: 'Dinner at Brasserie Lipp',
                        description: 'Prix-fixe menu · Wine pairings · Full group reunion',
                        date: 'OCT 12',
                        time: '19:30 UTC+1',
                        location: 'Paris 6e',
                        price: '₹54,000',
                        metaPrimary: 'DIN-BL-01',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
        ],
    },
    {
        day: 2,
        title: 'Day 2: Versailles & Montmartre',
        date: 'OCT 13',
        timeRange: '09:00 – 21:00',
        rows: [
            {
                id: 'row-2-train-out',
                bookings: [
                    {
                        id: 'TRN-RERC-01',
                        type: 'transport',
                        status: 'confirmed',
                        title: 'RER C to Versailles',
                        description: 'Gare Saint-Lazare · Reserved carriages · Validate tickets',
                        date: 'OCT 13',
                        time: '09:00 UTC+1',
                        price: '₹4,500',
                        metaPrimary: 'TRN-RERC-01',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-2-palace',
                bookings: [
                    {
                        id: 'ACT-VER-PAL',
                        type: 'dining',
                        status: 'confirmed',
                        title: 'Palace of Versailles',
                        description: 'Guided interior · Hall of Mirrors · Audio included',
                        date: 'OCT 13',
                        time: '10:00 UTC+1',
                        location: 'VER_PAL',
                        price: '₹28,000',
                        metaPrimary: 'ACT-501',
                        participants: [
                            { label: 'FAM A', color: FAM_COLORS['FAM A'] },
                            { label: 'FAM C', color: FAM_COLORS['FAM C'] },
                        ],
                    },
                ],
            },
            {
                id: 'row-2-gardens',
                bookings: [
                    {
                        id: 'ACT-VER-GDN',
                        type: 'dining',
                        status: 'confirmed',
                        title: 'Versailles Gardens',
                        description: 'Grand Canal · Fountain show 11:00 · Bicycle rental',
                        date: 'OCT 13',
                        time: '10:00 UTC+1',
                        location: 'VER_GDN',
                        price: '₹9,000',
                        metaPrimary: 'ACT-502',
                        participants: [
                            { label: 'FAM B', color: FAM_COLORS['FAM B'] },
                        ],
                    },
                ],
            },
            {
                id: 'row-2-picnic',
                bookings: [
                    {
                        id: 'DIN-PIC-01',
                        type: 'dining',
                        status: 'confirmed',
                        title: 'Garden Picnic Lunch',
                        description: 'Catered baskets · Cheese, charcuterie, baguettes',
                        date: 'OCT 13',
                        time: '13:30 UTC+1',
                        location: 'VER_GDN',
                        price: '₹36,000',
                        metaPrimary: 'DIN-PIC-01',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-2-train-back',
                bookings: [
                    {
                        id: 'TRN-RERC-02',
                        type: 'transport',
                        status: 'confirmed',
                        title: 'RER C Return to Paris',
                        description: 'Versailles-Château → Gare Saint-Lazare',
                        date: 'OCT 13',
                        time: '15:30 UTC+1',
                        price: '₹4,500',
                        metaPrimary: 'TRN-RERC-02',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-2-dinner',
                bookings: [
                    {
                        id: 'DIN-RB-01',
                        type: 'dining',
                        status: 'confirmed',
                        title: 'Dinner at Le Relais de la Butte',
                        description: 'Onion soup · Duck confit · Rooftop terrace',
                        date: 'OCT 13',
                        time: '19:30 UTC+1',
                        location: 'Paris 18e',
                        price: '₹45,000',
                        metaPrimary: 'DIN-RB-01',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
        ],
    },
    {
        day: 3,
        title: 'Day 3: Food & Departure',
        date: 'OCT 14',
        timeRange: '08:30 – 16:00',
        rows: [
            {
                id: 'row-3-market',
                bookings: [
                    {
                        id: 'ACT-MAR-01',
                        type: 'dining',
                        status: 'confirmed',
                        title: "Marché d'Aligre",
                        description: 'Flea & Food Market · Fresh produce · Chef-guided',
                        date: 'OCT 14',
                        time: '08:30 UTC+1',
                        location: 'PARIS_05',
                        price: '₹6,000',
                        metaPrimary: 'ACT-601',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-3-cooking',
                bookings: [
                    {
                        id: 'ACT-COOK-01',
                        type: 'dining',
                        status: 'confirmed',
                        title: 'French Cooking Class',
                        description: 'Le Cordon Bleu pop-up · Coq au vin + soufflé',
                        date: 'OCT 14',
                        time: '10:30 UTC+1',
                        location: 'PARIS_11',
                        price: '₹40,000',
                        metaPrimary: 'ACT-610',
                        participants: [
                            { label: 'FAM A', color: FAM_COLORS['FAM A'] },
                            { label: 'FAM B', color: FAM_COLORS['FAM B'] },
                        ],
                    },
                ],
            },
            {
                id: 'row-3-pastry',
                bookings: [
                    {
                        id: 'ACT-PAST-01',
                        type: 'dining',
                        status: 'pending',
                        title: 'Pâtisserie Workshop',
                        description: 'Ladurée Atelier · Macaron & éclair · Kid-friendly',
                        date: 'OCT 14',
                        time: '10:30 UTC+1',
                        location: 'PARIS_02',
                        price: '₹16,000',
                        metaPrimary: 'ACT-611',
                        participants: [
                            { label: 'FAM C', color: FAM_COLORS['FAM C'] },
                        ],
                    },
                ],
            },
            {
                id: 'row-3-farewell',
                bookings: [
                    {
                        id: 'DIN-JV-01',
                        type: 'dining',
                        status: 'confirmed',
                        title: 'Farewell Lunch – Jules Verne',
                        description: 'Eiffel Tower 2F · Tasting menu · Champagne toast',
                        date: 'OCT 14',
                        time: '13:00 UTC+1',
                        location: 'PARIS_08',
                        price: '₹1,44,000',
                        metaPrimary: 'DIN-JV-01',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-3-checkout',
                bookings: [
                    {
                        id: 'CHECKOUT-01',
                        type: 'stay',
                        status: 'confirmed',
                        title: 'Hotel Checkout',
                        description: 'Check-out from respective Paris hotels',
                        date: 'OCT 14',
                        time: '12:00 UTC+1',
                        price: 'Settled',
                        metaPrimary: 'CHECKOUT-01',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-3-transfer-cdg',
                bookings: [
                    {
                        id: 'TRN-CDG-02',
                        type: 'transport',
                        status: 'confirmed',
                        title: 'Transfer to CDG Airport',
                        description: 'Private coach · Luggage pre-loaded · 2h30m buffer',
                        date: 'OCT 14',
                        time: '15:30 UTC+1',
                        location: 'CDG T2',
                        price: 'Included',
                        metaPrimary: 'TRN-301',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
            {
                id: 'row-3-flight-return',
                bookings: [
                    {
                        id: 'AI-143',
                        type: 'flight',
                        status: 'confirmed',
                        title: 'Air India AI-143',
                        description: 'CDG → DEL · Return flight',
                        date: 'OCT 14',
                        time: '18:45 UTC+1',
                        location: 'CDG T2E',
                        price: '₹2,85,000',
                        metaPrimary: 'AI-143',
                        participants: ALL_FAMILIES,
                    },
                ],
            },
        ],
    },
];

const FILTERS = [
    { id: 'all', label: 'All', materialIcon: 'apps' },
    { id: 'flight', label: 'Flights', materialIcon: 'flight' },
    { id: 'stay', label: 'Stay', materialIcon: 'hotel' },
    { id: 'dining', label: 'Dining', materialIcon: 'restaurant' },
    { id: 'transport', label: 'Transport', materialIcon: 'directions_bus' },
] as const;

const AI_ALERTS = [
    { level: 'critical', dot: 'bg-red-500', text: <><span className="text-red-700 font-bold">CAUTION:</span> FAM C hotel pending — chase confirmation before OCT 11.</> },
    { level: 'info', dot: 'bg-blue-500', text: <>Upgrade available at Hôtel Le Marais: Junior Suite +₹8k/night.</> },
    { level: 'warn', dot: 'bg-amber-500', text: <>Jules Verne farewell lunch is near capacity — confirm headcount today.</> },
];

const ACTIVE_INTELLIGENCE = [
    {
        level: 'critical',
        borderColor: 'border-red-500',
        hoverBg: 'hover:bg-red-50/50',
        labelColor: 'text-red-600',
        icon: 'error',
        label: 'PENDING',
        time: 'T-48h',
        message: 'Villa des Artistes [HTL-VD-01] confirmation outstanding.',
        action: 'Send chase email?',
    },
    {
        level: 'optimization',
        borderColor: 'border-indigo-500',
        hoverBg: 'hover:bg-indigo-50/50',
        labelColor: 'text-indigo-600',
        icon: 'lightbulb',
        label: 'UPGRADE',
        time: null,
        message: 'Junior Suite upgrade at Le Marais available for ₹16k total (2 nights × 2 rooms).',
        action: null,
    },
    {
        level: 'warning',
        borderColor: 'border-amber-500',
        hoverBg: 'hover:bg-amber-50/50',
        labelColor: 'text-amber-600',
        icon: 'warning',
        label: 'CAPACITY',
        time: null,
        message: 'Jules Verne (DIN-JV-01) seating at 90% capacity. Confirm final PAX count.',
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
    const [profitOpen, setProfitOpen] = useState(false);

    if (!trip) return <div className="p-8 text-center text-muted-foreground font-mono text-sm">Trip not found.</div>;

    return (
        <div className="flex-1 flex overflow-hidden h-full bp-grid-bg bg-white">

            {/* ── Main Content ──────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* ── Sub-header: Filters & Cost ──────────────────────────────────── */}
                <div className="border-b border-gray-200 bg-gray-50 px-8 py-3 flex justify-between items-center shrink-0">
                    {/* Filters — neuromorphic inset tray */}
                    <div
                        className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-2 py-1.5 rounded-lg"
                        style={{
                            background: '#e8e8e8',
                            boxShadow: 'inset 3px 3px 6px #c8c8c8, inset -3px -3px 6px #ffffff'
                        }}
                    >
                        {FILTERS.map((f, idx) => (
                            <React.Fragment key={f.id}>
                                {idx === 1 && <div className="h-4 w-px bg-gray-300 mx-0.5" />}
                                <button
                                    onClick={() => setActiveFilter(f.id)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all',
                                        activeFilter === f.id
                                            ? 'text-white bg-gray-900'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                    )}
                                    style={activeFilter === f.id ? {
                                        boxShadow: '3px 3px 6px #b0b0b0, -2px -2px 5px #ffffff'
                                    } : {}}
                                >
                                    <span className="material-symbols-outlined text-[14px]">{f.materialIcon}</span>
                                    {f.label}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Total Cost */}
                    <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Manifest Cost</span>
                        <span className="text-xl font-medium text-gray-900 font-mono tracking-tight">₹11,22,000</span>
                    </div>
                </div>

                {/* ── Scrollable Booking List ──────────────────────────────────────── */}
                <div className="flex-1 overflow-auto pb-32 p-8 bg-transparent scrollbar-hide">
                    {BOOKINGS_DATA.map((group) => (
                        <div key={group.day} className="mb-10 relative z-0">

                            {/* Sticky Day Header — matches ItineraryDetailView's per-day sticky header */}
                            <div className="sticky top-0 z-30 border-b border-gray-200 bg-gray-50 w-full mb-4">
                                <div className="px-6 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-4 font-semibold">
                                        <span className="text-[10px] uppercase tracking-widest font-mono text-gray-500">
                                            {group.date}
                                        </span>
                                        <span className="text-black text-xl font-bold normal-case tracking-normal">{group.title}</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500">
                                        {group.rows.length} ENTRIES · {group.timeRange}
                                    </span>
                                </div>
                            </div>

                            {/* Booking Rows */}
                            <div className="flex flex-col gap-0 border border-gray-200 bg-white shadow-sm overflow-hidden">
                                {group.rows.map((row) => {
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
                                                    'group relative p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0',
                                                    isCancelled ? 'bg-gray-50/60' : ''
                                                )}
                                            >
                                                <div className={cn(
                                                    'flex justify-between items-start',
                                                    isCancelled ? 'opacity-60' : ''
                                                )}>
                                                    <div className="flex gap-4 items-start w-full">
                                                        {/* Icon Box — rounded-lg to match card design */}
                                                        <div className={cn(
                                                            'w-10 h-10 border border-gray-200 flex items-center justify-center text-gray-400 rounded-sm shrink-0',
                                                            isCancelled ? 'bg-gray-100' : 'bg-gray-50'
                                                        )}>
                                                            <Icon className={cn('w-5 h-5', isCancelled && 'text-gray-300')} />
                                                        </div>

                                                        {/* 12-col grid */}
                                                        <div className="flex-1 grid grid-cols-12 gap-4 items-center min-w-0">
                                                            {/* Col 1-5: Title + description + participants */}
                                                            <div className="col-span-5">
                                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                    <h3 className={cn(
                                                                        'font-semibold text-sm text-gray-900',
                                                                        isCancelled && 'line-through decoration-gray-400 text-gray-500'
                                                                    )}>
                                                                        {booking.title}
                                                                    </h3>
                                                                </div>
                                                                <p className={cn(
                                                                    'text-xs truncate mb-1.5',
                                                                    isCancelled ? 'text-gray-400' : 'text-gray-500'
                                                                )}>
                                                                    {booking.description}
                                                                </p>
                                                                {/* Participants chips — colour-matched FAM tags */}
                                                                {booking.participants && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {booking.participants.map((p, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className={cn(
                                                                                    'px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border',
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
                                                                    isCancelled ? 'text-gray-400' : 'text-gray-600'
                                                                )}>
                                                                    {booking.metaPrimary && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className={cn('material-symbols-outlined text-[12px]', isCancelled ? 'text-gray-300' : 'text-gray-400')}>tag</span>
                                                                            {booking.metaPrimary}
                                                                        </span>
                                                                    )}
                                                                    {booking.time && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className={cn('material-symbols-outlined text-[12px]', isCancelled ? 'text-gray-300' : 'text-gray-400')}>schedule</span>
                                                                            {booking.time}
                                                                        </span>
                                                                    )}
                                                                    {booking.metaSecondary && !booking.time && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className={cn('material-symbols-outlined text-[12px]', isCancelled ? 'text-gray-300' : 'text-gray-400')}>date_range</span>
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
                                                                        isCancelled ? 'text-gray-500' : 'text-gray-700'
                                                                    )}>
                                                                        {getStatusLabel(booking.status)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Col 11-12: Price */}
                                                            <div className="col-span-2 text-right">
                                                                <span className={cn(
                                                                    'font-mono text-sm font-medium',
                                                                    isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'
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
                                                    isCancelled ? 'bg-gray-50/60' : 'bg-gray-50'
                                                )}>
                                                    {isCancelled ? (
                                                        <button className="px-2 py-1 rounded border border-gray-300 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                                                            Restore
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button className="p-1.5 rounded border border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-colors">
                                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                            </button>
                                                            <button className="p-1.5 rounded border border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors">
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
                                <div className="p-3 bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors border-t border-gray-100">
                                    <span className="text-xs font-mono text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Add Entry to {group.title.split(':')[0]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>


            </div>

            {/* ── Command Center Sidebar ─────────────────────────────────────────── */}
            <aside className="w-[340px] bg-[#faf9f6] border-l border-stone-200 flex flex-col shadow-2xl relative z-40 text-[13px] shrink-0">
                {/* Sidebar Header */}
                <div className="h-12 px-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-stone-900 text-base">terminal</span>
                        <h2 className="text-[11px] font-bold text-stone-900 uppercase tracking-[0.15em]">Command Center</h2>
                    </div>
                    <div className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-200" />
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">

                    {/* Efficiency Matrix */}
                    <section className="px-4 py-3 border-b border-stone-100">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Efficiency Matrix</h3>
                            <span className="text-[9px] font-mono font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+8.1% Optimal</span>
                        </div>
                        <div className="space-y-3">
                            {/* Budget Burn Rate card */}
                            <div className="bg-white border border-stone-200 rounded p-3 shadow-sm">
                                <div className="flex justify-between text-[9px] mb-1.5 font-mono font-bold text-stone-500 uppercase">
                                    <span>Budget Burn Rate</span>
                                    <span className="text-stone-900">84%</span>
                                </div>
                                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-stone-800 rounded-full" style={{ width: '84%' }} />
                                </div>
                                <div className="flex justify-between items-end mt-3 pt-2 border-t border-stone-100">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="text-[9px] uppercase text-stone-400 font-bold block mb-0.5">Remaining</span>
                                            <div className="font-mono text-[11px] font-semibold text-stone-700">₹1,79,520</div>
                                        </div>
                                        <div className="h-4 w-px bg-stone-200" />
                                        <div>
                                            <span className="text-[9px] uppercase text-stone-400 font-bold block mb-0.5">Net Margin</span>
                                            <div className="font-mono text-[11px] font-bold text-green-600">+₹89.4k</div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-stone-400 font-mono">EST. EOM</div>
                                </div>
                            </div>

                            {/* Pax / Vendor grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white border border-stone-200 rounded p-2 flex flex-col justify-between shadow-sm">
                                    <span className="text-[9px] text-stone-400 font-bold uppercase mb-1">Pax Ready</span>
                                    <span className="text-sm font-mono font-medium leading-none">22/22</span>
                                </div>
                                <div className="bg-white border border-stone-200 rounded p-2 flex flex-col justify-between shadow-sm">
                                    <span className="text-[9px] text-stone-400 font-bold uppercase mb-1">Vendor Conf.</span>
                                    <span className="text-sm font-mono font-medium leading-none">88%</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Active Intelligence */}
                    <section className="px-4 py-3 bg-stone-50/30">
                        <div className="flex items-center gap-1.5 mb-3">
                            <span className="material-symbols-outlined text-stone-400 text-sm">bolt</span>
                            <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Active Intelligence</h3>
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
                                            <span className="text-[9px] text-stone-300 font-mono">{item.time}</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] leading-snug text-stone-600 font-medium">{item.message}</p>
                                    {item.action && (
                                        <button className="mt-1 text-[10px] text-blue-600 font-medium hover:underline">{item.action}</button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Profit pill (collapsed) */}
                        {!profitOpen && (
                            <button
                                onClick={() => setProfitOpen(true)}
                                className="mt-4 w-full flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded shadow-sm hover:border-emerald-300 transition-colors group"
                                title="Open Profit Impact"
                            >
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-stone-500 group-hover:text-emerald-600 transition-colors" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-700">Profit Impact</span>
                                </div>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full font-mono">+2.1%</span>
                            </button>
                        )}

                        {/* Profit panel (expanded) */}
                        {profitOpen && (
                            <div className="mt-4 bg-white border border-stone-200 rounded shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-800">Profit Impact</span>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full font-mono">+2.1%</span>
                                    </div>
                                    <button onClick={() => setProfitOpen(false)} className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors">
                                        <Minimize2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="p-3 space-y-2">
                                    <div className="grid grid-cols-3 divide-x divide-stone-100">
                                        <div className="pr-3 flex flex-col">
                                            <span className="text-[8px] uppercase font-bold text-stone-400 font-mono tracking-wider">Revenue</span>
                                            <span className="text-sm font-bold text-stone-800 font-mono">₹13.4L</span>
                                        </div>
                                        <div className="px-3 flex flex-col">
                                            <span className="text-[8px] uppercase font-bold text-stone-400 font-mono tracking-wider">Cost</span>
                                            <span className="text-sm font-bold text-stone-600 font-mono">₹11.2L</span>
                                        </div>
                                        <div className="pl-3 flex flex-col">
                                            <span className="text-[8px] uppercase font-bold text-stone-400 font-mono tracking-wider">Margin</span>
                                            <span className="text-sm font-bold text-emerald-600 font-mono">16.4%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '16%' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Command query input */}
                        <div className="mt-4 relative">
                            <input
                                type="text"
                                value={commandQuery}
                                onChange={(e) => setCommandQuery(e.target.value)}
                                placeholder="Ask Nex Intelligence..."
                                className="w-full bg-white border border-stone-200 py-2 pl-8 pr-3 text-[11px] font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-400 rounded shadow-sm"
                            />
                            <span className="material-symbols-outlined absolute left-2.5 top-2 text-stone-300 text-[14px]">alternate_email</span>
                        </div>
                    </section>
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-stone-200 bg-white grid grid-cols-2 gap-2 shrink-0">
                    <button className="flex items-center justify-center gap-1.5 py-1.5 px-3 border border-stone-200 rounded text-[9px] font-bold text-stone-600 hover:bg-stone-50 uppercase tracking-widest transition-all">
                        <span className="material-symbols-outlined text-[12px]">ios_share</span> Export
                    </button>
                    <button className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-stone-900 text-white rounded text-[9px] font-bold hover:bg-stone-800 uppercase tracking-widest transition-all">
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
                seedMessage="Paris booking manifest loaded. 3 alerts detected. Ask me anything about this trip."
                getAIReply={(text) => `Analyzing: "${text}". Checking booking conflicts and availability across all families.`}
            />
        </div>
    );
}
