'use client';

import { useState, useMemo } from 'react';
import { Calendar, CreditCard, MoreHorizontal, Search, SlidersHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type TripStatus = 'APPROVED' | 'IN REVIEW' | 'DRAFT' | 'CANCELLED';

interface TripMember {
    name: string;
    avatarUrl: string;
}

interface Trip {
    id: string;
    title: string;
    client: string;
    status: TripStatus;
    dateRange: string;
    budget: string;
    members: TripMember[];
}

// ─── Static Data (mirrors Stitch design) ─────────────────────────────────────

const TRIPS: Trip[] = [
    {
        id: 'TR-8821',
        title: 'Paris Culinary Tour',
        client: 'Sarah Johnson',
        status: 'APPROVED',
        dateRange: 'OCT 12 – OCT 18, 2024',
        budget: '$4,250.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-6Q-m1Yo1xNKThTwAoqzJHkTjZ2n9DxeX1y5nHORtWJExhyngqZWrGMC9QzHM1popP6riZjuzprWGcMsKyatuQekZVTX6h5pqySZK5D04rI5xRwAuNFDZMxz_ylWQfOuGsBVQ9aV1liKt5Mln7PE6BUhW84bKBhBkC_id19_CpkqmTY6GOxETuIQyKKPRos_Hk3xthcHnAffFzLE-nxUiUSSkB6OzVA7KBYHDnFv2mVAybp3p4GbsmW5vB7YeFtP822R9jT6UGG-K' },
            { name: 'Client', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeWW6TNDao-VTWwcYqrdYyfvdR-xhgiQ3OHTgNWfAaCliKxda13XQOApFaApOtjFHGDRbDh7LBuhQf7GwSJOjFedkG91Ku6wcICiSrZ-WF3PteBJDSQMqZQWZnqbUCtO_gnhxWQqkjtIfIV1ZkfvQ9Qka-RB5SUUsimP48ldZhk89nJ3M2xuXu4oMl_d04WjJ1svccHB3vHC7KTiN3oS05qnCibBG6tAkcWzkcZo3MhkJsAUM2_7Scd6yaQERCINJp470KxpzDYfkg' },
        ],
    },
    {
        id: 'TR-9023',
        title: 'Tokyo Tech Summit',
        client: 'TechGlobal Corp',
        status: 'IN REVIEW',
        dateRange: 'NOV 05 – NOV 12, 2024',
        budget: '$12,800.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBr15CL18LcOloEVDOaNnMuszemDsJ1wXWlFmo9t63LLVm2Vg9_AJya-XTrd39XxZ_2p5ERWcbL-eek4n9gJqjXfmo5Lhxg8Cla6eeZ3uc4tE3MpvAI3DmAmbDagUJYD6079_xxCzjJOKkapiqdg_tpDirFTOCtEQHd-Mij_FWMoxpiNiBnV2d9VToFQkcyj0oJo7t6HztZQLyY2h2xTs3uvlpk-WdP9crCyYGHuSnQOqOXuRDqrceqrtb-E0RIedj2AsmWMFDrHOr' },
        ],
    },
    {
        id: 'TR-1102',
        title: 'Amalfi Coast Retreat',
        client: 'Elena Rossi',
        status: 'DRAFT',
        dateRange: 'JUN 15 – JUN 25, 2025',
        budget: '$8,500.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApatcBA28QVBYFOtlp_sjVklzWLUR8EYR08jcF1jK4lDgml93-ol14S45aIGUmBFeY_FfEVbMAABnktnSpz6HNpsMukYYGrx-EU2yjPrvENM_KWli79M6eR85DZEc83B9rde680HCwa54FNVzoA5aLRytz2YpkG3TrzJ6s4IIEnJPV8vpVD0GVzUH1WRpjGLeK6DUC-3Tdv0EOjbYaWGkmXHDZpDl3TfRxAYEUI23-KX9s7tYDtKWhRN2J91o2ooYmyVQm-6BPxBA5' },
            { name: 'Client', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeXa4igoZ9JWVPAaCTMfZtsCO27PFVwQQ1JDRQmtreKRZlT-3QHx1qlLkn3LPf_7ou-4AGIId-nznhJavthD_WMBJBTLCjqKWy_9uPb9Bos2GuaSEwHv9LYevlUUggk2yISDZScsfMz2cLx1JJYOGVcowQlfymXaFjN51FldhHFhJP-war93huoMLNiYNqwXj2Skogt5Pi6mARCtQPTfSnXS3HGSITqSFCuCAvWzEtuc8rqGC-B5-xbA3rsxeN5PFiBsIB9gYgOVJo' },
        ],
    },
    {
        id: 'TR-9941',
        title: 'Kyoto Cherry Blossom',
        client: 'James Morrison',
        status: 'IN REVIEW',
        dateRange: 'MAR 28 – APR 05, 2025',
        budget: '$6,200.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDR_3g7sOGo8ylyWEw4G6JJzY4aDKA7aK5ydkuphXNCKVTLdtquVHq0W6ufgbInUxKIwjROH9LOe5xqiQAF57raHH6KaO9ZTV4ZARDuDuBjRbEokSVxBB8pjQQDB3VxNZOKoSSGVKp87lCstm2-yr1z0OXJ5hz25iYdDkJT3Z8K1G8PFRn_xqApHFn_Qk1RFcYRAiFcwjyE8dR6cjk8ABOCGeMJ2Prd1bRgEsEdx2vxdqax_OoYpDu1jvG5a7rWGRKxMjHuDkg8jFla' },
        ],
    },
    {
        id: 'TR-7622',
        title: 'New York City Escape',
        client: 'The Smith Family',
        status: 'APPROVED',
        dateRange: 'DEC 20 – DEC 27, 2024',
        budget: '$15,400.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMcePAHdHONgBzDficd3XZ8YYiUMragZo5Lrpb3FWCCeCy6FgnHrDZECfzb8CNg9EvvSgKpDPmabKiu9f2ZRCdR24lKGzInZZBHyqni6XAbEw-OewEH6sjbBq_izURdPjHZuU46y7RQrtAssuu0bGtME7KxrJwjM9KOQu4xvJYAWRJnV7FWnsG22_eNHSOvF_XktZP3EoaVxNT2VatWDNLMbf8lKmYLJn7TNZnbzxqHQEVNjkjkHa6FzUQyYTJO0XzvF611OefCUTt' },
            { name: 'Client', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH9fJLuwY5h3GW5CoVUklAC9-wqcOalteakJNUC7oMv9ov0Hm_ic1XuEIlC8n6I5juKnzfb5qfevQbSYPxlcMFhqZrFdSHzpABgDPhUutMnapBP67fxXhmfqONaLlshoalsfNsmgeeyRs1yZtV9qEIFUtp6wE-4sFGP13vn0UqB5w8a6ox-8WMKd2PtZXmnZq_jR8bdU0qxZY12bNTzkYx9CI0Ix6xRcz2Tyf-sUyLVWf0rvJSuq_dIGjavVb9f7kIcvDHnPtilCzc' },
        ],
    },
    {
        id: 'TR-5510',
        title: 'Bali Digital Nomad',
        client: 'Mark Davidson',
        status: 'CANCELLED',
        dateRange: 'JAN 10 – FEB 10, 2025',
        budget: '$3,200.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQtBOSVwxgyRxBnAXZwJt8Q0-mDDUu_16Br1LpYbmLNDCws59MhNVsPD4Kl-TsrTtCYCXHM1rr6dSGEqBiRNd1qqYk74_4p5Gysk_tLyflALUJkYquQzvdCrQAwL8ISNe3iZ2HWRGJjMWX4zxMB5cxkQLdQXt5vtJ2Uvs6xPOUGP4odMLPQjXPDFB5VuS_4wLXncgFMPPgV2bF3ZVgbe0Jws5zLIK5e8nfrCKLLM1kgtbhCjamTvJJcC4K_OR4uWcB0yTIpOClqCod' },
        ],
    },
];

// ─── Status badge config ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<TripStatus, { pill: string }> = {
    'APPROVED': { pill: 'bg-green-100 text-green-700' },
    'IN REVIEW': { pill: 'bg-orange-100 text-orange-700' },
    'DRAFT': { pill: 'bg-gray-200 text-gray-600' },
    'CANCELLED': { pill: 'bg-red-100 text-red-700' },
};

// ─── TripCard ────────────────────────────────────────────────────────────────

function TripCard({ trip }: { trip: Trip }) {
    const { pill } = STATUS_STYLES[trip.status];
    const isCancelled = trip.status === 'CANCELLED';

    return (
        <article
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
                        <TripCard key={trip.id} trip={trip} />
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
