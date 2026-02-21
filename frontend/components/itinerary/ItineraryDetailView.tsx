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

// ─── Static data ─────────────────────────────────────────────────────────────

const TIMELINE_ROWS: TimeRow[] = [
    {
        time: '08:00',
        period: 'UTC+1',
        cards: [
            {
                id: 'breakfast',
                evtId: 'EVT-892',
                category: 'Dining',
                categoryBorder: 'border-orange-200',
                categoryBg: 'bg-orange-50',
                categoryText: 'text-orange-700',
                locationCode: 'PARIS_06',
                durationLabel: '1H 00M',
                durationColor: 'text-slate-500',
                title: 'Breakfast at Café de Flore',
                description: 'Sequence: Croissants, Coffee. Full group synchronization required.',
                participants: [
                    { code: 'FAM A', color: 'bg-slate-100 border-slate-200 text-slate-600' },
                    { code: 'FAM B', color: 'bg-slate-100 border-slate-200 text-slate-600' },
                    { code: 'FAM C', color: 'bg-slate-100 border-slate-200 text-slate-600' },
                ],
                statusLabel: 'Confirmed',
                statusIcon: 'confirmed',
                imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&q=80',
            },
        ],
    },
    {
        time: '10:00',
        period: 'UTC+1',
        splitIcon: 'split',
        cards: [
            {
                id: 'louvre',
                evtId: 'ACT-401',
                category: 'Activity',
                categoryBorder: 'border-blue-200',
                categoryBg: 'bg-blue-50',
                categoryText: 'text-blue-700',
                locationCode: 'PARIS_01',
                durationLabel: '3H 00M',
                durationColor: 'text-blue-600',
                title: 'Louvre Museum',
                subtitle: 'Richelieu Wing',
                description: 'Guided Mona Lisa wing tour. Wheelchair accessible route.',
                participants: [
                    { code: 'FAM A', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                    { code: 'FAM B', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                ],
                statusLabel: 'Confirmed',
                statusIcon: 'confirmed',
                imageUrl: 'https://images.unsplash.com/photo-1499856374916-4f4b4e26cdb4?w=200&q=80',
            },
            {
                id: 'eiffel',
                evtId: 'ACT-404',
                category: 'Activity',
                categoryBorder: 'border-purple-200',
                categoryBg: 'bg-purple-50',
                categoryText: 'text-purple-700',
                locationCode: 'PARIS_07',
                durationLabel: '2H 30M',
                durationColor: 'text-purple-600',
                title: 'Eiffel Tower Summit',
                subtitle: 'Top Deck',
                description: 'Summit access via priority elevator. Photographers pass included.',
                participants: [
                    { code: 'FAM C', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                ],
                statusLabel: 'Limited',
                statusIcon: 'limited',
                imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=200&q=80',
            },
        ],
    },
    {
        time: '13:00',
        period: 'UTC+1',
        splitIcon: 'merge',
        cards: [
            {
                id: 'lunch',
                evtId: 'EVT-894',
                category: 'Dining',
                categoryBorder: 'border-orange-200',
                categoryBg: 'bg-orange-50',
                categoryText: 'text-orange-700',
                locationCode: 'PARIS_01',
                durationLabel: '1H 30M',
                durationColor: 'text-slate-500',
                title: 'Lunch at Le Nemours',
                description: 'Casual seating. Croque monsieur. Terrace reserved for full party.',
                participants: [
                    { code: 'FAM A', color: 'bg-slate-100 border-slate-200 text-slate-600' },
                    { code: 'FAM B', color: 'bg-slate-100 border-slate-200 text-slate-600' },
                    { code: 'FAM C', color: 'bg-slate-100 border-slate-200 text-slate-600' },
                ],
                statusLabel: '~$60.00 / PAX',
                statusIcon: 'info',
                imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80',
            },
        ],
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SplitMergeIcon({ type }: { type: 'split' | 'merge' }) {
    const isSplit = type === 'split';
    return (
        <div className="mt-2 flex flex-col items-center gap-0.5">
            <div className={cn('w-px h-3', isSplit ? 'bg-indigo-200' : 'bg-emerald-200')} />
            <div className={cn(
                'text-[10px] font-bold mono-font px-0.5',
                isSplit ? 'text-indigo-400' : 'text-emerald-400',
            )}>
                {isSplit ? '⑂' : '⑁'}
            </div>
            <div className={cn('w-px h-3', isSplit ? 'bg-indigo-200' : 'bg-emerald-200')} />
        </div>
    );
}

function ActivityCard({ card, compact }: { card: LaneCard; compact?: boolean }) {
    return (
        <div className={cn(
            'tech-card flex flex-row group/card relative transition-all duration-200 hover:translate-x-0.5 hover:shadow-md h-[110px]',
            compact ? 'w-[480px] shrink-0' : 'flex-1 min-w-0',
        )}>
            {/* Drag handle */}
            <div className="absolute top-1.5 right-1.5 text-slate-300 hover:text-slate-500 cursor-grab z-10">
                <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Image */}
            <div className="w-[88px] h-full flex-shrink-0 relative border-r border-slate-200 bg-slate-100 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-full object-cover grayscale group-hover/card:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/5" />
                <div className="absolute bottom-1 left-1 bg-black/80 text-white text-[7px] px-1 py-px font-mono leading-none">
                    {card.locationCode}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 flex flex-col justify-center gap-1.5 min-w-0 pr-8">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight leading-tight">
                                {card.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">{card.evtId}</span>
                            <span className={cn(
                                'px-1.5 py-px border text-[10px] font-bold uppercase tracking-wider rounded-sm shrink-0',
                                card.categoryBorder, card.categoryBg, card.categoryText,
                            )}>
                                {card.category}
                            </span>
                        </div>
                        {card.subtitle && (
                            <span className="text-xs text-slate-500 font-mono font-medium mt-0.5">{card.subtitle}</span>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn('text-xs font-mono font-semibold', card.durationColor)}>
                            {card.durationLabel}
                        </span>
                        <div className="flex items-center gap-0.5 flex-wrap justify-end">
                            {card.participants.map((p) => (
                                <span
                                    key={p.code}
                                    className={cn('px-1.5 py-0.5 border rounded text-[10px] font-bold font-mono', p.color)}
                                >
                                    {p.code}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center gap-4">
                    <p className="text-xs text-slate-500 font-mono leading-tight truncate flex-1">
                        {card.description}
                    </p>
                    <div className={cn(
                        'flex items-center gap-1 shrink-0',
                        card.statusIcon === 'confirmed' ? 'text-emerald-600' :
                            card.statusIcon === 'limited' ? 'text-orange-500' : 'text-slate-500',
                    )}>
                        {card.statusIcon === 'confirmed' && <Check className="w-3 h-3" />}
                        <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                            {card.statusLabel}
                        </span>
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
                {/* Sticky day header */}
                <div className="sticky top-0 z-30 flex items-center gap-4 bg-slate-100/90 backdrop-blur border-b border-slate-200 px-6 py-2.5 w-full">
                    <div className="w-16 text-right font-bold text-slate-500 text-[10px] uppercase tracking-widest font-mono">
                        {trip.dateRange?.split('–')?.[0]?.trim() ?? 'OCT 12'}
                    </div>
                    <div className="h-4 w-px bg-slate-300" />
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                        Day 1: Paris Sightseeing
                    </h2>
                    <span className="ml-auto text-[10px] font-mono text-slate-400 font-medium">
                        {TIMELINE_ROWS.length} SLOTS · 08:00 – 14:30
                    </span>
                </div>

                {/* Timeline rows */}
                {TIMELINE_ROWS.map((row) => {
                    const isMulti = row.cards.length > 1;
                    return (
                        <div
                            key={row.time}
                            className={cn(
                                'flex border-b border-slate-200 group/row relative',
                                isMulti ? 'bg-slate-50/50' : 'bg-white',
                            )}
                            style={{ minHeight: '130px' }}
                        >
                            {/* Time column */}
                            <div className="w-20 shrink-0 sticky left-0 flex flex-col items-center justify-center border-r border-slate-200 bg-white z-30">
                                <span className={cn(
                                    'text-sm font-bold font-mono',
                                    row.splitIcon === 'split' ? 'text-indigo-600' : 'text-slate-900',
                                )}>
                                    {row.time}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-mono">
                                    {row.period}
                                </span>
                                {row.splitIcon && <SplitMergeIcon type={row.splitIcon} />}
                            </div>

                            {/* Cards */}
                            <div className={cn(
                                'flex-1 px-6 flex items-center',
                                isMulti ? 'gap-4 overflow-x-auto scrollbar-hide' : '',
                            )}>
                                {row.cards.map((card) => (
                                    <ActivityCard key={card.id} card={card} compact={isMulti} />
                                ))}
                            </div>
                        </div>
                    );
                })}
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
