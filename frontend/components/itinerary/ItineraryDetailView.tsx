'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, TrendingUp, GripVertical, Check, X, Minimize2, Download, Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTripById, Trip } from '@/lib/trips';
import VoyageurAIPanel from './VoyageurAIPanel';
import { apiClient } from '@/services/api';

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
                    className="w-full h-full object-cover transition-all duration-300"
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

function transformItinerary(data: any): Day[] {
    if (!data || !data.days || !Array.isArray(data.days)) return DAYS; // Fallback to Paris

    return data.days.map((dayData: any, idx: number) => {
        // ── Extract POIs ─────────────────────────────────────────────────
        // Baseline format:   dayData.pois = [{ sequence, location_id, comment, planned_visit_time_min }]
        // Optimizer format:  dayData.families.{familyId}.pois = [{ sequence, location_id, location_name, arrival_time, departure_time, visit_duration_min, satisfaction_score }]
        let pois: any[] = dayData.pois || [];
        let familyIds: string[] = [];

        if ((!pois || pois.length === 0) && dayData.families && typeof dayData.families === 'object') {
            familyIds = Object.keys(dayData.families);
            // Pick the first family's POIs as the "shared" view
            if (familyIds.length > 0) {
                const firstFamily = dayData.families[familyIds[0]];
                pois = firstFamily?.pois || [];
            }
        }

        const isOptimizerFormat = pois.length > 0 && pois[0].arrival_time !== undefined;

        let currentTime = new Date();
        currentTime.setHours(9, 0, 0, 0);

        const rows: TimeRow[] = pois.map((poi: any, poiIdx: number) => {
            // Use real arrival_time from optimizer, or calculate from visit duration
            let timeStr: string;
            if (isOptimizerFormat && poi.arrival_time) {
                timeStr = poi.arrival_time;
            } else {
                timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            }

            const durationMins = poi.visit_duration_min || poi.planned_visit_time_min || 60;
            if (!isOptimizerFormat) {
                currentTime = new Date(currentTime.getTime() + durationMins * 60000 + 30 * 60000);
            }

            const durationHrs = Math.floor(durationMins / 60);
            const durationRemMins = durationMins % 60;
            const durationLabel = `${durationHrs}H ${durationRemMins.toString().padStart(2, '0')}M`;

            const title = poi.location_name || poi.comment || 'Activity';
            const locationCode = poi.location_id || '';
            const satisfaction = poi.satisfaction_score ? ` · Score: ${poi.satisfaction_score.toFixed(2)}` : '';
            const description = isOptimizerFormat
                ? `${poi.arrival_time} – ${poi.departure_time}${satisfaction}`
                : `Sequence ${poi.sequence}: Scheduled visit to ${poi.comment}.`;

            // Determine category based on location_id
            const isRestaurant = locationCode.includes('DINNER') || locationCode.includes('LUNCH');
            const category = isRestaurant ? 'Dining' : 'Activity';
            const catBorder = isRestaurant ? 'border-orange-200' : 'border-blue-200';
            const catBg = isRestaurant ? 'bg-orange-50' : 'bg-blue-50';
            const catText = isRestaurant ? 'text-orange-700' : 'text-blue-700';
            const durColor = isRestaurant ? 'text-orange-600' : 'text-blue-600';

            // Build participants from family IDs
            const participants = familyIds.length > 0
                ? familyIds.map((fid, i) => ({ code: `FAM ${String.fromCharCode(65 + i)}`, color: '' }))
                : [{ code: 'ALL', color: '' }];

            return {
                time: timeStr,
                period: 'UTC+1',
                cards: [{
                    id: `d${dayData.day}-poi${poiIdx}`,
                    evtId: `EVT-${locationCode}`,
                    category,
                    categoryBorder: catBorder,
                    categoryBg: catBg,
                    categoryText: catText,
                    locationCode,
                    durationLabel,
                    durationColor: durColor,
                    title,
                    description,
                    participants,
                    statusLabel: 'Confirmed',
                    statusIcon: 'confirmed' as const,
                    imageUrl: `https://source.unsplash.com/200x200/?${encodeURIComponent(title)},travel`,
                }]
            };
        });

        // ── Hotel card ────────────────────────────────────────────────────
        if (dayData.hotel_assignments && familyIds.length > 0) {
            const hotel = dayData.hotel_assignments[familyIds[0]];
            if (hotel && hotel.hotel_name) {
                rows.push({
                    time: '22:00',
                    period: 'UTC+1' as any,
                    cards: [{
                        id: `d${dayData.day}-hotel`,
                        evtId: `HTL-${hotel.hotel_id || ''}`,
                        category: 'Hotel',
                        categoryBorder: 'border-purple-200',
                        categoryBg: 'bg-purple-50',
                        categoryText: 'text-purple-700',
                        locationCode: hotel.hotel_id || '',
                        durationLabel: 'OVERNIGHT',
                        durationColor: 'text-purple-600',
                        title: hotel.hotel_name,
                        description: `₹${hotel.cost?.toLocaleString() || 'N/A'} per night`,
                        participants: familyIds.map((fid, i) => ({ code: `FAM ${String.fromCharCode(65 + i)}`, color: '' })),
                        statusLabel: 'Confirmed',
                        statusIcon: 'confirmed' as const,
                        imageUrl: `https://source.unsplash.com/200x200/?hotel,room`,
                    }]
                });
            }
        }

        // ── Time range ────────────────────────────────────────────────────
        const firstTime = rows.length > 0 ? rows[0].time : '09:00';
        const lastTime = rows.length > 0 ? rows[rows.length - 1].time : '22:00';

        return {
            date: `DAY ${dayData.day}`,
            label: dayData.region || `Day ${dayData.day} Exploration`,
            timeRange: `${rows.length} SLOTS · ${firstTime} – ${lastTime}`,
            rows
        };
    });
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ItineraryDetailViewProps {
    tripId: string;
}

export default function ItineraryDetailView({ tripId }: ItineraryDetailViewProps) {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [itineraryDays, setItineraryDays] = useState<Day[]>([]);

    useEffect(() => {
        async function loadTrip() {
            let loadedTrip: Trip | null = null;
            try {
                // 1. Try to fetch from backend
                const data = await apiClient.getTripSummary(tripId);
                if (data && data.trip_id) {
                    loadedTrip = {
                        id: data.trip_id,
                        title: data.trip_name || data.trip_id,
                        client: (data.families || []).join(', ') || 'Unknown',
                        status: 'DRAFT', // Default or derived
                        dateRange: [
                            data.start_date ? new Date(data.start_date).toLocaleDateString() : '',
                            data.end_date ? new Date(data.end_date).toLocaleDateString() : ''
                        ].filter(Boolean).join(' – '),
                        budget: data.summary?.estimated_cost ? `$${data.summary.estimated_cost}` : 'N/A',
                        members: []
                    };
                }
            } catch (err) {
                console.warn('Backend fetch failed, falling back to local storage', err);
            }

            if (!loadedTrip) {
                // 2. Try to fetch from MOCK_TRIPS via getTripById
                const mockTrip = getTripById(tripId);
                if (mockTrip) {
                    loadedTrip = mockTrip;
                }
            }

            if (!loadedTrip) {
                // 3. Try to fetch from sessionStorage (like ItineraryOptimizerWindow does)
                try {
                    const builtTripsStr = sessionStorage.getItem('builtTrips');
                    if (builtTripsStr) {
                        const builtTrips = JSON.parse(builtTripsStr);
                        const sessionTrip = builtTrips.find((t: any) => t.id === tripId);
                        if (sessionTrip) {
                            loadedTrip = sessionTrip;
                        }
                    }
                } catch (e) { }
            }

            setTrip(loadedTrip);

            // Fetch actual itinerary JSON if backend trip was found
            if (loadedTrip) {
                try {
                    const itiData = await apiClient.getTripItinerary(tripId);
                    if (itiData) {
                        setItineraryDays(transformItinerary(itiData));
                    } else {
                        setItineraryDays(DAYS);
                    }
                } catch (err) {
                    console.warn('Failed to load full itinerary JSON, falling back to mock Paris data');
                    setItineraryDays(DAYS);
                }
            } else {
                setItineraryDays(DAYS);
            }

            setIsLoading(false);
        }

        loadTrip();
    }, [tripId]);

    const [aiOpen, setAiOpen] = useState(false);
    const [profitOpen, setProfitOpen] = useState(false);
    const [panelHovered, setPanelHovered] = useState(false);
    const [expandedPoiId, setExpandedPoiId] = useState<string | null>(null);
    const [expandedRemovalId, setExpandedRemovalId] = useState<string | null>(null);
    const [showDetailedView, setShowDetailedView] = useState<string | null>(null);
    const [dismissedPois, setDismissedPois] = useState<string[]>([]);
    const [acceptedPois, setAcceptedPois] = useState<string[]>([]);
    const [dismissedRemovals, setDismissedRemovals] = useState<string[]>([]);
    const [acceptedRemovals, setAcceptedRemovals] = useState<string[]>([]);

    // Demo: Current day index (0 = Day 1, 1 = Day 2, 2 = Day 3)
    // In production, this should come from backend based on actual trip progress
    const currentDayIndex = 1; // Day 2 has started, so Day 1 is fully completed

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-sm text-[var(--bp-text)]">Loading itinerary...</p>
            </div>
        );
    }

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
                {/* All days rendered sequentially — continuous scroll */}
                {itineraryDays.map((day, dayIndex) => (
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
                                    {day.timeRange}
                                </div>
                            </div>
                        </div>

                        {/* Timeline rows for this day */}
                        <div className="relative px-6 py-6">
                            <div className="space-y-4">
                                {day.rows.map((row: TimeRow, rowIndex: number) => {
                                    const count = row.cards.length;
                                    const isMulti = count > 1;
                                    // Determine if this event is completed
                                    // If current day is later than this day, all events are completed
                                    // If current day is this day, check rowIndex
                                    const isDayCompleted = dayIndex < currentDayIndex;
                                    const isCompleted = isDayCompleted || (dayIndex === currentDayIndex && rowIndex < 2);
                                    const isLastRow = rowIndex === day.rows.length - 1;

                                    return (
                                        <div
                                            key={row.time}
                                            className={cn(
                                                'grid gap-8 relative group/row',
                                                isMulti ? 'items-start' : 'items-center',
                                            )}
                                            style={{ gridTemplateColumns: '80px 1fr' }}
                                        >
                                            {/* Dashed vertical line connector to next event */}
                                            {!isLastRow && (
                                                <div
                                                    className={cn(
                                                        'absolute left-[4.5rem] top-8 w-px pointer-events-none',
                                                        isCompleted ? 'bg-emerald-500' : 'bg-gray-900'
                                                    )}
                                                    style={{
                                                        height: 'calc(100% + 1rem)',
                                                        backgroundImage: isCompleted
                                                            ? 'repeating-linear-gradient(0deg, #10b981, #10b981 3px, transparent 3px, transparent 5px)'
                                                            : 'repeating-linear-gradient(0deg, #1a1a1a, #1a1a1a 3px, transparent 3px, transparent 5px)',
                                                        backgroundColor: 'transparent',
                                                    }}
                                                />
                                            )}

                                            {/* Time column */}
                                            <div className="text-right relative z-10 pr-4">
                                                <div className={cn(
                                                    "font-bold text-sm leading-none",
                                                    isCompleted ? "text-emerald-600" : "text-gray-900"
                                                )}>{row.time}</div>
                                                <div className="text-[9px] text-gray-400 font-mono mt-0.5">{row.period}</div>
                                                <div className={cn(
                                                    "absolute right-[-1.25rem] top-1.5 w-1.5 h-1.5 rounded-full border transition-all",
                                                    isCompleted
                                                        ? "bg-emerald-500 border-emerald-500"
                                                        : "bg-white border-gray-400 group-hover/row:border-black"
                                                )} />
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

                                {/* ── AI-Recommended POI Additions ── */}
                                {AI_POI_ADDITIONS.filter(p => p.dayDate === day.date && !dismissedPois.includes(p.id)).map(poi => {
                                    const accepted = acceptedPois.includes(poi.id);
                                    const isExpanded = expandedPoiId === poi.id;
                                    const showDetailed = showDetailedView === poi.id;
                                    const whyData = AI_POI_WHY_DATA[poi.id];

                                    return (
                                        <div key={poi.id} className="grid gap-8 relative group/row items-start" style={{ gridTemplateColumns: '80px 1fr' }}>
                                            {/* Time */}
                                            <div className="text-right relative z-10">
                                                <div className="font-bold text-[var(--gradient-opt-gold)] text-sm leading-none">{poi.time}</div>
                                                <div className="text-[9px] text-gray-400 font-mono mt-0.5">UTC+1</div>
                                                <div className="absolute right-[-2.25rem] top-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--gradient-opt-gold)', boxShadow: '0 0 0 3px rgba(197,160,101,0.2)' }} />
                                            </div>
                                            {/* Gradient-border card */}
                                            <div>
                                                {/* Badge bar */}
                                                <div className="flex items-center gap-2 mb-[-1px] relative z-10">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 text-white text-[10px] font-bold tracking-widest" style={{ background: 'var(--gradient-opt)' }}>
                                                        <span>✦</span> AI RECOMMENDED
                                                    </div>
                                                    <button
                                                        onClick={() => setExpandedPoiId(isExpanded ? null : poi.id)}
                                                        className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all duration-200 hover:bg-[var(--gradient-opt)] hover:text-white"
                                                        style={{
                                                            background: isExpanded ? 'var(--gradient-opt)' : 'rgba(197,160,101,0.1)',
                                                            color: isExpanded ? '#fff' : '#c5a065',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {isExpanded ? 'HIDE' : 'WHY?'}
                                                    </button>
                                                </div>
                                                {/* Card with hover gradient border */}
                                                <div
                                                    className="relative group cursor-pointer transition-all duration-300"
                                                    style={{ boxShadow: '0 10px 30px -10px rgba(197,160,101,0.1)' }}
                                                    onClick={() => setExpandedPoiId(isExpanded ? null : poi.id)}
                                                >
                                                    {/* Default Background */}
                                                    <div className="absolute inset-0 bg-white border border-gray-200 transition-opacity duration-300 group-hover:opacity-0" />

                                                    {/* Corner Ticks (Visible by default, hidden on hover) */}
                                                    <div className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0 pointer-events-none">
                                                        {(['tr', 'bl', 'br'] as const).map(c => (
                                                            <div key={c} style={{
                                                                position: 'absolute', width: 10, height: 10, zIndex: 2,
                                                                top: c[0] === 't' ? -1 : 'auto', bottom: c[0] === 'b' ? -1 : 'auto',
                                                                left: c[1] === 'l' ? -1 : 'auto', right: c[1] === 'r' ? -1 : 'auto',
                                                                borderTop: c[0] === 't' ? '1.5px solid #c5a065' : 'none',
                                                                borderBottom: c[0] === 'b' ? '1.5px solid #c5a065' : 'none',
                                                                borderLeft: c[1] === 'l' ? '1.5px solid #c5a065' : 'none',
                                                                borderRight: c[1] === 'r' ? '1.5px solid #c5a065' : 'none',
                                                            }} />
                                                        ))}
                                                    </div>

                                                    {/* Hover Gradient Border */}
                                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
                                                        background: '#fffdf9',
                                                        backgroundImage: 'linear-gradient(#fffdf9,#fffdf9), var(--gradient-opt)',
                                                        backgroundOrigin: 'border-box',
                                                        backgroundClip: 'padding-box, border-box',
                                                        border: '2px solid transparent',
                                                    }} />
                                                    <div className="relative z-10 p-3">
                                                        <div className="flex gap-3 items-center h-24">
                                                            {/* Image */}
                                                            <div className="w-24 h-full flex-shrink-0 border overflow-hidden bg-amber-50" style={{ borderColor: '#c5a065' }}>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={poi.imageUrl} alt={poi.title} className="w-full h-full object-cover" />
                                                            </div>
                                                            {/* Content matches ActivityCard layout exactly */}
                                                            <div className="flex-1 flex flex-col justify-center h-full gap-1 min-w-0">
                                                                {/* Top row: title + tag */}
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-tight leading-none truncate">
                                                                            {poi.title}
                                                                        </h4>
                                                                        <CategoryTag category={poi.category as any} />
                                                                    </div>
                                                                </div>

                                                                {/* Subtitle / Description */}
                                                                <div className="text-[10px] text-gray-500 font-medium truncate">{poi.subtitle}</div>

                                                                {/* Bottom row: status (Accept/Decline + Time) + ALLOC tags */}
                                                                <div className="flex justify-between items-center mt-auto pt-1.5 border-t border-gray-100/70">
                                                                    <div className="flex items-center gap-3">
                                                                        {accepted ? (
                                                                            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded"><Check className="w-3 h-3" /> ACCEPTED</div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setAcceptedPois(p => [...p, poi.id]); }}
                                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-black text-white hover:bg-gray-800 transition-all shadow-sm"
                                                                                    style={{ borderBottom: '2px solid #c5a065' }}
                                                                                >
                                                                                    <Check className="w-3 h-3" /> ACCEPT
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setDismissedPois(p => [...p, poi.id]); }}
                                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                                                >
                                                                                    <X className="w-3 h-3" /> DECLINE
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        <span className="text-[9px] font-mono text-gray-400 border-l border-gray-200 pl-3">
                                                                            {poi.durationLabel}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-mono text-gray-400">ALLOC:</span>
                                                                        <div className="flex gap-1">
                                                                            {poi.participants.map((p: string) => (
                                                                                <FamTag key={p} code={p} />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Expanded Details - Two Column Layout */}
                                                        {isExpanded && whyData && (
                                                            <div className="mt-4 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                                                                {/* Reason Badge */}
                                                                <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400">
                                                                    <div className="text-[10px] font-bold tracking-widest uppercase text-amber-700 mb-1">AI RECOMMENDATION REASON</div>
                                                                    <p className="text-xs text-amber-900">{poi.subtitle}</p>
                                                                </div>

                                                                {/* Two Column Layout */}
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {/* LEFT SIDE - Important Details */}
                                                                    <div className="space-y-4">
                                                                        {/* Schedule Comparison */}
                                                                        <div>
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">SCHEDULE COMPARISON</span>
                                                                                <div className="flex items-center gap-2 text-[9px] font-mono">
                                                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 border border-gray-300 inline-block" /> ORIGINAL</span>
                                                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-900 inline-block" /> OPTIMIZED</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                {/* Original card */}
                                                                                <div className="border border-dashed border-gray-200 p-3 bg-gray-50 relative">
                                                                                    <div className="text-xs font-mono text-gray-300 line-through mb-1">{whyData.originalTime}</div>
                                                                                    <div className="font-semibold text-gray-300 line-through text-sm">{whyData.originalTitle}</div>
                                                                                    <div className="mt-2">
                                                                                        <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-2 py-0.5">{whyData.originalTag}</span>
                                                                                    </div>
                                                                                </div>
                                                                                {/* New card */}
                                                                                <div className="p-3 relative" style={{
                                                                                    background: '#fffdf9',
                                                                                    backgroundImage: 'linear-gradient(#fffdf9,#fffdf9), var(--gradient-opt)',
                                                                                    backgroundOrigin: 'border-box',
                                                                                    backgroundClip: 'padding-box, border-box',
                                                                                    border: '1.5px solid transparent',
                                                                                }}>
                                                                                    <div className="text-xs font-mono font-bold mb-1" style={{ color: '#c5a065' }}>{whyData.newTime}</div>
                                                                                    <div className="font-semibold text-gray-900 text-sm">{whyData.newTitle}</div>
                                                                                    <div className="text-[11px] text-gray-500 mt-1">{whyData.newSubtitle}</div>
                                                                                    <div className="flex gap-2 mt-2 flex-wrap">
                                                                                        {whyData.newTags.map(t => (
                                                                                            <span key={t} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5" style={{ border: '1px solid #8fa391', color: '#8fa391' }}>{t}</span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Net Impact */}
                                                                        <div className="border border-gray-200 p-4 bg-gray-50">
                                                                            <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-3">NET IMPACT</div>
                                                                            <div className="flex items-baseline gap-2 mb-2">
                                                                                <span className="font-mono font-bold text-4xl" style={{ color: '#c5a065' }}>{whyData.netImpact}</span>
                                                                            </div>
                                                                            <p className="text-xs text-gray-600 leading-relaxed">{whyData.netImpactNote}</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* RIGHT SIDE - Secondary Details */}
                                                                    <div className="space-y-4">
                                                                        {/* Operational Logic */}
                                                                        <div>
                                                                            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 block mb-3">OPERATIONAL LOGIC</span>
                                                                            <div className="space-y-3">
                                                                                {whyData.logicItems.map((item, i) => (
                                                                                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200">
                                                                                        <div className="w-7 h-7 bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 text-sm">
                                                                                            {item.icon}
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="font-semibold text-xs text-gray-900 mb-1">{item.title}</div>
                                                                                            <div className="text-[11px] text-gray-500 leading-relaxed">
                                                                                                {item.body.split(item.highlight ?? '___NONE___').map((part, j, arr) => j < arr.length - 1 ? (
                                                                                                    <span key={j}>{part}<span className="font-mono font-bold px-1 py-0.5 mx-0.5 rounded text-xs" style={{ background: 'rgba(197,160,101,0.12)', color: '#c5a065' }}>{item.highlight}</span></span>
                                                                                                ) : <span key={j}>{part}</span>)}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Cost Delta Analysis */}
                                                                        <div className="border border-gray-200 p-4 bg-gray-50">
                                                                            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 block mb-3">COST DELTA ANALYSIS</span>
                                                                            <div className="space-y-3">
                                                                                {[
                                                                                    { label: 'BASE', value: whyData.costBase, color: '#d1d5db' },
                                                                                    { label: 'EARLY FEE', value: whyData.costEarlyFee, color: '#c5a065' },
                                                                                    { label: 'TOTAL', value: whyData.costTotal, color: '#1a1a1a' },
                                                                                ].map(bar => {
                                                                                    const barMax = Math.max(whyData.costBase, whyData.costEarlyFee, whyData.costTotal, 100);
                                                                                    return (
                                                                                        <div key={bar.label} className="relative">
                                                                                            {bar.value > 0 && (
                                                                                                <div className="absolute right-0 -top-4 text-[10px] font-mono text-gray-500">
                                                                                                    ${bar.value.toLocaleString()}
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="h-6 bg-white border border-gray-100 flex items-center relative w-full">
                                                                                                <div style={{ width: `${Math.max(2, (bar.value / barMax) * 100)}%`, background: bar.color, height: '100%' }} />
                                                                                                {bar.label === 'EARLY FEE' && bar.value > 0 && (
                                                                                                    <div className="absolute left-2 text-[9px] font-bold" style={{ color: '#fff' }}>+${bar.value}</div>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="text-[9px] font-bold tracking-wider text-gray-400 text-center mt-1">{bar.label}</div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* ── AI-Flagged Removals ── */}
                                {AI_REMOVALS.filter(r => r.dayDate === day.date && !dismissedRemovals.includes(r.id)).map(rem => {
                                    const accepted = acceptedRemovals.includes(rem.id);
                                    const isExpanded = expandedRemovalId === rem.id;
                                    const showDetailed = showDetailedView === rem.id;
                                    const whyData = AI_REMOVAL_WHY_DATA[rem.id];

                                    return (
                                        <div key={rem.id} className="grid gap-8 relative group/row items-start" style={{ gridTemplateColumns: '80px 1fr' }}>
                                            {/* Time */}
                                            <div className="text-right relative z-10">
                                                <div className="font-bold text-gray-300 text-sm leading-none line-through">{rem.time}</div>
                                                <div className="text-[9px] text-gray-300 font-mono mt-0.5">UTC+1</div>
                                                <div className="absolute right-[-2.25rem] top-1.5 w-1.5 h-1.5 bg-gray-200 border border-gray-300 rounded-full" />
                                            </div>
                                            <div>
                                                {/* Badge bar */}
                                                <div className="flex items-center gap-2 mb-[-1px] relative z-10">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-500 text-[10px] font-bold tracking-widest">
                                                        <span>⊗</span> {rem.badge}
                                                    </div>
                                                    <button
                                                        onClick={() => setExpandedRemovalId(isExpanded ? null : rem.id)}
                                                        className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all duration-200 hover:bg-gray-300 hover:text-gray-700"
                                                        style={{
                                                            background: isExpanded ? '#6b7280' : 'rgba(107,114,128,0.1)',
                                                            color: isExpanded ? '#fff' : '#6b7280',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {isExpanded ? 'HIDE' : 'WHY?'}
                                                    </button>
                                                </div>
                                                {/* Greyed card */}
                                                <div
                                                    className="relative cursor-pointer transition-all duration-300"
                                                    onClick={() => setExpandedRemovalId(isExpanded ? null : rem.id)}
                                                >
                                                    <div className="flex gap-3 items-center p-3 h-24 bg-gray-50 border border-dashed border-gray-200 opacity-60 grayscale">
                                                        <div className="w-24 h-full flex-shrink-0 border border-gray-200 overflow-hidden bg-gray-100">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={rem.imageUrl} alt={rem.title} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-center h-full gap-1 min-w-0">
                                                            {/* Top row: title + tag */}
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-tight leading-none truncate line-through">
                                                                        {rem.title}
                                                                    </h4>
                                                                    <CategoryTag category={rem.category as any} />
                                                                </div>
                                                            </div>

                                                            {/* Subtitle / Description */}
                                                            <div className="text-[10px] text-gray-500 font-medium truncate">{rem.reason}</div>

                                                            {/* Bottom row: status + Time + ALLOC tags */}
                                                            <div className="flex justify-between items-center mt-auto pt-1.5 border-t border-gray-200">
                                                                <div className="flex items-center gap-3">
                                                                    {accepted ? (
                                                                        <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded"><Check className="w-3 h-3" /> ACCEPTED</div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setAcceptedRemovals(r => [...r, rem.id]); }}
                                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-black text-white hover:bg-gray-800 transition-all shadow-sm"
                                                                                style={{ borderBottom: '2px solid #c5a065' }}
                                                                            >
                                                                                <Check className="w-3 h-3" /> ACCEPT
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setDismissedRemovals(r => [...r, rem.id]); }}
                                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                                            >
                                                                                <X className="w-3 h-3" /> DECLINE
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    <span className="text-[9px] font-mono text-gray-400 border-l border-gray-200 pl-3">
                                                                        {rem.durationLabel}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[9px] font-mono text-gray-400">ALLOC:</span>
                                                                    <div className="flex gap-1">
                                                                        {rem.participants.map((p: string) => (
                                                                            <FamTag key={p} code={p} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Details - Two Column Layout */}
                                                    {isExpanded && whyData && (
                                                        <div className="mt-4 pt-4 border-t border-gray-200 bg-white p-3" onClick={(e) => e.stopPropagation()}>
                                                            {/* Reason Badge */}
                                                            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400">
                                                                <div className="text-[10px] font-bold tracking-widest uppercase text-red-700 mb-1">REMOVAL REASON</div>
                                                                <p className="text-xs text-red-900">{rem.reason}</p>
                                                            </div>

                                                            {/* Two Column Layout */}
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {/* LEFT SIDE - Important Details */}
                                                                <div className="space-y-4">
                                                                    {/* Schedule Comparison */}
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">SCHEDULE COMPARISON</span>
                                                                            <div className="flex items-center gap-2 text-[9px] font-mono">
                                                                                <span className="flex items-center gap-1"><span className="w-2 h-2 border border-gray-300 inline-block" /> ORIGINAL</span>
                                                                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-900 inline-block" /> OPTIMIZED</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-3">
                                                                            {/* Original card */}
                                                                            <div className="border border-dashed border-gray-200 p-3 bg-gray-50 relative">
                                                                                <div className="text-xs font-mono text-gray-300 line-through mb-1">{whyData.originalTime}</div>
                                                                                <div className="font-semibold text-gray-300 line-through text-sm">{whyData.originalTitle}</div>
                                                                                <div className="mt-2">
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-2 py-0.5">{whyData.originalTag}</span>
                                                                                </div>
                                                                            </div>
                                                                            {/* New card */}
                                                                            <div className="p-3 relative" style={{
                                                                                background: '#fffdf9',
                                                                                backgroundImage: 'linear-gradient(#fffdf9,#fffdf9), var(--gradient-opt)',
                                                                                backgroundOrigin: 'border-box',
                                                                                backgroundClip: 'padding-box, border-box',
                                                                                border: '1.5px solid transparent',
                                                                            }}>
                                                                                <div className="text-xs font-mono font-bold mb-1" style={{ color: '#c5a065' }}>{whyData.newTime}</div>
                                                                                <div className="font-semibold text-gray-900 text-sm">{whyData.newTitle}</div>
                                                                                <div className="text-[11px] text-gray-500 mt-1">{whyData.newSubtitle}</div>
                                                                                <div className="flex gap-2 mt-2 flex-wrap">
                                                                                    {whyData.newTags.map(t => (
                                                                                        <span key={t} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5" style={{ border: '1px solid #8fa391', color: '#8fa391' }}>{t}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Net Impact */}
                                                                    <div className="border border-gray-200 p-4 bg-gray-50">
                                                                        <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-3">NET IMPACT</div>
                                                                        <div className="flex items-baseline gap-2 mb-2">
                                                                            <span className="font-mono font-bold text-4xl" style={{ color: '#c5a065' }}>{whyData.netImpact}</span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-600 leading-relaxed">{whyData.netImpactNote}</p>
                                                                    </div>
                                                                </div>

                                                                {/* RIGHT SIDE - Secondary Details */}
                                                                <div className="space-y-4">
                                                                    {/* Operational Logic */}
                                                                    <div>
                                                                        <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 block mb-3">OPERATIONAL LOGIC</span>
                                                                        <div className="space-y-3">
                                                                            {whyData.logicItems.map((item, i) => (
                                                                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200">
                                                                                    <div className="w-7 h-7 bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 text-sm">
                                                                                        {item.icon}
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="font-semibold text-xs text-gray-900 mb-1">{item.title}</div>
                                                                                        <div className="text-[11px] text-gray-500 leading-relaxed">
                                                                                            {item.body.split(item.highlight ?? '___NONE___').map((part, j, arr) => j < arr.length - 1 ? (
                                                                                                <span key={j}>{part}<span className="font-mono font-bold px-1 py-0.5 mx-0.5 rounded text-xs" style={{ background: 'rgba(197,160,101,0.12)', color: '#c5a065' }}>{item.highlight}</span></span>
                                                                                            ) : <span key={j}>{part}</span>)}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    {/* Cost Delta Analysis */}
                                                                    <div className="border border-gray-200 p-4 bg-gray-50">
                                                                        <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 block mb-3">COST DELTA ANALYSIS</span>
                                                                        <div className="space-y-3">
                                                                            {[
                                                                                { label: 'BASE', value: whyData.costBase, color: '#d1d5db' },
                                                                                { label: 'EARLY FEE', value: whyData.costEarlyFee, color: '#c5a065' },
                                                                                { label: 'TOTAL', value: whyData.costTotal, color: '#1a1a1a' },
                                                                            ].map(bar => {
                                                                                const barMax = Math.max(whyData.costBase, whyData.costEarlyFee, whyData.costTotal, 100);
                                                                                return (
                                                                                    <div key={bar.label} className="relative">
                                                                                        {bar.value > 0 && (
                                                                                            <div className="absolute right-0 -top-4 text-[10px] font-mono text-gray-500">
                                                                                                ${bar.value.toLocaleString()}
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="h-6 bg-white border border-gray-100 flex items-center relative w-full">
                                                                                            <div style={{ width: `${Math.max(2, (bar.value / barMax) * 100)}%`, background: bar.color, height: '100%' }} />
                                                                                            {bar.label === 'EARLY FEE' && bar.value > 0 && (
                                                                                                <div className="absolute left-2 text-[9px] font-bold" style={{ color: '#fff' }}>+${bar.value}</div>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="text-[9px] font-bold tracking-wider text-gray-400 text-center mt-1">{bar.label}</div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
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
// ─── Static AI data ──────────────────────────────────────────────────────────

type TechChangeData = {
    reqId: string;
    title: string;
    originalTime: string;
    originalTitle: string;
    originalTag: string;
    newTime: string;
    newTitle: string;
    newSubtitle: string;
    newTags: string[];
    logicItems: { icon: string; title: string; body: string; highlight?: string }[];
    costBase: number;
    costEarlyFee: number;
    costTotal: number;
    netImpact: string;
    netImpactNote: string;
};

const AI_POI_ADDITIONS = [
    {
        id: 'poi-d1-tea',
        dayDate: 'OCT 12',
        time: '11:00',
        title: 'Traditional Tea Ceremony Stop',
        subtitle: 'Suggested addition due to proximity (5 min walk) and open schedule gap. Authenticated matcha experience.',
        badge: 'OPTIMAL ROUTE EFFICIENCY',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80',
        durationLabel: '1h 30m',
        category: 'activity',
        participants: ['FAM A', 'FAM B'],
    },
    {
        id: 'poi-d2-market',
        dayDate: 'OCT 13',
        time: '09:30',
        title: 'Nishiki Market Morning Walk',
        subtitle: 'AI detected scheduling gap and high satisfaction correlation for similar group profiles.',
        badge: 'HIGH SATISFACTION SCORE',
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&q=80',
        durationLabel: '45m',
        category: 'activity',
        participants: ['FAM A', 'FAM B', 'FAM C'],
    },
];

const AI_REMOVALS = [
    {
        id: 'rem-d1-shrine',
        dayDate: 'OCT 12',
        time: '10:00',
        title: 'Main Shrine Ascent',
        subtitle: '1h 30m • Activity',
        reason: 'REMOVED — Replaced by Early Access Route to avoid predicted 45min crowd delays.',
        badge: '1 ACTIVITY REPLACED',
        imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200&q=80',
        category: 'activity',
        durationLabel: '1h 30m',
        participants: ['FAM A', 'FAM B'],
    },
];

const AI_POI_WHY_DATA: Record<string, TechChangeData> = {
    'poi-d1-tea': {
        reqId: '#TCA-001-V2',
        title: 'Traditional Tea Ceremony Stop',
        originalTime: '10:00 AM',
        originalTitle: 'Unscheduled Gap',
        originalTag: 'HIGH CROWD',
        newTime: '11:00 AM',
        newTitle: 'Traditional Tea Ceremony Stop',
        newSubtitle: 'Authenticated matcha experience, 5 min walk.',
        newTags: ['EXCLUSIVE', '-25% WAIT'],
        logicItems: [
            { icon: '🌤', title: 'Schedule Optimization', body: 'A 90-minute gap exists between Louvre and lunch. This stop fills the window perfectly with zero added transit.', highlight: '90 mins' },
            { icon: '📊', title: 'Satisfaction Signal', body: 'Groups with cultural add-ons during gaps report 31% higher trip ratings in our dataset of 4,200+ itineraries.', highlight: '31%' },
        ],
        costBase: 850,
        costEarlyFee: 120,
        costTotal: 970,
        netImpact: '+$120',
        netImpactNote: 'Includes experience fee and private guide surcharge.',
    },
    'poi-d2-market': {
        reqId: '#TCA-002-V1',
        title: 'Nishiki Market Morning Walk',
        originalTime: '09:00 AM',
        originalTitle: 'Transit Buffer',
        originalTag: 'DEAD TIME',
        newTime: '09:30 AM',
        newTitle: 'Nishiki Market Walk',
        newSubtitle: 'Local market experience, free entry.',
        newTags: ['FREE', 'LOCAL PICK'],
        logicItems: [
            { icon: '🗺', title: 'Route Proximity', body: 'Market is directly on-route between hotel and Day 2 first activity. No extra transit required.', highlight: '0 min extra' },
            { icon: '💰', title: 'Cost Efficiency', body: 'Free entry market stop adds cultural value without budget impact. Similar groups saved avg ¥3,200 by substituting paid tourist spots.', highlight: '¥3,200' },
        ],
        costBase: 0,
        costEarlyFee: 0,
        costTotal: 0,
        netImpact: '$0',
        netImpactNote: 'No cost impact. Free public market.',
    },
};

const AI_REMOVAL_WHY_DATA: Record<string, TechChangeData> = {
    'rem-d1-shrine': {
        reqId: '#882-CHANGE-V2',
        title: 'Main Shrine Ascent → Early Access Route',
        originalTime: '10:00 AM',
        originalTitle: 'Main Shrine Ascent',
        originalTag: 'HIGH CROWD',
        newTime: '07:30 AM',
        newTitle: 'Early Access Route',
        newSubtitle: 'Back-trail entry to avoid congestion.',
        newTags: ['EXCLUSIVE', '-25% WAIT'],
        logicItems: [
            { icon: '🌡', title: 'Micro-climate Adaptation', body: 'Real-time weather data indicates rising humidity at 11:00 AM. Shifting ascent to 07:30 AM ensures optimal hiking temperature vs forecasted 24°C.', highlight: '18°C' },
            { icon: '🚧', title: 'Transit Efficiency', body: 'Construction on Route 143 detected. Alternate route via Eastern Bypass saves estimated transit time.', highlight: '14 mins' },
        ],
        costBase: 850,
        costEarlyFee: 120,
        costTotal: 970,
        netImpact: '+$120',
        netImpactNote: 'Includes early-access surcharge and private vehicle upgrade.',
    },
};
