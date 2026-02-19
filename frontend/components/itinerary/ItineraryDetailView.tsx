'use client';

import { useState } from 'react';
import {
    ArrowLeft, TrendingUp, Sparkles, ChevronUp, ChevronDown,
    Zap, MessageSquare, Send, GripVertical, Plus, Minimize2, Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type LaneCard = {
    id: string;
    category: string;
    categoryColor: string;               // Tailwind bg class for badge
    categoryTextColor: string;           // Tailwind text class for badge
    laneBorderColor?: string;            // Tailwind border class for card left accent
    laneBgColor?: string;                // Tailwind bg class for card tint
    durationLabel: string;
    durationColor?: string;
    title: string;
    description: string;
    participants: { label: string; color: string }[];
    statusLabel: string;
    statusColor: string;
};

type TimeRow = {
    time: string;
    period: 'AM' | 'PM';
    splitIcon?: 'split' | 'merge';
    cards: LaneCard[];
};

// ─── Static data (mirrors Stitch design) ─────────────────────────────────────

const TIMELINE_ROWS: TimeRow[] = [
    {
        time: '08:00',
        period: 'AM',
        cards: [
            {
                id: 'breakfast',
                category: 'Dining',
                categoryColor: 'bg-orange-100',
                categoryTextColor: 'text-orange-700',
                durationLabel: '1h',
                title: 'Breakfast at Café de Flore',
                description: 'Classic Parisian breakfast with croissants and coffee. All groups attending together.',
                participants: [
                    { label: 'Family A', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
                    { label: 'Family B', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
                    { label: 'Family C', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
                ],
                statusLabel: 'Confirmed for All',
                statusColor: 'text-green-600 bg-green-50',
            },
        ],
    },
    {
        time: '10:00',
        period: 'AM',
        splitIcon: 'split',
        cards: [
            {
                id: 'louvre',
                category: 'Activity',
                categoryColor: 'bg-blue-100',
                categoryTextColor: 'text-blue-700',
                laneBorderColor: 'border-blue-100',
                laneBgColor: 'bg-blue-50/20',
                durationLabel: '3h',
                durationColor: 'text-blue-500',
                title: 'Louvre Museum',
                description: 'Guided Mona Lisa wing tour. Wheelchair accessible route through the Richelieu wing.',
                participants: [
                    { label: 'Family A + B', color: 'bg-blue-100 text-blue-700' },
                ],
                statusLabel: 'Confirmed',
                statusColor: 'text-green-600 bg-green-50',
            },
            {
                id: 'eiffel',
                category: 'Activity',
                categoryColor: 'bg-purple-100',
                categoryTextColor: 'text-purple-700',
                laneBorderColor: 'border-purple-100',
                laneBgColor: 'bg-purple-50/20',
                durationLabel: '2.5h',
                durationColor: 'text-purple-500',
                title: 'Eiffel Tower Summit',
                description: 'Summit access via priority elevator. Photographers pass included for family portraits.',
                participants: [
                    { label: 'Family C', color: 'bg-indigo-100 text-indigo-700' },
                ],
                statusLabel: 'Limited',
                statusColor: 'text-orange-600 bg-orange-50',
            },
        ],
    },
    {
        time: '01:00',
        period: 'PM',
        splitIcon: 'merge',
        cards: [
            {
                id: 'lunch',
                category: 'Dining',
                categoryColor: 'bg-orange-100',
                categoryTextColor: 'text-orange-700',
                durationLabel: '1.5h',
                title: 'Lunch at Le Nemours',
                description: 'Casual lunch near Palais Royal. Famous croque monsieur for the whole party. Outdoor terrace reserved.',
                participants: [
                    { label: 'Family A', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
                    { label: 'Family B', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
                    { label: 'Family C', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
                ],
                statusLabel: 'Avg. ~$60 per person',
                statusColor: 'text-muted-foreground',
            },
        ],
    },
];

// ─── AI insights ─────────────────────────────────────────────────────────────

const AI_INSIGHTS = [
    { text: 'Preference conflict detected between Family A & C', dot: 'bg-indigo-400' },
    { text: 'Subgroup formed for 2.5h', dot: 'bg-indigo-400' },
    { text: 'Travel overhead reduced by 18%', dot: 'bg-green-500' },
    { text: <>Margin improved by <span className="font-bold text-green-700">+2.4%</span></>, dot: 'bg-green-500' },
];

const PROFIT_INSIGHTS = [
    { text: <>Subgroup routing reduced travel cost by <span className="font-bold text-slate-800">$320</span></>, dot: 'bg-indigo-400' },
    { text: <>Lunch relocation increased margin by <span className="font-bold text-slate-800">1.2%</span></>, dot: 'bg-indigo-400' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SplitIcon({ type }: { type: 'split' | 'merge' }) {
    return (
        <div className={cn(
            'w-4 h-4 rounded-full flex items-center justify-center mt-1.5',
            type === 'split' ? 'bg-indigo-200 text-indigo-500' : 'bg-green-200 text-green-600',
        )}>
            {type === 'split' ? (
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor">
                    <path d="M6 2 L6 6 M6 6 L2 10 M6 6 L10 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
            ) : (
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor">
                    <path d="M2 2 L6 6 M10 2 L6 6 M6 6 L6 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
            )}
        </div>
    );
}

function ActivityCard({ card, isLane }: { card: LaneCard; isLane: boolean }) {
    return (
        <div className={cn(
            'neu-flat rounded-2xl p-5 flex flex-col relative group/card transition-all duration-300 hover:scale-[1.01]',
            isLane
                ? `w-[380px] flex-shrink-0 ${card.laneBorderColor ?? 'border-white'} ${card.laneBgColor ?? ''} border`
                : 'flex-1 border border-white bg-slate-100/20 min-w-[500px]',
        )}>
            {/* Drag handle */}
            <div className="absolute top-4 right-4 text-muted-foreground/30 cursor-grab">
                <GripVertical className="w-4 h-4" />
            </div>

            {/* Badge row */}
            <div className="flex justify-between items-start mb-2 pr-6">
                <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase', card.categoryColor, card.categoryTextColor)}>
                    {card.category}
                </span>
                <span className={cn('text-[10px] font-bold uppercase', card.durationColor ?? 'text-muted-foreground')}>
                    {card.durationLabel}
                </span>
            </div>

            {/* Title */}
            <div className="flex-1">
                <h4 className="font-[Outfit] text-base font-bold text-foreground">{card.title}</h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">{card.description}</p>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {card.participants.length > 1 && (
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight mr-1">Participants:</span>
                    )}
                    {card.participants.map((p) => (
                        <span key={p.label} className={cn('px-2 py-0.5 rounded text-[9px] font-bold', p.color)}>
                            {p.label}
                        </span>
                    ))}
                </div>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded shrink-0', card.statusColor)}>
                    {card.statusLabel}
                </span>
            </div>
        </div>
    );
}

// ─── Floating Panel ───────────────────────────────────────────────────────────

function FloatingPanel({
    title,
    icon,
    isOpen,
    onToggle,
    children,
    position,
}: {
    title: React.ReactNode;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    position: 'left' | 'right';
}) {
    return (
        <div className={cn(
            'absolute bottom-6 z-[60] w-[380px] neu-card rounded-3xl border border-white/60 shadow-2xl transition-all duration-300',
            position === 'left' ? 'left-6' : 'right-6',
        )}>
            {/* Panel header */}
            <div className={cn('flex items-center justify-between p-5', isOpen ? 'pb-4' : '')}>
                <div className="flex items-center gap-3">
                    {icon}
                    <h3 className="font-[Outfit] font-bold text-foreground text-base">{title}</h3>
                </div>
                <button
                    onClick={onToggle}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-black/5"
                >
                    {isOpen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            {/* Panel body */}
            {isOpen && (
                <div className="px-5 pb-5 space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ItineraryDetailViewProps {
    trip: {
        id: string;
        title: string;
        client: string;
        dateRange: string;
        budget: string;
    };
    onBack: () => void;
}

export default function ItineraryDetailView({ trip, onBack }: ItineraryDetailViewProps) {
    const [aiOpen, setAiOpen] = useState(true);
    const [profitOpen, setProfitOpen] = useState(true);
    const [aiInput, setAiInput] = useState('');

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative bg-background h-full">

            {/* ── Sticky top bar ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm z-40 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="neu-button w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="font-[Outfit] font-bold text-lg text-foreground leading-tight">{trip.title}</h2>
                        <p className="text-xs text-muted-foreground">Client: {trip.client} · {trip.dateRange}</p>
                    </div>
                </div>

                {/* Summary numbers */}
                <div className="flex items-center gap-6 neu-flat rounded-2xl px-5 py-2.5 border border-white">
                    <div className="flex flex-col border-r border-slate-200 pr-5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Total Rev.</span>
                        <span className="text-sm font-bold text-foreground leading-tight">$12,450</span>
                    </div>
                    <div className="flex flex-col border-r border-slate-200 pr-5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Est. Cost</span>
                        <span className="text-sm font-bold text-muted-foreground leading-tight">$9,820</span>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Profit Margin</span>
                            <span className="text-[9px] font-bold px-1.5 rounded bg-green-100 text-green-700">+2.4%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-green-600 leading-tight">21.1%</span>
                            <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-[21%]" />
                            </div>
                        </div>
                    </div>
                    <button className="ml-2 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-80 transition-opacity flex items-center gap-1.5 shrink-0">
                        <span className="text-[13px]">💾</span> Save
                    </button>
                </div>
            </div>

            {/* ── Timeline ─────────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto pb-52 scrollbar-hide">

                {TIMELINE_ROWS.map((row) => {
                    const isMultiLane = row.cards.length > 1;

                    return (
                        <div
                            key={row.time}
                            className="flex border-b border-slate-200 min-h-[180px]"
                        >
                            {/* Time column */}
                            <div className="w-24 shrink-0 sticky left-0 flex flex-col items-center justify-center border-r border-slate-300 bg-background/70 z-30 backdrop-blur-sm gap-1">
                                <span className={cn(
                                    'text-sm font-bold font-[JetBrains_Mono,monospace]',
                                    row.splitIcon === 'split' ? 'text-indigo-600' : 'text-foreground',
                                )}>
                                    {row.time}
                                </span>
                                <span className={cn(
                                    'text-[10px] font-bold uppercase',
                                    row.splitIcon === 'split' ? 'text-indigo-400' : 'text-muted-foreground',
                                )}>
                                    {row.period}
                                </span>
                                {row.splitIcon && <SplitIcon type={row.splitIcon} />}
                            </div>

                            {/* Cards area */}
                            <div className={cn(
                                'flex-1 p-4 pl-10 flex gap-5',
                                isMultiLane ? 'overflow-x-auto' : '',
                            )}>
                                {row.cards.map((card) => (
                                    <ActivityCard key={card.id} card={card} isLane={isMultiLane} />
                                ))}

                                {/* Add lane button for multi-lane rows */}
                                {isMultiLane && (
                                    <button className="w-16 shrink-0 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center hover:bg-white/60 transition-colors group/add">
                                        <Plus className="w-5 h-5 text-muted-foreground/40 group-hover/add:text-muted-foreground transition-colors" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Floating Panels ───────────────────────────────────────────────────── */}

            {/* Profit Impact (bottom-left) */}
            <FloatingPanel
                position="left"
                title="Profit Impact"
                icon={
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                        +2.4%
                    </span>
                }
                isOpen={profitOpen}
                onToggle={() => setProfitOpen((p) => !p)}
            >
                {/* Big number */}
                <div>
                    <div className="flex items-end gap-2 mb-1">
                        <span className="text-4xl font-bold text-foreground leading-none tracking-tight font-[Outfit]">21.1%</span>
                        <TrendingUp className="w-6 h-6 text-green-500 mb-1" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                        Previous:{' '}
                        <span className="line-through text-muted-foreground/60">18.7%</span>
                        <span className="mx-1">→</span>
                        <span className="text-green-600 font-bold">Now: 21.1%</span>
                    </p>
                </div>

                {/* AI insights box */}
                <div className="neu-pressed rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">AI Insights</span>
                    </div>
                    <ul className="space-y-2">
                        {PROFIT_INSIGHTS.map((item, i) => (
                            <li key={i} className="flex gap-2 items-start text-[11px] text-muted-foreground leading-tight">
                                <span className={cn('w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0', item.dot)} />
                                {item.text}
                            </li>
                        ))}
                    </ul>
                </div>
            </FloatingPanel>

            {/* VoyageurAI (bottom-right) */}
            <FloatingPanel
                position="right"
                title="Voyageur AI"
                icon={
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                }
                isOpen={aiOpen}
                onToggle={() => setAiOpen((p) => !p)}
            >
                {/* Latest optimization */}
                <div className="neu-pressed rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                        <Zap className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-[10px] uppercase font-bold text-purple-500 tracking-wider">Latest Optimization</span>
                    </div>
                    <ul className="space-y-2">
                        {AI_INSIGHTS.map((item, i) => (
                            <li key={i} className="flex gap-2 items-start text-[11px] text-muted-foreground leading-tight">
                                <span className={cn('w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0', item.dot)} />
                                {item.text}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Chat input */}
                <div className="relative">
                    <input
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setAiInput(''); }}
                        placeholder="Ask follow-up question..."
                        className="w-full neu-pressed rounded-xl py-3 px-4 text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none border-none bg-transparent"
                    />
                    <button
                        onClick={() => setAiInput('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-indigo-500 hover:bg-black/5 transition-colors"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </FloatingPanel>
        </div>
    );
}
