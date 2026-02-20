'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Plus,
    Filter,
    Plane,
    Hotel,
    Bus,
    Utensils,
    Ticket,
    CreditCard,
    CheckCircle,
    AlertCircle,
    XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRIPS, Trip, TripStatus } from '@/lib/trips';

// ─── Status config ────────────────────────────────────────────────────────────

type StatusKey = TripStatus;

// User Requested: "Urgent", "Attention", "Clear" only.
const STATUS_CONFIG: Record<StatusKey, {
    dot: string;
    text: string;
    label: string;
}> = {
    'APPROVED': { dot: 'bg-[var(--bp-sage)]', text: 'text-[var(--bp-sage)]', label: 'Clear' },
    'IN REVIEW': { dot: 'bg-amber-500', text: 'text-amber-500', label: 'Attention' }, // Maps In Review -> Attention
    'DRAFT': { dot: 'bg-amber-500', text: 'text-amber-500', label: 'Attention' }, // Maps Draft -> Attention
    'CANCELLED': { dot: 'bg-[var(--bp-red)]', text: 'text-[var(--bp-red)]', label: 'Urgent' },
};

// ─── Booking tags per status ──────────────────────────────────────────────────

type TagStatus = 'confirmed' | 'pending' | 'cancelled';

interface BookingTag {
    icon: React.ReactNode;
    label: string;
    status: TagStatus;
}

function getBookingTags(tripStatus: TripStatus): BookingTag[] {
    const confirmed: TagStatus = 'confirmed';
    const pending: TagStatus = 'pending';
    const cancelled: TagStatus = 'cancelled';

    // White icons for all tags to match user request "only use white icons"
    const iconClass = "w-3 h-3 text-white";

    const all: BookingTag[] = [
        { icon: <Plane className={iconClass} />, label: 'Flight', status: confirmed },
        { icon: <Hotel className={iconClass} />, label: 'Hotel', status: confirmed },
        { icon: <Bus className={iconClass} />, label: 'Transfers', status: confirmed },
        { icon: <Utensils className={iconClass} />, label: 'Food', status: confirmed },
        { icon: <Ticket className={iconClass} />, label: 'Activities', status: confirmed },
        { icon: <CreditCard className={iconClass} />, label: 'Payments', status: confirmed },
    ];

    if (tripStatus === 'IN REVIEW') {
        all[2].status = cancelled; // Transfers issue
        all[4].status = pending;   // Activities pending
    }
    if (tripStatus === 'DRAFT') {
        all.forEach(t => { t.status = pending; });
    }
    if (tripStatus === 'CANCELLED') {
        all[0].status = pending;
        all[1].status = pending;
        all[2].status = pending;
        all[3].status = pending;
        all[4].status = pending;
        all[5].status = cancelled;
    }

    return all;
}

function getProgress(status: TripStatus): number {
    return { 'APPROVED': 75, 'IN REVIEW': 50, 'DRAFT': 15, 'CANCELLED': 0 }[status];
}

function getNextAction(status: TripStatus): { text: string; time: string } {
    return {
        'APPROVED': { text: 'Confirm final itinerary with client.', time: 'T-minus 4h' },
        'IN REVIEW': { text: 'Review transfer bookings for issues.', time: 'T-minus 1h' },
        'DRAFT': { text: 'Add remaining booking details.', time: 'In 2 days' },
        'CANCELLED': { text: 'Process refund for client.', time: 'Pending' },
    }[status];
}

// ─── Destination images (per trip id) ─────────────────────────────────────────

const TRIP_IMAGES: Record<string, { src: string; label: string }> = {
    'TR-8821': { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCu8eGSBVzJXmEegY5iF6l1W3oz1mdyJaIS9jH0sfeyDSnrgDhfjfHX8m-w0AAezRB_KdWzE_BBpowCrnVqTOW_CcxgHqhRs4PdivKB_IxjWNdp8Zd-mqy23AMSIMsJMrEQP5tAR7XgaTkEtIq2qyDh-2RNNz1677eduIfkMmmrTjoXMCeWTwRjI1ZQSihMC3Q1sKJzGplcir7cdNd9Q42cOeQECFMvsGuB7wx8hILUoSt7ZkOTEvM22K8SNvtm4sxQqaVI7HW6yuLC', label: 'Paris, France' },
    'TR-9023': { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVSnL-B39P2k9zyuFs2a0Zpge1DPgmC0NfMNIR_2FpOSEYXXUbS2f6qVkPilc-18CIYgFDyXNWWk9aXWaQ-7BLXuCR36ES8pkrGGGwcvcdGm1b0uw-HRPiSg7nq9z466SDXmAHCiayra__3CbPC02wN39Yl4RnXg39pDZ0DZtQ1fVqCNz81htXGfhzbz6rv7LSU-08RgcHGIksAlVIf17Ln_dUC0DZbahayexQED0jdKXBaYY63GYvU5S_3Fum8rW90dleZ_94vo5a', label: 'Tokyo, Japan' },
    'TR-1102': { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQwu8e00TDJf93eZ5vizbyQiEjccclu0JPaybGn_6-taYjBromJ4lcK64ROEGG6Z8dBehupqCdEinFSIpLYzf62jh0ynJFckVUVKW7nJ4Y3T3BWFnr6wdtK3zNadE3p-6CMkN7xE45z7f_nSRirK013ZsI5MZ_cBja5zs5btS7wyxezJKE2kvpeymjq2JxTdxgb_XGJROE_mK_T5eb6AV-24XW7_Oe-8MGQfxe9Rj30pKkg8K3aDVORjJNXpzBFmAvUs6J6XBbniOf', label: 'Amalfi, Italy' },
    'TR-9941': { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCu8eGSBVzJXmEegY5iF6l1W3oz1mdyJaIS9jH0sfeyDSnrgDhfjfHX8m-w0AAezRB_KdWzE_BBpowCrnVqTOW_CcxgHqhRs4PdivKB_IxjWNdp8Zd-mqy23AMSIMsJMrEQP5tAR7XgaTkEtIq2qyDh-2RNNz1677eduIfkMmmrTjoXMCeWTwRjI1ZQSihMC3Q1sKJzGplcir7cdNd9Q42cOeQECFMvsGuB7wx8hILUoSt7ZkOTEvM22K8SNvtm4sxQqaVI7HW6yuLC', label: 'Kyoto, Japan' },
    'TR-7622': { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVSnL-B39P2k9zyuFs2a0Zpge1DPgmC0NfMNIR_2FpOSEYXXUbS2f6qVkPilc-18CIYgFDyXNWWk9aXWaQ-7BLXuCR36ES8pkrGGGwcvcdGm1b0uw-HRPiSg7nq9z466SDXmAHCiayra__3CbPC02wN39Yl4RnXg39pDZ0DZtQ1fVqCNz81htXGfhzbz6rv7LSU-08RgcHGIksAlVIf17Ln_dUC0DZbahayexQED0jdKXBaYY63GYvU5S_3Fum8rW90dleZ_94vo5a', label: 'New York, USA' },
    'TR-5510': { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQwu8e00TDJf93eZ5vizbyQiEjccclu0JPaybGn_6-taYjBromJ4lcK64ROEGG6Z8dBehupqCdEinFSIpLYzf62jh0ynJFckVUVKW7nJ4Y3T3BWFnr6wdtK3zNadE3p-6CMkN7xE45z7f_nSRirK013ZsI5MZ_cBja5zs5btS7wyxezJKE2kvpeymjq2JxTdxgb_XGJROE_mK_T5eb6AV-24XW7_Oe-8MGQfxe9Rj30pKkg8K3aDVORjJNXpzBFmAvUs6J6XBbniOf', label: 'Bali, Indonesia' },
};

// ─── TripCard ─────────────────────────────────────────────────────────────────

function TripCard({ trip, onClick }: { trip: Trip; onClick?: () => void }) {
    const isCancelled = trip.status === 'CANCELLED';
    const { dot, text, label } = STATUS_CONFIG[trip.status];
    const tags = getBookingTags(trip.status);
    const pct = getProgress(trip.status);
    const action = getNextAction(trip.status);
    const img = TRIP_IMAGES[trip.id] ?? { src: '', label: trip.title };


    return (
        <article
            onClick={!isCancelled ? onClick : undefined}
            className={cn(
                'bp-card flex flex-col',
                isCancelled ? 'opacity-60' : 'cursor-pointer',
            )}
        >
            {/* ── Top metadata row ─── */}
            <div className="p-4 pb-0 flex justify-between items-start mb-3">
                <div>
                    <span className="bp-label">Reference</span>
                    <span className="text-sm font-semibold tracking-wide text-[var(--bp-text)]">{trip.id}</span>
                </div>
                <div className="text-right">
                    <span className="bp-label">Status</span>
                    <div className="flex items-center justify-end gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full', dot)} />
                        <span className={cn('text-[10px] font-black tracking-wider uppercase', text)}>{label}</span>
                    </div>
                </div>
            </div>

            {/* ── Hero image ─── */}
            <div className="w-full aspect-[4/3] relative overflow-hidden border-y border-[var(--bp-border)]">
                {img.src ? (
                    <img
                        src={img.src}
                        alt={img.label}
                        className="bp-img w-full h-full absolute inset-0"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-xs tracking-widest uppercase">{img.label}</span>
                    </div>
                )}
                <div className="absolute bottom-0 left-0 bg-white/90 backdrop-blur-sm px-3 py-1.5 border-t border-r border-[var(--bp-border)]">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--bp-text)]">{img.label}</span>
                </div>
            </div>

            {/* ── Body ─── */}
            <div className="p-4 flex flex-col gap-4 flex-1">
                {/* Trip details */}
                <div className="flex justify-between items-start gap-4 mb-1">
                    <h3 className="text-lg font-light text-[var(--bp-text)] leading-tight">{trip.title}</h3>
                    <span className="text-xs font-bold text-[var(--bp-text)] uppercase tracking-tight text-right shrink-0 pt-1">
                        {trip.dateRange}
                    </span>
                </div>

                {/* Booking tags */}
                <div>
                    <span className="bp-label mb-2">Booking Status</span>
                    <div className="grid grid-cols-2 gap-1.5">
                        {tags.map((tag) => (
                            <span
                                key={tag.label}
                                className={cn('bp-tag', `bp-tag-${tag.status}`)}
                            >
                                <span className="mr-1">{tag.icon}</span>
                                {tag.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Progress */}
                <div>
                    <span className="bp-label mb-1">Trip Completion</span>
                    <div className="relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-[var(--bp-sage)] rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="flex justify-end mt-1">
                        <span className="text-[10px] font-black text-[var(--bp-sage)] uppercase tracking-tight">
                            {pct}% Complete
                        </span>
                    </div>
                </div>

                {/* Next action footer */}
                <div className="border-t border-[var(--bp-border)] pt-3 mt-auto">
                    <div className="flex justify-between items-center">
                        <span className="bp-label mb-0">Next Action</span>
                        <span className="text-[9px] font-mono text-[var(--bp-muted)]">{action.time}</span>
                    </div>
                    <p className="text-xs font-medium mt-1 text-[var(--bp-text)]">{action.text}</p>
                </div>
            </div>
        </article>
    );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { label: string; value: TripStatus | 'ALL' }[] = [
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
    const [isFilterOpen, setIsFilterOpen] = useState(false);

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
        <div className="flex-1 overflow-y-auto bp-grid-bg bg-white">
            <div className="p-6 md:p-8 max-w-7xl mx-auto">

                {/* ── Page Header ────────────────────────────────────────────── */}
                <header className="flex flex-col md:flex-row md:items-end justify-between mb-2 gap-4">
                    <div>
                        {/* System status indicator */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 bg-[var(--bp-sage)] rounded-full animate-pulse" />
                            <span className="text-[9px] text-[var(--bp-muted)] font-semibold tracking-[0.2em] uppercase">System Operational</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-[300] tracking-[-0.02em] text-black leading-tight">
                            Active Itineraries
                        </h1>
                        <p className="text-[var(--bp-muted)] mt-1 font-light text-xs tracking-wide">
                            Global movement tracking &amp; sequencing
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 relative">
                        {/* Search — underline only */}
                        <div className="border-b border-gray-300 flex items-center py-1.5 w-full md:w-52 focus-within:border-black transition-colors">
                            <Search className="text-gray-400 w-3.5 h-3.5 mr-2 shrink-0" />
                            <input
                                type="text"
                                placeholder="SEARCH PNR / CLIENT..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-transparent border-none outline-none text-[10px] font-semibold w-full placeholder-gray-300 focus:ring-0 p-0 uppercase tracking-widest text-black"
                            />
                        </div>

                        {/* Filter Button */}
                        <div className="relative">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center border transition-colors shrink-0",
                                    isFilterOpen ? "bg-black text-white border-black" : "bg-white text-black border-[var(--bp-border)] hover:border-black"
                                )}
                            >
                                <Filter className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {isFilterOpen && (
                                <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-[var(--bp-border)] shadow-xl z-50 py-1">
                                    {FILTER_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setActiveFilter(opt.value);
                                                setIsFilterOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 flex items-center justify-between",
                                                activeFilter === opt.value ? "text-black bg-gray-50" : "text-[var(--bp-muted)]"
                                            )}
                                        >
                                            {opt.label}
                                            {activeFilter === opt.value && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add button — square black */}
                        <button className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-[var(--bp-sage)] transition-colors shrink-0">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* ── Trip Cards Grid ─────────────────────────────────────────── */}


                {filtered.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
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
                        <div className="w-16 h-16 border border-[var(--bp-border)] flex items-center justify-center mb-5">
                            <Search className="w-6 h-6 text-[var(--bp-muted)]" />
                        </div>
                        <p className="text-sm font-semibold text-black uppercase tracking-widest mb-1">No trips found</p>
                        <p className="text-[var(--bp-muted)] text-xs tracking-wide">Try adjusting your search or filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
