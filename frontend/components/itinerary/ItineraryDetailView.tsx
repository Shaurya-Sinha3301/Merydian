'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, TrendingUp, Sparkles, ChevronUp, ChevronDown,
    Zap, MessageSquare, Send, GripVertical, Plus, Minimize2,
    Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTripById } from '@/lib/trips';

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
    onMouseEnter,
    onMouseLeave,
}: {
    title: React.ReactNode;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    position: 'left' | 'right';
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}) {
    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={cn(
                // fixed keeps the panel anchored to the viewport bottom regardless of scroll
                'fixed bottom-6 z-[60] w-[calc(50vw-220px)] min-w-[320px] max-w-[440px] neu-card rounded-3xl border border-white/60 shadow-2xl transition-all duration-300',
                position === 'left' ? 'left-[calc(256px+24px)]' : 'right-6',
            )}
        >
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
    /** The trip's ID from the URL param (e.g. "TR-8821") */
    tripId: string;
}

export default function ItineraryDetailView({ tripId }: ItineraryDetailViewProps) {
    const router = useRouter();
    const trip = getTripById(tripId);

    const [activePanel, setActivePanel] = useState<'profit' | 'ai' | null>('ai');
    const [activeTab, setActiveTab] = useState<'optimization' | 'groups' | 'bookings'>('optimization');
    const [aiInput, setAiInput] = useState('');
    const [panelHovered, setPanelHovered] = useState(false);

    // ── Guard: trip not found ───────────────────────────────────────────
    if (!trip) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <p className="font-[Outfit] font-bold text-xl text-foreground">Trip not found</p>
                <p className="text-sm text-muted-foreground">No trip with ID “{tripId}” exists.</p>
                <button
                    onClick={() => router.push('/agent-dashboard/itinerary-management')}
                    className="neu-button px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 text-muted-foreground"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Itineraries
                </button>
            </div>
        );
    }

    // ── Chat state ─────────────────────────────────────────────────────────────

    type ChatMessage = { role: 'ai' | 'user'; text: string; time: string };

    // Locale-neutral format — always HH:MM, no locale mismatch between SSR and client
    const now = () => new Date().toTimeString().slice(0, 5);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'ai',
            time: '', // populated client-side via useEffect to avoid SSR/hydration mismatch
            text: 'Here’s the latest optimization summary:\n\n• Preference conflict detected between Family A & C\n• Subgroup formed for 2.5h activity slots\n• Travel overhead reduced by 18%\n• Margin improved by +2.4%\n\nAsk me anything about this itinerary!',
        },
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Stamp the seed message time after mount (client-only) to prevent hydration mismatch
    useEffect(() => {
        setMessages((prev) => prev.map((msg, i) => i === 0 ? { ...msg, time: now() } : msg));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, activePanel]);

    const sendMessage = () => {
        const text = aiInput.trim();
        if (!text) return;
        const userMsg: ChatMessage = { role: 'user', text, time: now() };
        setMessages((prev) => [...prev, userMsg]);
        setAiInput('');
        setIsTyping(true);
        // Simulate AI reply after 1.2s
        setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'ai',
                    time: now(),
                    text: `I’m analyzing your request about “${text}”. Based on the current optimization, I recommend reviewing the subgroup allocations for Day 2. Would you like me to run a new optimization pass?`,
                },
            ]);
        }, 1200);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative bg-background h-full">

            {/* ── Sticky top bar ───────────────────────────────────────────────────── */}
            <div className="flex items-center px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm z-40 shrink-0">
                {/* Left: back + trip title */}
                <div className="flex items-center gap-4 w-1/4 min-w-0">
                    <button
                        onClick={() => router.back()}
                        className="neu-button w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <h2 className="font-[Outfit] font-bold text-lg text-foreground leading-tight truncate">{trip.title}</h2>
                        <p className="text-xs text-muted-foreground truncate">Client: {trip.client} · {trip.dateRange}</p>
                    </div>
                </div>

                {/* Centre: tab pill */}
                <div className="flex-1 flex justify-center">
                    <div className="flex items-center bg-background/60 p-1.5 rounded-2xl neu-flat border border-white/60">
                        {(['optimization', 'groups', 'bookings'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    'px-6 py-2 rounded-xl text-sm font-semibold capitalize transition-all',
                                    activeTab === tab
                                        ? 'neu-pressed text-foreground shadow-inner'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/50',
                                )}
                            >
                                {tab === 'optimization' ? 'Optimization' : tab === 'groups' ? 'Groups' : 'Bookings'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right spacer — balances the left column so the pill stays centred */}
                <div className="w-1/4" />
            </div>


            {/* ── Timeline ─────────────────────────────────────────────────────────── */}
            <div className={cn('flex-1 pb-72 scrollbar-hide', panelHovered ? 'overflow-hidden' : 'overflow-auto')}>

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


            {/* ── Floating Panels (bottom-right, only one open at a time) ───────────── */}
            {/*
             *  activePanel === 'profit' → Profit Impact card, VoyageurAI icon pill beside it
             *  activePanel === 'ai'     → VoyageurAI card, Profit Impact icon pill beside it
             *  activePanel === null     → Both collapsed to icon pills side-by-side
             */}
            <div
                className="fixed bottom-6 right-6 z-[60] flex items-end gap-3"
                onMouseEnter={() => setPanelHovered(true)}
                onMouseLeave={() => setPanelHovered(false)}
            >
                {/* Profit Impact icon pill — shown when AI panel is active or both collapsed */}
                {activePanel !== 'profit' && (
                    <button
                        onClick={() => setActivePanel('profit')}
                        className="relative neu-card w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg border border-white/50 shrink-0"
                        title="Open Profit Impact"
                    >
                        <TrendingUp className="w-6 h-6 text-green-500" />
                        <span className="absolute -top-1 -right-1 bg-green-100 border border-green-200 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            +2.4%
                        </span>
                    </button>
                )}

                {/* VoyageurAI icon pill — shown when Profit panel is active or both collapsed */}
                {activePanel !== 'ai' && (
                    <button
                        onClick={() => setActivePanel('ai')}
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white hover:scale-105 transition-all shadow-lg shrink-0"
                        title="Open Voyageur AI"
                    >
                        <MessageSquare className="w-6 h-6" />
                    </button>
                )}

                {/* ── Profit Impact expanded card ── */}
                {activePanel === 'profit' && (
                    <div className="w-[360px] neu-card rounded-3xl border border-white/60 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-[Outfit] font-bold text-foreground text-base">Profit Impact</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">+2.4%</span>
                            </div>
                            <button
                                onClick={() => setActivePanel(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-black/5"
                                title="Minimize"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="px-5 pb-5 space-y-3">
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
                            <div className="grid grid-cols-2 gap-3">
                                <div className="neu-pressed rounded-xl p-3 flex flex-col">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Total Revenue</span>
                                    <span className="text-base font-bold text-foreground font-[Outfit]">$12,450</span>
                                </div>
                                <div className="neu-pressed rounded-xl p-3 flex flex-col">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Est. Cost</span>
                                    <span className="text-base font-bold text-muted-foreground font-[Outfit]">$9,820</span>
                                </div>
                            </div>
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
                        </div>
                    </div>
                )}

                {/* ── VoyageurAI chatbot expanded card ── */}
                {activePanel === 'ai' && (
                    <div className="w-[360px] max-h-[78vh] neu-card rounded-3xl border border-white/60 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                                    <MessageSquare className="w-4 h-4" />
                                </div>
                                <h3 className="font-[Outfit] font-bold text-foreground text-base">Voyageur AI</h3>
                                {isTyping && (
                                    <span className="flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setActivePanel(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-black/5"
                                title="Minimize"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 pb-2 scrollbar-hide space-y-3 min-h-0">
                            {messages.map((msg, i) => (
                                <div key={i} className={cn('flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                    <div className={cn(
                                        'px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed max-w-[88%] whitespace-pre-line',
                                        msg.role === 'ai'
                                            ? 'neu-pressed text-foreground rounded-tl-sm'
                                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm shadow-md',
                                    )}>
                                        {msg.text}
                                    </div>
                                    <span suppressHydrationWarning className="text-[9px] text-muted-foreground/60 px-1">{msg.time}</span>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex items-start">
                                    <div className="neu-pressed px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="px-4 pb-4 pt-2 shrink-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                    placeholder="Ask Voyageur AI..."
                                    className="w-full neu-pressed rounded-xl py-3 pl-4 pr-10 text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none border-none bg-transparent"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!aiInput.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-indigo-500 hover:bg-black/5 transition-colors disabled:opacity-30"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Approve / Reject floating bar — bottom-centre ───────────────────────── */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3">
                <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-semibold text-sm neu-card hover:bg-red-100 hover:scale-[1.03] transition-all shadow-lg">
                    <span className="text-base">✕</span> Reject
                </button>
                <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm neu-card hover:bg-green-100 hover:scale-[1.03] transition-all shadow-lg">
                    <span className="text-base">✓</span> Approve
                </button>
            </div>
        </div>
    );
}
