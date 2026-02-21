'use client';

/**
 * VoyageurAIPanel — shared floating AI assistant across all itinerary views.
 *
 * Props:
 *   context      — flavour text shown in the insight card (per-page)
 *   insightTag   — badge label (e.g. "HIGH SATISFACTION", "ACTIVE ALERTS")
 *   insightBody  — ReactNode displayed below the tag
 *   inputPlaceholder — input field hint text
 *   open / onOpenChange — controlled open state
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Voyageur Logo ────────────────────────────────────────────────────────────
// A custom compass-rose SVG unique to Voyageur AI.

export function VoyageurLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {/* Outer ring */}
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" />
            {/* North/South points */}
            <path d="M12 2 L13.5 9 L12 7 L10.5 9 Z" fill="currentColor" opacity="0.9" />
            <path d="M12 22 L10.5 15 L12 17 L13.5 15 Z" fill="currentColor" opacity="0.4" />
            {/* East/West points */}
            <path d="M22 12 L15 10.5 L17 12 L15 13.5 Z" fill="currentColor" opacity="0.6" />
            <path d="M2 12 L9 13.5 L7 12 L9 10.5 Z" fill="currentColor" opacity="0.6" />
            {/* Center dot */}
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiMessage {
    role: 'user' | 'ai';
    text: string;
    time: string;
}

interface VoyageurAIPanelProps {
    /** Whether the panel is open */
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The bold tag shown in the AI insight card */
    insightTag: string;
    insightTagColor?: string;   // tailwind bg+text combo, e.g. 'bg-indigo-50 text-indigo-700 border-indigo-200'
    /** Content rendered under the insight tag */
    insightBody: React.ReactNode;
    /** Optional CTA button in the insight card */
    insightCTA?: { label: string; onClick?: () => void };
    /** Placeholder for the chat input */
    inputPlaceholder?: string;
    /** Seed message from AI (shown once on mount) */
    seedMessage?: string;
    /** AI reply generator — receives user text, returns AI response string */
    getAIReply?: (userText: string) => string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoyageurAIPanel({
    open,
    onOpenChange,
    insightTag,
    insightTagColor = 'bg-stone-100 text-stone-700 border-stone-200',
    insightBody,
    insightCTA,
    inputPlaceholder = 'Ask Voyageur AI...',
    seedMessage,
    getAIReply,
}: VoyageurAIPanelProps) {
    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [typing, setTyping] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    useEffect(() => {
        if (seedMessage) {
            setMessages([{ role: 'ai', text: seedMessage, time: now() }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const send = () => {
        const text = inputText.trim();
        if (!text) return;
        setMessages(prev => [...prev, { role: 'user', text, time: now() }]);
        setInputText('');
        setTyping(true);
        setTimeout(() => {
            setTyping(false);
            const reply = getAIReply
                ? getAIReply(text)
                : `Analyzing: "${text}". I'll review the current itinerary data and get back to you.`;
            setMessages(prev => [...prev, { role: 'ai', text: reply, time: now() }]);
        }, 1300);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[60] flex items-end gap-3">
            {/* ── Collapsed button ── */}
            {!open && (
                <button
                    onClick={() => onOpenChange(true)}
                    title="Open Voyageur AI"
                    className="w-12 h-12 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-700 transition-all hover:scale-105 group relative"
                >
                    <VoyageurLogo className="w-5 h-5" />
                </button>
            )}

            {/* ── Expanded panel ── */}
            {open && (
                <div className="w-[340px] max-h-[72vh] bg-[#faf9f6] border border-stone-300 shadow-2xl rounded-xl flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 shrink-0 bg-white">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center text-white shrink-0">
                                <VoyageurLogo className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-stone-800 block leading-tight">Voyageur AI</span>
                                <span className="text-[9px] text-stone-400 font-medium tracking-wider">v2 · Precision Intelligence</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-stone-200 rounded-full shadow-sm">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wide">Live</span>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                                title="Minimise"
                            >
                                <Minimize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Insight card */}
                    <div className="m-3 mb-0 bg-white border border-stone-200 rounded-lg p-3.5 shrink-0 shadow-sm">
                        <div className="mb-2.5 border-b border-stone-100 pb-2">
                            <span className={cn(
                                'text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                                insightTagColor
                            )}>
                                {insightTag}
                            </span>
                        </div>
                        <div className="text-xs leading-relaxed text-stone-600">
                            {insightBody}
                        </div>
                        {insightCTA && (
                            <button
                                onClick={insightCTA.onClick}
                                className="w-full mt-3 py-2 bg-stone-800 hover:bg-stone-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                            >
                                <Send className="w-3 h-3" />
                                {insightCTA.label}
                            </button>
                        )}
                    </div>

                    {/* Chat messages */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pt-3 pb-1 space-y-3 min-h-[60px]">
                        {messages.map((msg, i) => (
                            <div key={i} className={cn('flex flex-col gap-0.5', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                <div className={cn(
                                    'px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[90%]',
                                    msg.role === 'ai'
                                        ? 'bg-white border border-stone-200 text-stone-700 rounded-tl-sm'
                                        : 'bg-stone-800 text-white rounded-tr-sm'
                                )}>
                                    {msg.text}
                                </div>
                                <span className="text-[9px] text-stone-400 px-1 font-mono">{msg.time}</span>
                            </div>
                        ))}
                        {typing && (
                            <div className="flex items-start">
                                <div className="bg-white border border-stone-200 px-3 py-2.5 rounded-xl rounded-tl-sm flex gap-1 items-center shadow-sm">
                                    {[0, 150, 300].map(d => (
                                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 pb-3 pt-2 shrink-0 border-t border-stone-100 bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') send(); }}
                                placeholder={inputPlaceholder}
                                className="flex-1 bg-stone-50 border border-stone-200 rounded-lg py-2 pl-3 pr-3 text-xs text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 transition-all"
                            />
                            <button
                                onClick={send}
                                disabled={!inputText.trim()}
                                className="w-8 bg-stone-800 text-white rounded-lg flex items-center justify-center hover:bg-stone-700 transition-colors disabled:opacity-30 shrink-0"
                            >
                                <Send className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
