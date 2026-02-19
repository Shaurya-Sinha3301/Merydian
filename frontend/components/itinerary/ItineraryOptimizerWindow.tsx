'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CreditCard, MoreHorizontal, Search, SlidersHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRIPS, Trip, TripStatus } from '@/lib/trips';

// ─── Status badge config ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<TripStatus, { pill: string }> = {
    'APPROVED': { pill: 'bg-green-100 text-green-700' },
    'IN REVIEW': { pill: 'bg-orange-100 text-orange-700' },
    'DRAFT': { pill: 'bg-gray-200 text-gray-600' },
    'CANCELLED': { pill: 'bg-red-100 text-red-700' },
};

// ─── TripCard ────────────────────────────────────────────────────────────────

function TripCard({ trip, onClick }: { trip: Trip; onClick?: () => void }) {
    const { pill } = STATUS_STYLES[trip.status];
    const isCancelled = trip.status === 'CANCELLED';

    return (
        <article
            onClick={!isCancelled ? onClick : undefined}
            className={cn(
                'neu-card rounded-[16px] p-6 flex flex-col h-full transition-transform duration-300',
                isCancelled ? 'opacity-70 grayscale-[0.5]' : 'hover:scale-[1.015] cursor-pointer neu-card-hover',
            )}
        >
            {/* Status row */}
            <div className="flex justify-between items-start mb-4">
                <span className={cn('px-3 py-1 rounded-full text-xs font-bold font-[Outfit] tracking-wide shadow-sm', pill)}>
                    {trip.status}
                </span>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Title */}
            <h3 className="font-[Outfit] font-bold text-xl text-foreground mb-1">{trip.title}</h3>
            <p className="text-muted-foreground text-sm mb-6">Client: {trip.client}</p>

            {/* Meta rows */}
            <div className="mt-auto space-y-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-[18px] h-[18px] shrink-0" />
                    <span className="font-[JetBrains_Mono,monospace] text-xs">{trip.dateRange}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                    <CreditCard className="w-[18px] h-[18px] shrink-0" />
                    <span className="font-[JetBrains_Mono,monospace] text-xs">{trip.budget}</span>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-gray-200/60 flex justify-between items-center">
                    <div className="flex -space-x-2">
                        {trip.members.map((m) => (
                            <img
                                key={m.name}
                                alt={m.name}
                                src={m.avatarUrl}
                                className="w-8 h-8 rounded-full border-2 border-[#E0E5EC] object-cover"
                            />
                        ))}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">ID: #{trip.id}</span>
                </div>
            </div>
        </article>
    );
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

const FILTER_TABS: { label: string; value: TripStatus | 'ALL' }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'In Review', value: 'IN REVIEW' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Cancelled', value: 'CANCELLED' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ItineraryOptimizerWindow() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<TripStatus | 'ALL'>('ALL');

    const filtered = useMemo(() => {
        return TRIPS.filter((t) => {
            const matchesSearch =
                t.title.toLowerCase().includes(search.toLowerCase()) ||
                t.client.toLowerCase().includes(search.toLowerCase()) ||
                t.id.toLowerCase().includes(search.toLowerCase());
            const matchesFilter = activeFilter === 'ALL' || t.status === activeFilter;
            return matchesSearch && matchesFilter;
        });
    }, [search, activeFilter]);

    return (
        <div className="max-w-7xl mx-auto">
            {/* ── Page Header ─────────────────────────────────────────────────────── */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <h1 className="font-[Outfit] text-3xl font-bold text-foreground">Itinerary Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage and optimize client trips efficiently</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Search */}
                    <div className="neu-pressed rounded-2xl flex items-center px-4 py-2.5 w-72">
                        <Search className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search trips, clients..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground w-full focus:ring-0 p-0"
                        />
                    </div>

                    {/* Filter btn */}
                    <button className="neu-button w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground">
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>

                    {/* Add btn */}
                    <button className="neu-button w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* ── Filter Tabs ─────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
                {FILTER_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveFilter(tab.value)}
                        className={cn(
                            'px-4 py-1.5 rounded-full text-sm font-medium font-[Outfit] transition-all',
                            activeFilter === tab.value
                                ? 'neu-pressed text-foreground font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-black/5',
                        )}
                    >
                        {tab.label}
                    </button>
                ))}

                <span className="ml-auto text-xs text-muted-foreground">
                    {filtered.length} of {TRIPS.length} trips
                </span>
            </div>

            {/* ── Trip Cards Grid ──────────────────────────────────────────────────── */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
                    {filtered.map((trip) => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            onClick={() => router.push(`/agent-dashboard/itinerary-management/${trip.id}`)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="neu-icon-circle w-16 h-16 mb-4">
                        <Search className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-[Outfit] font-semibold text-foreground mb-1">No trips found</p>
                    <p className="text-muted-foreground text-sm">Try adjusting your search or filter.</p>
                </div>
            )}
        </div>
    );
}
