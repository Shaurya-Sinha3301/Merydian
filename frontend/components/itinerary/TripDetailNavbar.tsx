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
        /* Matches ItineraryOptimizerWindow header container */
        <div className="shrink-0 w-full z-40 bg-white/95 backdrop-blur-sm border-b border-[var(--bp-border)]">
            <div className="px-6 md:px-8 pt-4 pb-4 flex items-center gap-6">

                {/* ── Left: back button + trip info ───────────────────────── */}
                <div className="flex items-center gap-4 min-w-0 w-1/4">
                    {/* Sharp square back button — Optimizer style */}
                    <button
                        onClick={() => router.push('/agent-dashboard/itinerary-management')}
                        className="w-9 h-9 flex items-center justify-center border border-[var(--bp-border)] hover:border-black bg-white text-[var(--bp-muted)] hover:text-black transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="min-w-0">
                        {/* Large light title — same weight/tracking as Optimizer h1 */}
                        <h2 className="text-2xl md:text-3xl font-[300] tracking-[-0.02em] text-black leading-tight truncate">
                            {trip.title}
                        </h2>
                        <p className="text-[var(--bp-muted)] mt-0.5 font-light text-xs tracking-wide truncate">
                            Client: {trip.client} · {trip.dateRange}
                        </p>
                    </div>
                </div>

                {/* ── Centre: pill-bar ─────────────────────────────────────── */}
                <div className="flex-1 flex justify-center">
                    {/* Rounded-lg segmented pill bar — group_new.html style */}
                    <nav className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 gap-1 mt-2">
                        {TABS.map(({ key, label, suffix }) => (
                            <Link
                                key={key}
                                href={`${basePath}${suffix}`}
                                className={cn(
                                    'px-5 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                                    activeTab === key
                                        ? 'bg-white border border-stone-200 text-stone-800 shadow-sm font-semibold'
                                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50',
                                )}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* ── Right spacer ─────────────────────────────────────────── */}
                <div className="w-1/4" />
            </div>
        </div>
    );
}
