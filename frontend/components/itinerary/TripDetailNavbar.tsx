'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTripById } from '@/lib/trips';

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
    { key: 'optimization', label: 'Optimization', suffix: '' },
    { key: 'groups', label: 'Groups', suffix: '/groups' },
    { key: 'bookings', label: 'Bookings', suffix: '/bookings' },
    { key: 'intelligence', label: 'Intelligence', suffix: '/intelligence' },
] as const;

// ─── Component ─────────────────────────────────────────────────────────────────
export default function TripDetailNavbar({ tripId }: { tripId: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const trip = getTripById(tripId);
    const basePath = `/agent-dashboard/itinerary-management/${tripId}`;

    // Determine active tab from URL
    const activeTab = pathname.endsWith('/intelligence')
        ? 'intelligence'
        : pathname.endsWith('/bookings')
            ? 'bookings'
            : pathname.endsWith('/groups')
                ? 'groups'
                : 'optimization';

    if (!trip) return null;

    return (
        <div className="flex items-center px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm z-40 shrink-0">
            {/* Left: back + trip title */}
            <div className="flex items-center gap-4 w-1/4 min-w-0">
                <button
                    onClick={() => router.push('/agent-dashboard/itinerary-management')}
                    className="neu-button w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                    <h2 className="font-[Outfit] font-bold text-lg text-foreground leading-tight truncate">{trip.title}</h2>
                    <p className="text-xs text-muted-foreground truncate">Client: {trip.client} · {trip.dateRange}</p>
                </div>
            </div>

            {/* Centre: pill-bar (inteli.html nav-pill design) */}
            <div className="flex-1 flex justify-center">
                <nav className="flex items-center bg-white p-1 rounded-full border border-gray-100 shadow-sm gap-0.5">
                    {TABS.map(({ key, label, suffix }) => (
                        <Link
                            key={key}
                            href={`${basePath}${suffix}`}
                            className={cn(
                                'px-4 py-1.5 rounded-full text-xs font-medium transition-colors border',
                                activeTab === key
                                    ? 'bg-black text-white border-black'
                                    : 'text-gray-500 border-transparent hover:text-black hover:border-gray-200',
                            )}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Right spacer */}
            <div className="w-1/4" />
        </div>
    );
}
