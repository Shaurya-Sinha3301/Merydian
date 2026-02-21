'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, TrendingUp, GripVertical, Check, X, Minimize2, Download, Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTripById } from '@/lib/trips';
import VoyageurAIPanel from './VoyageurAIPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

type LaneCard = {
    id: string;
    evtId: string;
    category: string;
    categoryBorder: string;
    categoryBg: string;
    categoryText: string;
    locationCode: string;
    durationLabel: string;
    durationColor: string;
    title: string;
    subtitle?: string;
    description: string;
    participants: { code: string; color: string }[];
    statusLabel: string;
    statusIcon: 'confirmed' | 'limited' | 'info';
    imageUrl: string;
};

type TimeRow = {
    time: string;
    period: 'AM' | 'PM' | 'UTC+1';
    splitIcon?: 'split' | 'merge';
    cards: LaneCard[];
};

type Day = {
    date: string;
    label: string;
    timeRange: string;
    rows: TimeRow[];
};

// ─── Static data — 3-day Paris itinerary ─────────────────────────────────────

const DAYS: Day[] = [
    {
        date: 'OCT 12',
        label: 'Day 1: Paris Sightseeing',
        timeRange: '08:00 – 17:00',
        rows: [
            {
                time: '08:00', period: 'UTC+1',
                cards: [{
                    id: 'd1-breakfast', evtId: 'EVT-892', category: 'Dining',
                    categoryBorder: 'border-orange-200', categoryBg: 'bg-orange-50', categoryText: 'text-orange-700',
                    locationCode: 'PARIS_06', durationLabel: '1H 00M', durationColor: 'text-slate-500',
                    title: 'Breakfast at Café de Flore',
                    description: 'Sequence: Croissants, Coffee. Full group synchronization required.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: 'Confirmed', statusIcon: 'confirmed',
                    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&q=80',
                }],
            },
            {
                // 2-way branch: FAM A+B → Louvre, FAM C → Eiffel
                time: '10:00', period: 'UTC+1',
                cards: [
                    {
                        id: 'd1-louvre', evtId: 'ACT-401', category: 'Activity',
                        categoryBorder: 'border-blue-200', categoryBg: 'bg-blue-50', categoryText: 'text-blue-700',
                        locationCode: 'PARIS_01', durationLabel: '3H 00M', durationColor: 'text-blue-600',
                        title: 'Louvre Museum', subtitle: 'Richelieu Wing',
                        description: 'Guided Mona Lisa wing tour. Wheelchair accessible route.',
                        participants: [{ code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }],
                        statusLabel: 'Confirmed', statusIcon: 'confirmed',
                        imageUrl: 'https://images.unsplash.com/photo-1499856374916-4f4b4e26cdb4?w=200&q=80',
                    },
                    {
                        id: 'd1-eiffel', evtId: 'ACT-404', category: 'Activity',
                        categoryBorder: 'border-purple-200', categoryBg: 'bg-purple-50', categoryText: 'text-purple-700',
                        locationCode: 'PARIS_07', durationLabel: '2H 30M', durationColor: 'text-purple-600',
                        title: 'Eiffel Tower Summit', subtitle: 'Top Deck',
                        description: 'Summit access via priority elevator. Photographers pass included.',
                        participants: [{ code: 'FAM C', color: '' }],
                        statusLabel: 'Limited', statusIcon: 'limited',
                        imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=200&q=80',
                    },
                ],
            },
            {
                time: '13:00', period: 'UTC+1',
                cards: [{
                    id: 'd1-lunch', evtId: 'EVT-894', category: 'Dining',
                    categoryBorder: 'border-orange-200', categoryBg: 'bg-orange-50', categoryText: 'text-orange-700',
                    locationCode: 'PARIS_01', durationLabel: '1H 30M', durationColor: 'text-slate-500',
                    title: 'Lunch at Le Nemours',
                    description: 'Casual seating. Croque monsieur. Terrace reserved for full party.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: '~$60 / PAX', statusIcon: 'info',
                    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80',
                }],
            },
            {
                // 3-way branch: afternoon split across all three families
                time: '15:00', period: 'UTC+1',
                cards: [
                    {
                        id: 'd1-musee', evtId: 'ACT-410', category: 'Activity',
                        categoryBorder: 'border-blue-200', categoryBg: 'bg-blue-50', categoryText: 'text-blue-700',
                        locationCode: 'PARIS_08', durationLabel: '2H 00M', durationColor: 'text-blue-600',
                        title: 'Musée d\'Orsay', subtitle: 'Impressionist Collection',
                        description: 'Renoir, Monet & Van Gogh highlights. Skip-the-line entry.',
                        participants: [{ code: 'FAM A', color: '' }],
                        statusLabel: 'Confirmed', statusIcon: 'confirmed',
                        imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200&q=80',
                    },
                    {
                        id: 'd1-seine', evtId: 'ACT-411', category: 'Activity',
                        categoryBorder: 'border-teal-200', categoryBg: 'bg-teal-50', categoryText: 'text-teal-700',
                        locationCode: 'PARIS_04', durationLabel: '1H 30M', durationColor: 'text-teal-600',
                        title: 'Seine River Cruise', subtitle: 'Pont de l\'Alma Pier',
                        description: 'Panoramic river cruise. Audio guide in 12 languages. All ages.',
                        participants: [{ code: 'FAM B', color: '' }],
                        statusLabel: 'Confirmed', statusIcon: 'confirmed',
                        imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&q=80',
                    },
                    {
                        id: 'd1-shopping', evtId: 'ACT-412', category: 'Activity',
                        categoryBorder: 'border-pink-200', categoryBg: 'bg-pink-50', categoryText: 'text-pink-700',
                        locationCode: 'PARIS_09', durationLabel: '2H 00M', durationColor: 'text-pink-600',
                        title: 'Le Marais Shopping', subtitle: 'Rue des Francs-Bourgeois',
                        description: 'Boutique shopping + gallery browsing. Free roam with meeting point.',
                        participants: [{ code: 'FAM C', color: '' }],
                        statusLabel: 'Confirmed', statusIcon: 'confirmed',
                        imageUrl: 'https://images.unsplash.com/photo-1555529160-d1af5eddccd0?w=200&q=80',
                    },
                ],
            },
            {
                time: '17:30', period: 'UTC+1',
                cards: [{
                    id: 'd1-dinner', evtId: 'EVT-900', category: 'Dining',
                    categoryBorder: 'border-orange-200', categoryBg: 'bg-orange-50', categoryText: 'text-orange-700',
                    locationCode: 'PARIS_06', durationLabel: '2H 00M', durationColor: 'text-slate-500',
                    title: 'Dinner at Brasserie Lipp',
                    description: 'Full group reunion dinner. Prix-fixe menu. Wine pairings included.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: 'Confirmed', statusIcon: 'confirmed',
                    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80',
                }],
            },
        ],
    },
    {
        date: 'OCT 13',
        label: 'Day 2: Versailles & Montmartre',
        timeRange: '09:00 – 21:00',
        rows: [
            {
                time: '09:00', period: 'UTC+1',
                cards: [{
                    id: 'd2-train', evtId: 'TRN-201', category: 'Transit',
                    categoryBorder: 'border-slate-300', categoryBg: 'bg-slate-50', categoryText: 'text-slate-600',
                    locationCode: 'GARE_STL', durationLabel: '0H 45M', durationColor: 'text-slate-500',
                    title: 'RER C to Versailles',
                    description: 'Depart Gare Saint-Lazare. Reserved carriages for group. Validate tickets.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: 'Confirmed', statusIcon: 'confirmed',
                    imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=200&q=80',
                }],
            },
            {
                // 2-way branch at Versailles: Palace vs Gardens
                time: '10:00', period: 'UTC+1',
                cards: [
                    {
                        id: 'd2-palace', evtId: 'ACT-501', category: 'Activity',
                        categoryBorder: 'border-amber-200', categoryBg: 'bg-amber-50', categoryText: 'text-amber-700',
                        locationCode: 'VER_PAL', durationLabel: '3H 00M', durationColor: 'text-amber-600',
                        title: 'Palace of Versailles', subtitle: 'Hall of Mirrors Tour',
                        description: 'Guided interior tour. State apartments + Hall of Mirrors. Audio included.',
                        participants: [{ code: 'FAM A', color: '' }, { code: 'FAM C', color: '' }],
                        statusLabel: 'Confirmed', statusIcon: 'confirmed',
                        imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=200&q=80',
                    },
                    {
                        id: 'd2-gardens', evtId: 'ACT-502', category: 'Activity',
                        categoryBorder: 'border-green-200', categoryBg: 'bg-green-50', categoryText: 'text-green-700',
                        locationCode: 'VER_GDN', durationLabel: '3H 00M', durationColor: 'text-green-600',
                        title: 'Versailles Gardens', subtitle: 'Grand Canal & Fountains',
                        description: 'Self-guided garden exploration. Fountain show at 11:00. Bicycle rental.',
                        participants: [{ code: 'FAM B', color: '' }],
                        statusLabel: 'Confirmed', statusIcon: 'confirmed',
                        imageUrl: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=200&q=80',
                    },
                ],
            },
            {
                time: '13:30', period: 'UTC+1',
                cards: [{
                    id: 'd2-picnic', evtId: 'EVT-910', category: 'Dining',
                    categoryBorder: 'border-orange-200', categoryBg: 'bg-orange-50', categoryText: 'text-orange-700',
                    locationCode: 'VER_GDN', durationLabel: '1H 00M', durationColor: 'text-slate-500',
                    title: 'Garden Picnic Lunch',
                    description: 'Catered picnic baskets. Cheese, charcuterie, baguettes. Grand Canal setting.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: '~$45 / PAX', statusIcon: 'info',
                    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80',
                }],
            },
            {
                time: '15:30', period: 'UTC+1',
                cards: [{
                    id: 'd2-return', evtId: 'TRN-202', category: 'Transit',
                    categoryBorder: 'border-slate-300', categoryBg: 'bg-slate-50', categoryText: 'text-slate-600',
                    locationCode: 'GARE_STL', durationLabel: '0H 45M', durationColor: 'text-slate-500',
                    title: 'Return to Paris',
                    description: 'RER C from Versailles-Château. Drop-off at Gare Saint-Lazare.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: 'Confirmed', statusIcon: 'confirmed',
                    imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=200&q=80',
                }],
            },
            {
                // 3-way branch: Montmartre evening split
                time: '17:00', period: 'UTC+1',
                cards: [
                    {
                        id: 'd2-sacre', evtId: 'ACT-510', category: 'Activity',
                        categoryBorder: 'border-blue-200', categoryBg: 'bg-blue-50', categoryText: 'text-blue-700',
                        locationCode: 'PARIS_18', durationLabel: '1H 30M', durationColor: 'text-blue-600',
                        title: 'Sacré-Cœur Basilica', subtitle: 'Sunset Mass',
                        description: 'Evening visit. Panoramic hilltop views of all Paris. Sunset service.',
                        participants: [{ code: 'FAM A', color: '' }],
                        statusLabel: 'Confirmed', statusIcon: 'confirmed',
                        imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200&q=80',
                    },
                    {
                        id: 'd2-art', evtId: 'ACT-511', category: 'Activity',
                        categoryBorder: 'border-pink-200', categoryBg: 'bg-pink-50', categoryText: 'text-pink-700',
                        locationCode: 'PARIS_18', durationLabel: '1H 30M', durationColor: 'text-pink-600',
                        title: 'Montmartre Art Walk', subtitle: 'Place du Tertre',
                        description: 'Live artists at the terrace. Portrait sessions available. Cobblestone stroll.',
                        participants: [{ code: 'FAM B', color: '' }],
                        statusLabel: 'Confirmed', statusIcon: 'confirmed',
                        imageUrl: 'https://images.unsplash.com/photo-1555529160-d1af5eddccd0?w=200&q=80',
                    },
                    {
                        id: 'd2-cabaret', evtId: 'EVT-512', category: 'Activity',
                        categoryBorder: 'border-red-200', categoryBg: 'bg-red-50', categoryText: 'text-red-700',
                        locationCode: 'PARIS_18', durationLabel: '2H 00M', durationColor: 'text-red-600',
                        title: 'Moulin Rouge Preview', subtitle: 'Evening Show',
                        description: 'Early seated show preview. Champagne included. Smart dress required.',
                        participants: [{ code: 'FAM C', color: '' }],
                        statusLabel: 'Limited', statusIcon: 'limited',
                        imageUrl: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=200&q=80',
                    },
                ],
            },
            {
                time: '19:30', period: 'UTC+1',
                cards: [{
                    id: 'd2-dinner', evtId: 'EVT-920', category: 'Dining',
                    categoryBorder: 'border-orange-200', categoryBg: 'bg-orange-50', categoryText: 'text-orange-700',
                    locationCode: 'PARIS_18', durationLabel: '1H 30M', durationColor: 'text-slate-500',
                    title: 'Dinner at Le Relais de la Butte',
                    description: 'Intimate neighbourhood bistro. Onion soup, duck confit. Rooftop terrace.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: 'Confirmed', statusIcon: 'confirmed',
                    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80',
                }],
            },
        ],
    },
    {
        date: 'OCT 14',
        label: 'Day 3: Food & Departure',
        timeRange: '08:30 – 16:00',
        rows: [
            {
                time: '08:30', period: 'UTC+1',
                cards: [{
                    id: 'd3-market', evtId: 'ACT-601', category: 'Activity',
                    categoryBorder: 'border-green-200', categoryBg: 'bg-green-50', categoryText: 'text-green-700',
                    locationCode: 'PARIS_05', durationLabel: '1H 30M', durationColor: 'text-green-600',
                    title: 'Marché d\'Aligre', subtitle: 'Flea & Food Market',
                    description: 'Bustling morning market. Fresh produce, cheese, vintage finds. Chef-guided.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: 'Confirmed', statusIcon: 'confirmed',
                    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=200&q=80',
                }],
            },
            {
                // 2-way branch: cooking class vs patisserie workshop
                time: '10:30', period: 'UTC+1',
                cards: [
                    {
                        id: 'd3-cooking', evtId: 'ACT-610', category: 'Activity',
                        categoryBorder: 'border-amber-200', categoryBg: 'bg-amber-50', categoryText: 'text-amber-700',
                        locationCode: 'PARIS_11', durationLabel: '2H 30M', durationColor: 'text-amber-600',
                        title: 'French Cooking Class', subtitle: 'Le Cordon Bleu Pop-up',
                        description: 'Hands-on class: coq au vin + soufflé. Chef instructor. Aprons provided.',
                        participants: [{ code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }],
                        statusLabel: 'Confirmed', statusIcon: 'confirmed',
                        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&q=80',
                    },
                    {
                        id: 'd3-pastry', evtId: 'ACT-611', category: 'Activity',
                        categoryBorder: 'border-pink-200', categoryBg: 'bg-pink-50', categoryText: 'text-pink-700',
                        locationCode: 'PARIS_02', durationLabel: '2H 30M', durationColor: 'text-pink-600',
                        title: 'Pâtisserie Workshop', subtitle: 'Ladurée Atelier',
                        description: 'Macaron & éclair workshop. Take-home box included. Kid-friendly session.',
                        participants: [{ code: 'FAM C', color: '' }],
                        statusLabel: 'Limited', statusIcon: 'limited',
                        imageUrl: 'https://images.unsplash.com/photo-1558326567-98ae2405596b?w=200&q=80',
                    },
                ],
            },
            {
                time: '13:00', period: 'UTC+1',
                cards: [{
                    id: 'd3-farewell', evtId: 'EVT-940', category: 'Dining',
                    categoryBorder: 'border-orange-200', categoryBg: 'bg-orange-50', categoryText: 'text-orange-700',
                    locationCode: 'PARIS_08', durationLabel: '2H 00M', durationColor: 'text-slate-500',
                    title: 'Farewell Lunch – Jules Verne',
                    description: 'Eiffel Tower second floor. Tasting menu. Champagne toast. Full group.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: '~$180 / PAX', statusIcon: 'info',
                    imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=200&q=80',
                }],
            },
            {
                time: '15:30', period: 'UTC+1',
                cards: [{
                    id: 'd3-transfer', evtId: 'TRN-301', category: 'Transit',
                    categoryBorder: 'border-slate-300', categoryBg: 'bg-slate-50', categoryText: 'text-slate-600',
                    locationCode: 'CDG_T2', durationLabel: '1H 00M', durationColor: 'text-slate-500',
                    title: 'Transfer to CDG Airport',
                    description: 'Private coach. All luggage pre-loaded from hotel. 2h30m buffer to departure.',
                    participants: [
                        { code: 'FAM A', color: '' }, { code: 'FAM B', color: '' }, { code: 'FAM C', color: '' },
                    ],
                    statusLabel: 'Confirmed', statusIcon: 'confirmed',
                    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=200&q=80',
                }],
            },
        ],
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Category tag — monochrome black outline, no colour */
function CategoryTag({ category }: { category: string }) {
    return (
        <span className="inline-flex items-center px-1.5 py-px font-bold uppercase tracking-wider text-[0.6rem] leading-none border border-gray-900 text-gray-900 bg-white">
            {category}
        </span>
    );
}

/** Family tag — colour-coded per family for at-a-glance branching */
const FAM_COLORS: Record<string, string> = {
    'FAM A': 'bg-blue-50 text-blue-700 border-blue-400',
    'FAM B': 'bg-amber-50 text-amber-700 border-amber-400',
    'FAM C': 'bg-rose-50 text-rose-700 border-rose-400',
};

function FamTag({ code }: { code: string }) {
    const color = FAM_COLORS[code] ?? 'bg-slate-50 text-slate-600 border-slate-300';
    return (
        <span className={cn(
            'inline-flex items-center px-1.5 py-0.5 font-bold uppercase tracking-wide text-[0.65rem] leading-none border',
            color,
        )}>
            {code}
        </span>
    );
}

/** Status indicator (confirmed / limited / info) */
function StatusBadge({ icon, label }: { icon: 'confirmed' | 'limited' | 'info'; label: string }) {
    const base = 'flex items-center gap-1 font-bold text-[0.65rem] uppercase tracking-wide leading-none';
    if (icon === 'confirmed') return (
        <span className={cn(base, 'text-emerald-600')}>
            <Check className="w-3 h-3" />
            {label}
        </span>
    );
    if (icon === 'limited') return (
        <span className={cn(base, 'text-amber-600')}>{label}</span>
    );
    return (
        <span className={cn(base, 'text-slate-500 font-mono')}>{label}</span>
    );
}

function ActivityCard({ card, compact }: { card: LaneCard; compact?: boolean }) {
    return (
        <div className={cn(
            'group/card flex gap-3 items-center',
            'bg-white border border-slate-200 transition-all duration-200',
            'hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]',
            'h-24 p-3',
            compact ? 'w-[480px] shrink-0' : 'flex-1 min-w-0',
        )}>
            {/* Image */}
            <div className="w-24 h-full flex-shrink-0 relative border border-slate-200 overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-full object-cover grayscale group-hover/card:grayscale-0 transition-all duration-300"
                />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center h-full gap-1 min-w-0">
                {/* Top row: title + tag + evt id + drag */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-tight leading-none truncate">
                            {card.title}
                        </h4>
                        <CategoryTag category={card.category} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-mono text-[9px] text-gray-400">{card.evtId}</span>
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-grab" />
                    </div>
                </div>

                {/* Subtitle */}
                {card.subtitle && (
                    <div className="text-[10px] text-gray-500 font-medium truncate">{card.subtitle}</div>
                )}

                {/* Description */}
                <div className="text-[10px] text-gray-400 truncate leading-snug">{card.description}</div>

                {/* Bottom row: status + duration | ALLOC: tags */}
                <div className="flex justify-between items-center mt-auto pt-1.5 border-t border-gray-100/70">
                    <div className="flex items-center gap-3">
                        <StatusBadge icon={card.statusIcon} label={card.statusLabel} />
                        <span className="text-[9px] font-mono text-gray-400 border-l border-gray-200 pl-3">
                            {card.durationLabel}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-gray-400">ALLOC:</span>
                        <div className="flex gap-1">
                            {card.participants.map((p) => (
                                <FamTag key={p.code} code={p.code} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ItineraryDetailViewProps {
    tripId: string;
}

export default function ItineraryDetailView({ tripId }: ItineraryDetailViewProps) {
    const trip = getTripById(tripId);
    const [aiOpen, setAiOpen] = useState(false);
    const [profitOpen, setProfitOpen] = useState(false);
    const [panelHovered, setPanelHovered] = useState(false);

    if (!trip) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <p className="font-bold text-xl text-[var(--bp-text)]">Trip not found</p>
                <p className="text-sm text-[var(--bp-muted)]">No trip with ID &quot;{tripId}&quot; exists.</p>
                <Link
                    href="/agent-dashboard/itinerary-management"
                    className="bp-card px-5 py-2 text-sm font-semibold flex items-center gap-2 no-underline text-[var(--bp-text)] hover:border-black transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Itineraries
                </Link>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative h-full bp-grid-bg bg-white">

            {/* ── Timeline ──────────────────────────────────────────────────────── */}
            <div className={cn(
                'flex-1 scrollbar-hide pb-28 bg-transparent',
                panelHovered ? 'overflow-hidden' : 'overflow-auto',
            )}>
                {/* All 3 days rendered sequentially — continuous scroll */}
                {DAYS.map((day) => (
                    <div key={day.date}>
                        {/* Per-day sticky header */}
                        <div className="sticky top-0 z-30 border-b border-gray-200 bg-gray-50 w-full">
                            <div className="px-6 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-4 font-semibold">
                                    <span className="text-[10px] uppercase tracking-widest font-mono text-gray-500">
                                        {day.date}
                                    </span>
                                    <span className="text-black text-xl font-bold normal-case tracking-normal">{day.label}</span>
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500">
                                    {day.rows.length} SLOTS · {day.timeRange}
                                </div>
                            </div>
                        </div>

                        {/* Timeline rows for this day */}
                        <div className="relative px-6 py-6">
                            {/* Dashed vertical connector line */}
                            <div className="absolute left-[4.5rem] top-6 bottom-6 border-l border-dashed border-gray-300 pointer-events-none" />

                            <div className="space-y-4">
                                {day.rows.map((row: TimeRow) => {
                                    const count = row.cards.length;
                                    const isMulti = count > 1;
                                    return (
                                        <div
                                            key={row.time}
                                            className={cn(
                                                'grid gap-8 relative group/row',
                                                isMulti ? 'items-start' : 'items-center',
                                            )}
                                            style={{ gridTemplateColumns: '80px 1fr' }}
                                        >
                                            {/* Time column */}
                                            <div className="text-right relative z-10">
                                                <div className="font-bold text-gray-900 text-sm leading-none">{row.time}</div>
                                                <div className="text-[9px] text-gray-400 font-mono mt-0.5">{row.period}</div>
                                                <div className="absolute right-[-2.25rem] top-1.5 w-1.5 h-1.5 bg-white border border-gray-400 rounded-full group-hover/row:border-black transition-all" />
                                            </div>

                                            {/* Cards — 1, 2 or 3 col grid depending on branch count */}
                                            {isMulti ? (
                                                <div className={cn(
                                                    'grid gap-4',
                                                    count === 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2',
                                                )}>
                                                    {row.cards.map((card: LaneCard) => (
                                                        <ActivityCard key={card.id} card={card} compact={false} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <ActivityCard card={row.cards[0]} compact={false} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Day separator */}
                        <div className="mx-6 border-t-2 border-dashed border-gray-200 mb-2" />
                    </div>
                ))}
            </div>

            {/* ── Floating panels ─────────────────────────────────────────────── */}
            <div
                className="fixed bottom-6 right-6 z-[60] flex items-end gap-3"
                onMouseEnter={() => setPanelHovered(true)}
                onMouseLeave={() => setPanelHovered(false)}
            >
                {/* Profit pill (collapsed) */}
                {!profitOpen && (
                    <button
                        onClick={() => setProfitOpen(true)}
                        className="relative w-10 h-10 rounded-full bg-[#faf9f6] border border-stone-300 shadow-md flex items-center justify-center hover:border-emerald-400 transition-colors group"
                        title="Open Profit Impact"
                    >
                        <TrendingUp className="w-4 h-4 text-stone-600 group-hover:text-emerald-600 transition-colors" />
                        <div className="absolute -top-1.5 -left-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[8px] font-bold px-1 py-px rounded shadow-sm font-mono">
                            +2.4%
                        </div>
                    </button>
                )}

                {/* Profit panel (expanded) */}
                {profitOpen && (
                    <div className="w-[300px] bg-[#faf9f6] border border-stone-300 shadow-2xl rounded-xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white shrink-0">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold uppercase tracking-widest text-stone-800">Profit Impact</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full font-mono">+2.4%</span>
                            </div>
                            <button onClick={() => setProfitOpen(false)} className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors">
                                <Minimize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm">
                                <div className="grid grid-cols-3 divide-x divide-stone-100 mb-3">
                                    <div className="pr-3 flex flex-col">
                                        <span className="text-[8px] uppercase font-bold text-stone-400 font-mono tracking-wider">Revenue</span>
                                        <span className="text-sm font-bold text-stone-800 font-mono">$12,450</span>
                                    </div>
                                    <div className="px-3 flex flex-col">
                                        <span className="text-[8px] uppercase font-bold text-stone-400 font-mono tracking-wider">Cost</span>
                                        <span className="text-sm font-bold text-stone-600 font-mono">$9,820</span>
                                    </div>
                                    <div className="pl-3 flex flex-col">
                                        <span className="text-[8px] uppercase font-bold text-stone-400 font-mono tracking-wider">Margin</span>
                                        <span className="text-sm font-bold text-emerald-600 font-mono">21.1%</span>
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '21%' }} />
                                </div>
                            </div>
                            <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm space-y-1.5">
                                <div className="text-[8px] font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-100">AI Insights</div>
                                {[
                                    <><span className="font-bold text-stone-700">$320</span> saved via subgroup routing</>,
                                    <>Lunch relocation improved margin by <span className="font-bold text-stone-700">1.2%</span></>,
                                ].map((t, i) => (
                                    <div key={i} className="flex gap-1.5 items-start text-[10px] text-stone-600">
                                        <span className="text-emerald-500 mt-0.5 shrink-0">›</span>
                                        <span>{t}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="py-2 px-3 border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-600 flex items-center justify-center gap-1.5 rounded-lg transition-all uppercase tracking-wide">
                                    <Download className="w-3.5 h-3.5 text-stone-400" /> Export
                                </button>
                                <button className="py-2 px-3 border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-600 flex items-center justify-center gap-1.5 rounded-lg transition-all uppercase tracking-wide">
                                    <Share2 className="w-3.5 h-3.5 text-stone-400" /> Share
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Shared Voyageur AI Panel */}
            <VoyageurAIPanel
                open={aiOpen}
                onOpenChange={setAiOpen}
                insightTag="Optimization Complete"
                insightTagColor="bg-indigo-50 text-indigo-700 border-indigo-200"
                insightBody={
                    <ul className="space-y-2 mt-1">
                        {[
                            { dot: 'bg-indigo-400', text: 'Conflict resolved: FAM_A vs FAM_C overlap.' },
                            { dot: 'bg-indigo-400', text: 'Split-path generated: 2.5H duration.' },
                            { dot: 'bg-emerald-400', text: <><span className="font-semibold text-stone-800">Overhead reduction: 18%</span> verified.</> },
                            { dot: 'bg-emerald-400', text: <><span className="font-semibold text-stone-800">Margin impact: +2.4%</span> applied.</> },
                        ].map((item, i) => (
                            <li key={i} className="flex gap-2 items-start">
                                <span className={cn('w-1.5 h-1.5 rounded-full mt-1 shrink-0', item.dot)} />
                                <span>{item.text}</span>
                            </li>
                        ))}
                    </ul>
                }
                inputPlaceholder="Ask about this itinerary..."
                seedMessage="Optimization complete. Conflict resolved for FAM_A & FAM_C. Margin improved +2.4%. Ask me anything."
                getAIReply={(text) => `Analyzing: "${text}". Recommend reviewing Day 2 subgroup allocations. Run new optimization pass?`}
            />

            {/* ── Approve / Reject ─────────────────────────────────────────────── */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-0">
                <button className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 border-r-0 text-slate-700 font-semibold text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all uppercase tracking-wide font-mono">
                    <X className="w-3.5 h-3.5" />
                    Reject
                </button>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 border border-slate-900 text-white font-semibold text-xs hover:bg-slate-700 transition-all uppercase tracking-wide font-mono">
                    <Check className="w-3.5 h-3.5" />
                    Approve
                </button>
            </div>
        </div>
    );
}
