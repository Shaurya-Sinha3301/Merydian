'use client';

import React, { useState, useEffect } from 'react';
import {
    Plane, Hotel, Utensils, Bus,
    Calendar, TrendingUp, Minimize2,
    Hash, Clock, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/api';
import VoyageurAIPanel from './VoyageurAIPanel';

// ─── Types ──────────────────────────────────────────────────────────────────────

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
const FAM_COLOR_PALETTE = [
    { key: 'FAM A', style: 'bg-black text-white border-black' },
    { key: 'FAM B', style: 'bg-[#2C4C3B] text-white border-[#2C4C3B]' },
    { key: 'FAM C', style: 'bg-[#C5A059] text-white border-[#C5A059]' },
    { key: 'FAM D', style: 'bg-[#5B3A8C] text-white border-[#5B3A8C]' },
    { key: 'FAM E', style: 'bg-[#1A6B6A] text-white border-[#1A6B6A]' },
];

/** Map raw family IDs to labelled chips. */
function buildFamilyMap(familyIds: string[]): Record<string, { label: string; color: string }> {
    const map: Record<string, { label: string; color: string }> = {};
    familyIds.forEach((fid, idx) => {
        const palette = FAM_COLOR_PALETTE[idx % FAM_COLOR_PALETTE.length];
        map[fid] = { label: palette.key, color: palette.style };
    });
    return map;
}

/** Format a number as ₹X,XXX */
function formatINR(n: number): string {
    if (n === 0) return '–';
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Transform API response into the DayGroup[] structure used by the rendering code. */
function transformApiBookings(apiData: any): { days: DayGroup[]; totalCost: number } {
    if (!apiData || !apiData.days) return { days: [], totalCost: 0 };

    const familyMap = buildFamilyMap(apiData.families || []);

    const days: DayGroup[] = apiData.days.map((dayObj: any) => {
        const rows: BookingRow[] = (dayObj.rows || []).map((row: any) => {
            const participants = (row.families || []).map((fid: string) =>
                familyMap[fid] || { label: fid.slice(0, 6), color: 'bg-gray-200 text-gray-700 border-gray-300' }
            );

            const booking: Booking = {
                id: row.id,
                type: row.type as BookingType,
                status: (row.status || 'pending') as BookingStatus,
                title: row.title,
                description: row.description || '',
                date: row.date || '',
                time: row.time || undefined,
                price: row.price ? formatINR(row.price) : '–',
                metaPrimary: row.ref_id || undefined,
                metaSecondary: row.meta_secondary || undefined,
                participants,
            };

            return { id: row.id, bookings: [booking] } as BookingRow;
        });

        return {
            day: dayObj.day,
            title: dayObj.title,
            date: dayObj.date,
            timeRange: dayObj.time_range || '',
            rows,
        } as DayGroup;
    });

    return { days, totalCost: apiData.total_cost || 0 };
}

const FILTERS = [
    { id: 'all', label: 'All', materialIcon: 'apps' },
    { id: 'flight', label: 'Flights', materialIcon: 'flight' },
    { id: 'stay', label: 'Stay', materialIcon: 'hotel' },
    { id: 'dining', label: 'Dining', materialIcon: 'restaurant' },
    { id: 'transport', label: 'Transport', materialIcon: 'directions_bus' },
] as const;

const AI_ALERTS = [
    { level: 'critical', dot: 'bg-red-500', text: <><span className="text-red-700 font-bold">CAUTION:</span> Pending hotel — chase confirmation before trip date.</> },
    { level: 'info', dot: 'bg-blue-500', text: <>Upgrade opportunities may be available. Check with vendor.</> },
    { level: 'warn', dot: 'bg-amber-500', text: <>Dining venue near capacity — confirm headcount today.</> },
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
        message: 'Hotel confirmation outstanding for one or more families.',
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
        message: 'Room upgrade available — check vendor pricing.',
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
        message: 'Dining venue at high capacity. Confirm final PAX count.',
        action: null,
    },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getStatusDot(status: BookingStatus) {
    switch (status) {
        case 'confirmed': return 'bg-[#2C4C3B] shadow-[0_0_0_2px_#E6ECE9]';
        case 'pending': return 'bg-[#C5A059] shadow-[0_0_0_2px_#F8F5F0]';
        case 'cancelled': return 'bg-gray-400 shadow-[0_0_0_2px_#F1F5F9]';
        case 'delayed': return 'bg-[#C5A059] shadow-[0_0_0_2px_#F8F5F0]';
        default: return 'bg-gray-400 shadow-[0_0_0_2px_#F1F5F9]';
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
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [activePanel, setActivePanel] = useState<'profit' | 'ai' | null>(null);
    const [commandQuery, setCommandQuery] = useState('');
    const [profitOpen, setProfitOpen] = useState(false);

    // ── Data fetching ────────────────────────────────────────────────────────
    const [bookingsData, setBookingsData] = useState<DayGroup[]>([]);
    const [totalCost, setTotalCost] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        apiClient.getTripBookings(tripId)
            .then((data) => {
                if (cancelled) return;
                const { days, totalCost: tc } = transformApiBookings(data);
                setBookingsData(days);
                setTotalCost(tc);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Failed to fetch bookings:', err);
                setError(err.message || 'Failed to load bookings');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [tripId]);

    return (
        <div className="flex-1 flex overflow-hidden h-full bp-grid-bg bg-white">

            {/* ── Main Content ──────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* ── Sub-header: Filters & Cost ──────────────────────────────────── */}
                <div className="border-b border-gray-200 bg-gray-50 px-8 py-3 flex justify-between items-center shrink-0">
                    {/* Filters — GroupsView-style tab tray */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide bg-white p-1 rounded-none border border-black/10">
                        {FILTERS.map((f, idx) => (
                            <React.Fragment key={f.id}>
                                {idx === 1 && <div className="h-4 w-px bg-black/10 mx-0.5" />}
                                <button
                                    onClick={() => setActiveFilter(f.id)}
                                    className={cn(
                                        'px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors rounded-none capitalize border border-transparent',
                                        activeFilter === f.id
                                            ? 'bg-black text-[#C5A059] shadow-sm'
                                            : 'bg-transparent text-gray-500 hover:text-black'
                                    )}
                                >
                                    <span className="material-symbols-outlined text-[15px]">{f.materialIcon}</span>
                                    {f.label}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Total Cost */}
                    <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Manifest Cost</span>
                        <span className="text-xl font-medium text-gray-900 font-mono tracking-tight">{formatINR(totalCost)}</span>
                    </div>
                </div>

                {/* ── Scrollable Booking List ──────────────────────────────────────── */}
                <div className="flex-1 overflow-auto pb-32 p-8 bg-transparent scrollbar-hide">
                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Loading booking manifest…</span>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <span className="material-symbols-outlined text-red-400 text-3xl">error</span>
                            <span className="text-xs text-red-500 font-mono">{error}</span>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 px-4 py-1.5 border border-gray-300 text-xs font-mono uppercase tracking-wider hover:bg-gray-50 transition-colors"
                            >Retry</button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && bookingsData.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <span className="material-symbols-outlined text-gray-300 text-3xl">event_busy</span>
                            <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">No bookable items found</span>
                        </div>
                    )}

                    {!loading && !error && bookingsData.map((group) => (
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
                                                            'w-10 h-10 border flex items-center justify-center shrink-0 rounded-none transition-colors border-black/10',
                                                            isCancelled
                                                                ? 'bg-gray-50 text-gray-300'
                                                                : 'bg-white text-black shadow-sm'
                                                        )}>
                                                            <Icon strokeWidth={1} className={cn('w-5 h-5', isCancelled && 'text-gray-300')} />
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
                                                                        <span className="flex items-center gap-1.5">
                                                                            <Hash strokeWidth={1.5} className={cn('w-3.5 h-3.5', isCancelled ? 'text-gray-300' : 'text-[#7A8A94]')} />
                                                                            {booking.metaPrimary}
                                                                        </span>
                                                                    )}
                                                                    {booking.time && (
                                                                        <span className="flex items-center gap-1.5">
                                                                            <Clock strokeWidth={1.5} className={cn('w-3.5 h-3.5', isCancelled ? 'text-gray-300' : 'text-[#7A8A94]')} />
                                                                            {booking.time}
                                                                        </span>
                                                                    )}
                                                                    {booking.metaSecondary && !booking.time && (
                                                                        <span className="flex items-center gap-1.5">
                                                                            <Calendar strokeWidth={1.5} className={cn('w-3.5 h-3.5', isCancelled ? 'text-gray-300' : 'text-[#7A8A94]')} />
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
                                                            <button className="p-1.5 rounded-none border border-black/10 bg-white text-gray-500 hover:text-[#C5A059] hover:border-[#C5A059] transition-colors">
                                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                            </button>
                                                            <button className="p-1.5 rounded-none border border-black/10 bg-white text-gray-500 hover:text-black hover:border-black transition-colors">
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
                seedMessage="Booking manifest loaded. Ask me anything about this trip's bookings."
                getAIReply={(text) => `Analyzing: "${text}". Checking booking conflicts and availability across all families.`}
            />
        </div>
    );
}
