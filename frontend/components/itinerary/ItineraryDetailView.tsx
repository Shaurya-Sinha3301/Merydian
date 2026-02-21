'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, TrendingUp, ChevronDown, ChevronUp,
    Send, GripVertical, Minimize2, Check, X, Terminal,
    Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTripById } from '@/lib/trips';

// ─── Types ────────────────────────────────────────────────────────────────────

type LaneCard = {
    id: string;
    evtId: string;
    category: string;
    categoryBorder: string;
    categoryBg: string;
    categoryText: string;
    locationCode: string;           // e.g. PARIS_06
    durationLabel: string;          // e.g. 1H 00M
    durationColor: string;
    title: string;
    subtitle?: string;              // e.g. "Richelieu Wing"
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

const AI_LOG = [
    { color: 'text-indigo-600', text: 'Conflict resolved: FAM_A vs FAM_C overlap.' },
    { color: 'text-indigo-600', text: 'Split-path generated: 2.5H duration.' },
    { color: 'text-emerald-600', text: <>Overhead reduction: <span className="text-emerald-700 font-bold">18%</span> verified.</> },
    { color: 'text-emerald-600', text: <>Margin impact: <span className="text-emerald-700 font-bold">+2.4%</span> applied.</> },
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
            'tech-card flex flex-row group/card relative transition-all duration-200 hover:translate-x-0.5 hover:shadow-md items-stretch',
            compact ? 'min-w-[440px] w-[480px]' : 'min-w-[640px] flex-1',
        )}>
            {/* Drag handle */}
            <div className="absolute top-0 right-0 p-1.5 text-slate-300 hover:text-slate-500 cursor-grab z-10 bg-white/80 backdrop-blur-sm">
                <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Image thumbnail */}
            <div className={cn(
                'relative border-r border-slate-200 bg-slate-100 flex-shrink-0 overflow-hidden',
                compact ? 'w-20' : 'w-[72px] h-full min-h-[80px]',
            )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-full object-cover grayscale group-hover/card:grayscale-0 transition-all duration-500 opacity-90 group-hover/card:opacity-100"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/5" />
                <div className="absolute bottom-1 left-1 bg-black/80 text-white text-[7px] px-1 py-px font-mono leading-none">
                    {card.locationCode}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-3 flex flex-col justify-center gap-1.5 min-w-0 pr-8">
                {/* Top row: title + duration + participants */}
                <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight leading-tight">
                                {card.title}
                            </h4>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0">{card.evtId}</span>
                            <span className={cn(
                                'px-1 py-px border text-[8px] font-bold uppercase tracking-wider rounded-sm shrink-0',
                                card.categoryBorder, card.categoryBg, card.categoryText,
                            )}>
                                {card.category}
                            </span>
                        </div>
                        {card.subtitle && (
                            <span className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">{card.subtitle}</span>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn('text-[10px] font-mono font-medium', card.durationColor)}>
                            {card.durationLabel}
                        </span>
                        <div className="flex items-center gap-0.5 flex-wrap justify-end">
                            {card.participants.map((p) => (
                                <span
                                    key={p.code}
                                    className={cn(
                                        'px-1.5 py-0.5 border rounded text-[8px] font-bold font-mono',
                                        p.color,
                                    )}
                                >
                                    {p.code}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom row: description + status */}
                <div className="flex justify-between items-center gap-2">
                    <p className="text-[10px] text-slate-500 font-mono leading-tight truncate flex-1">
                        {card.description}
                    </p>
                    <div className={cn(
                        'flex items-center gap-1 shrink-0',
                        card.statusIcon === 'confirmed' ? 'text-emerald-600' :
                            card.statusIcon === 'limited' ? 'text-orange-500' : 'text-slate-500',
                    )}>
                        {card.statusIcon === 'confirmed' && <Check className="w-3 h-3" />}
                        <span className="text-[9px] font-bold uppercase tracking-wider font-mono">
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

    const [aiOpen, setAiOpen] = useState(true);
    const [profitOpen, setProfitOpen] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [panelHovered, setPanelHovered] = useState(false);

    // ── Guard ───────────────────────────────────────────────────────────────
    if (!trip) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <p className="font-bold text-xl text-[var(--bp-text)]">Trip not found</p>
                <p className="text-sm text-[var(--bp-muted)]">No trip with ID "{tripId}" exists.</p>
                <Link
                    href="/agent-dashboard/itinerary-management"
                    className="bp-card px-5 py-2 text-sm font-semibold flex items-center gap-2 no-underline text-[var(--bp-text)] hover:border-black transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Itineraries
                </Link>
            </div>
        );
    }

    // ── Chat state ──────────────────────────────────────────────────────────
    type ChatMsg = { role: 'ai' | 'user'; text: string; time: string };
    const now = () => new Date().toTimeString().slice(0, 5);
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Seed message client-side to avoid SSR mismatch
    useEffect(() => {
        setMessages([{
            role: 'ai',
            time: now(),
            text: 'Optimization complete. Conflict resolved for FAM_A & FAM_C. Margin improved +2.4%. Ask me anything.',
        }]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const sendMessage = () => {
        const text = aiInput.trim();
        if (!text) return;
        setMessages((prev) => [...prev, { role: 'user', text, time: now() }]);
        setAiInput('');
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'ai',
                    time: now(),
                    text: `Analyzing: "${text}". Recommend reviewing Day 2 subgroup allocations. Run new optimization pass?`,
                },
            ]);
        }, 1200);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative h-full bp-grid-bg bg-white">

            {/* ── Timeline ──────────────────────────────────────────────────────── */}
            <div className={cn(
                'flex-1 scrollbar-hide pb-28 bg-white/60 backdrop-blur-sm',
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

                {/* Rows */}
                {TIMELINE_ROWS.map((row) => {
                    const isMulti = row.cards.length > 1;
                    return (
                        <div
                            key={row.time}
                            className={cn(
                                'flex border-b border-slate-200 min-h-[100px] group/row relative',
                                isMulti ? 'bg-slate-50/50' : 'bg-white',
                            )}
                        >
                            {/* Time column */}
                            <div className="w-20 shrink-0 sticky left-0 flex flex-col items-center py-4 border-r border-slate-200 bg-white z-30">
                                <span className={cn(
                                    'text-sm font-bold font-mono',
                                    row.splitIcon === 'split' ? 'text-indigo-600' : 'text-slate-900',
                                )}>
                                    {row.time}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-mono">
                                    {row.period}
                                </span>
                                {row.splitIcon && <SplitMergeIcon type={row.splitIcon} />}
                            </div>

                            {/* Cards area */}
                            <div className={cn(
                                'flex-1 p-3 pl-8',
                                isMulti ? 'flex gap-4 overflow-x-auto scrollbar-hide items-start' : '',
                            )}>
                                {row.cards.map((card) => (
                                    <ActivityCard key={card.id} card={card} compact={isMulti} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Floating panels ────────────────────────────────────────────────── */}
            <div
                className="fixed bottom-6 right-6 z-[60] flex items-end gap-3"
                onMouseEnter={() => setPanelHovered(true)}
                onMouseLeave={() => setPanelHovered(false)}
            >
                {/* Profit impact pill */}
                {!profitOpen && (
                    <button
                        onClick={() => { setProfitOpen(true); setAiOpen(false); }}
                        className="relative w-10 h-10 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center hover:border-emerald-400 transition-colors group"
                        title="Open Profit Impact"
                    >
                        <TrendingUp className="w-4 h-4 text-slate-600 group-hover:text-emerald-600 transition-colors" />
                        <div className="absolute -top-1.5 -left-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[8px] font-bold px-1 py-px rounded shadow-sm font-mono">
                            +2.4%
                        </div>
                    </button>
                )}

                {/* Profit Impact expanded */}
                {profitOpen && (
                    <div className="w-[320px] bg-white border border-slate-300 shadow-2xl shadow-slate-200/50 flex flex-col">
                        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest font-mono">Profit Impact</span>
                                <span className="text-[9px] font-bold px-1 py-px bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono">+2.4%</span>
                            </div>
                            <button onClick={() => setProfitOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors">
                                <Minimize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-3 border border-slate-200 divide-x divide-slate-200">
                                <div className="px-3 py-2 flex flex-col">
                                    <span className="text-[8px] uppercase font-bold text-slate-400 font-mono tracking-wider">Revenue</span>
                                    <span className="text-xs font-bold text-slate-800 font-mono">$12,450</span>
                                </div>
                                <div className="px-3 py-2 flex flex-col">
                                    <span className="text-[8px] uppercase font-bold text-slate-400 font-mono tracking-wider">Cost</span>
                                    <span className="text-xs font-bold text-slate-600 font-mono">$9,820</span>
                                </div>
                                <div className="px-3 py-2 flex flex-col">
                                    <span className="text-[8px] uppercase font-bold text-slate-400 font-mono tracking-wider">Margin</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-emerald-600 font-mono">21.1%</span>
                                        <div className="w-8 h-1 bg-slate-200">
                                            <div className="h-full bg-emerald-500 w-[21%]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-2 space-y-1">
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono pb-1 border-b border-slate-200">AI Insights</div>
                                <ul className="space-y-1">
                                    {[
                                        <><span className="font-bold text-slate-700">$320</span> saved via subgroup routing</>,
                                        <>Lunch relocation improved margin by <span className="font-bold text-slate-700">1.2%</span></>,
                                    ].map((t, i) => (
                                        <li key={i} className="flex gap-1.5 items-start text-[9px] text-slate-600 font-mono">
                                            <span className="text-indigo-500 mt-0.5">{'>'}</span>
                                            <span>{t}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Voyageur AI terminal panel ── */}
                {aiOpen ? (
                    <div className="w-[340px] bg-white border border-slate-300 shadow-2xl shadow-slate-200/50 flex flex-col max-h-[70vh]">
                        {/* Header */}
                        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse shadow-sm shadow-indigo-300" />
                                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest font-mono">
                                    VOYAGEUR_AI // v2.0
                                </span>
                            </div>
                            <button
                                onClick={() => setAiOpen(false)}
                                className="text-slate-400 hover:text-slate-800 transition-colors"
                            >
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Optimization log */}
                        <div className="shrink-0 m-3 mb-0 bg-slate-50 border border-slate-200 p-2">
                            <div className="flex items-center gap-1.5 mb-1.5 border-b border-slate-200 pb-1">
                                <Terminal className="w-3 h-3 text-indigo-600" />
                                <span className="text-[9px] uppercase font-bold text-indigo-700 font-mono">Optimization Log</span>
                            </div>
                            <ul className="space-y-0.5">
                                {AI_LOG.map((item, i) => (
                                    <li key={i} className="flex gap-1.5 items-start text-[9px] text-slate-600 font-mono">
                                        <span className={cn('mt-0.5 shrink-0', item.color)}>{'>'}</span>
                                        <span>{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Chat messages */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pt-2 pb-1 space-y-2 min-h-0">
                            {messages.map((msg, i) => (
                                <div key={i} className={cn('flex flex-col gap-0.5', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                    <div className={cn(
                                        'px-3 py-2 text-[10px] leading-relaxed max-w-[88%] font-mono',
                                        msg.role === 'ai'
                                            ? 'bg-slate-50 border border-slate-200 text-slate-700'
                                            : 'bg-slate-900 text-white',
                                    )}>
                                        {msg.text}
                                    </div>
                                    <span suppressHydrationWarning className="text-[8px] text-slate-400 font-mono px-1">{msg.time}</span>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex items-start">
                                    <div className="bg-slate-50 border border-slate-200 px-3 py-2 flex gap-1 items-center">
                                        {[0, 150, 300].map((d) => (
                                            <span
                                                key={d}
                                                className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                                                style={{ animationDelay: `${d}ms` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="px-3 pb-3 pt-2 shrink-0">
                            <div className="relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-600 group-focus-within:bg-indigo-400 transition-colors" />
                                <input
                                    type="text"
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                    placeholder="Input command or query..."
                                    className="w-full bg-slate-50 border border-slate-200 border-l-0 py-2 pl-2 pr-8 text-[10px] text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white font-mono"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!aiInput.trim()}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-30"
                                >
                                    <Send className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Status footer */}
                        <div className="bg-slate-100 px-3 py-1 flex justify-between items-center text-[8px] text-slate-500 font-mono border-t border-slate-200 shrink-0">
                            <div className="flex items-center gap-1">
                                <Wifi className="w-2.5 h-2.5" />
                                <span>SYS: ONLINE</span>
                            </div>
                            <span>LATENCY: 12ms</span>
                        </div>
                    </div>
                ) : (
                    /* AI collapsed pill */
                    <button
                        onClick={() => { setAiOpen(true); setProfitOpen(false); }}
                        className="w-10 h-10 bg-slate-900 border border-slate-900 text-white flex items-center justify-center hover:bg-slate-700 transition-colors shadow-md"
                        title="Open Voyageur AI"
                    >
                        <Terminal className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* ── Approve / Reject — bottom center ─────────────────────────────── */}
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
