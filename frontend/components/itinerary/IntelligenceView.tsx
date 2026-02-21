'use client';

import { LayoutGrid, TrendingUp, Grid3x3, Radar, LineChart, Settings2 } from 'lucide-react';

// ─── IntelligenceView ─────────────────────────────────────────────────────────
// Implements the "Intelligence" dashboard (see stitch_voyageur/inteli.html).
// Styling follows the blueprint design language used in ItineraryOptimizerWindow:
//   bp-grid-bg, bp-card, bp-label, var(--bp-*) tokens, Space Mono + Inter.

export default function IntelligenceView() {
    return (
        <div className="flex h-full bp-grid-bg bg-white overflow-hidden">

            {/* ══ LEFT — Analysis Section ════════════════════════════════════ */}
            <div className="flex-1 overflow-y-auto scrollbar-thin-black px-6 md:px-8 py-6 min-w-0">

                {/* Section label */}
                <p className="bp-label mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                    Analysis
                </p>

                {/* ── Row 1 ─── Treemap  +  Area chart ─────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                    {/* Category Spend Distribution */}
                    <div className="bp-card p-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="bp-label flex items-center gap-1.5 mb-0">
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Category Spend Distribution
                            </span>
                            <span className="text-[9px] font-mono text-[var(--bp-muted)]">Q3-2024</span>
                        </div>
                        {/* Treemap */}
                        <div className="grid gap-0.5 border border-black" style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', height: '150px', background: '#000', padding: '2px' }}>
                            <div className="bg-white p-2 flex flex-col justify-between hover:bg-gray-50 transition-colors" style={{ gridRow: 'span 2' }}>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--bp-text)]">Flight Logistics</span>
                                <div className="text-right">
                                    <span className="block text-lg font-mono font-bold text-[var(--bp-text)]">45%</span>
                                    <span className="text-[8px] text-[var(--bp-muted)]">$45.2k</span>
                                </div>
                            </div>
                            <div className="bg-white p-1.5 flex flex-col justify-between hover:bg-gray-50 transition-colors">
                                <span className="text-[8px] font-bold uppercase tracking-wider text-gray-600">Accommodation</span>
                                <div className="text-right">
                                    <span className="block text-xs font-mono font-bold text-[var(--bp-text)]">30%</span>
                                    <span className="text-[7px] text-[var(--bp-muted)]">$30.1k</span>
                                </div>
                            </div>
                            <div className="bg-white p-1.5 flex flex-col justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between w-full">
                                    <span className="text-[7px] font-bold uppercase tracking-wider text-gray-500">Services</span>
                                    <span className="text-[7px] font-bold uppercase tracking-wider text-gray-500">Misc</span>
                                </div>
                                <div className="flex justify-between w-full items-end">
                                    <span className="text-[10px] font-mono font-bold text-[var(--bp-text)]">15%</span>
                                    <span className="text-[10px] font-mono font-bold text-[var(--bp-text)] border-l border-gray-200 pl-1">10%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Financial Flux */}
                    <div className="bp-card p-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="bp-label flex items-center gap-1.5 mb-0">
                                <LineChart className="w-3.5 h-3.5" />
                                Daily Financial Flux
                            </span>
                            <div className="flex gap-1.5">
                                <span className="text-[9px] font-mono px-1 border border-black bg-black text-white">D</span>
                                <span className="text-[9px] font-mono px-1 border border-gray-200 text-gray-400">W</span>
                                <span className="text-[9px] font-mono px-1 border border-gray-200 text-gray-400">M</span>
                            </div>
                        </div>
                        <div className="h-[150px] w-full relative border-b border-l border-black">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3].map(i => <div key={i} className="w-full border-t border-dashed border-gray-200" />)}
                            </div>
                            <svg className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <path d="M0,80 Q10,75 20,60 T40,55 T60,40 T80,45 T100,20 V100 H0 Z" fill="rgba(0,0,0,0.05)" stroke="black" strokeWidth="1.5" />
                                <circle cx="20" cy="60" r="1.5" fill="black" />
                                <circle cx="60" cy="40" r="1.5" fill="black" />
                                <circle cx="100" cy="20" r="2" fill="red" stroke="white" strokeWidth="0.5" />
                            </svg>
                            <div className="absolute -bottom-5 w-full flex justify-between text-[8px] font-mono text-gray-400">
                                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Row 2 ─── Heatmap  +  Velocity  +  Radar ─────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Margin Efficiency */}
                    <div className="bp-card p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <span className="bp-label flex items-center gap-1.5 mb-0">
                                <Grid3x3 className="w-3.5 h-3.5" />
                                Margin Efficiency
                            </span>
                            <span className="text-[8px] font-mono text-[var(--bp-muted)] border border-gray-200 px-1">HM-01</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="grid grid-cols-4 gap-px border border-gray-200" style={{ background: '#eee' }}>
                                {[
                                    { code: 'JP', opacity: 0.9 }, { code: 'UK', opacity: 0.8 }, { code: 'US', opacity: 0.4 }, { code: 'IT', opacity: 0.2 },
                                    { code: 'FR', opacity: 0.7 }, { code: 'DE', opacity: 0.95 }, { code: 'ES', opacity: 0.3 }, { code: 'PT', opacity: 0.1 },
                                    { code: 'CN', opacity: 0.5 }, { code: 'SG', opacity: 0.6 }, { code: 'TH', opacity: 0.2 }, { code: 'VN', opacity: 0.05 },
                                    { code: 'AU', opacity: 0.85 }, { code: 'NZ', opacity: 0.75 }, { code: 'CA', opacity: 0.15 }, { code: 'MX', opacity: 0 },
                                ].map(({ code, opacity }) => (
                                    <div key={code} className="aspect-square flex items-center justify-center font-mono text-[9px] hover:opacity-80 transition-opacity"
                                        style={{ background: opacity === 0 ? 'white' : `rgba(0,0,0,${opacity})`, color: opacity > 0.4 ? 'white' : 'black' }}>
                                        {code}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-[7px] font-mono text-[var(--bp-muted)] uppercase tracking-wider mt-2">
                                <span>Lo Margin</span>
                                <div className="h-1 w-16 bg-gradient-to-r from-white via-gray-400 to-black border border-gray-200" />
                                <span>Hi Margin</span>
                            </div>
                        </div>
                    </div>

                    {/* Booking Velocity */}
                    <div className="bp-card p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <span className="bp-label flex items-center gap-1.5 mb-0">
                                <TrendingUp className="w-3.5 h-3.5" />
                                Booking Velocity
                            </span>
                            <span className="text-[9px] font-mono text-green-600">+12%</span>
                        </div>
                        <div className="flex-1 relative border border-gray-200 bg-gray-50/50 min-h-[100px]">
                            <svg className="w-full h-full absolute inset-0 p-2 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <polyline fill="none" points="0,70 20,65 40,60 60,62 80,55 100,50" stroke="#ccc" strokeDasharray="2,2" strokeWidth="1.5" />
                                <polyline fill="none" points="0,80 20,70 40,55 60,40 80,35 100,20" stroke="black" strokeWidth="2" />
                                {[[20, 70], [40, 55], [60, 40], [80, 35]].map(([cx, cy]) => (
                                    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill="black" />
                                ))}
                                <circle cx="100" cy="20" r="2.5" fill="black" stroke="white" strokeWidth="1" />
                            </svg>
                        </div>
                        <div className="flex justify-between mt-2 text-[8px] font-mono text-gray-400">
                            <span>PREV</span><span>NOW</span>
                        </div>
                        <div className="mt-1.5 text-[8px] font-mono text-[var(--bp-muted)] border-t border-gray-100 pt-2">
                            <span className="text-black font-bold">AVG:</span> 42/hr <span className="mx-1">|</span> <span className="text-black font-bold">PEAK:</span> 15:00
                        </div>
                    </div>

                    {/* Sentiment Index */}
                    <div className="bp-card p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <span className="bp-label flex items-center gap-1.5 mb-0">
                                <Radar className="w-3.5 h-3.5" />
                                Sentiment Index
                            </span>
                        </div>
                        <div className="flex-1 relative flex items-center justify-center">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f0f0f0" />
                                    <circle cx="50" cy="50" r="30" fill="none" stroke="#f0f0f0" />
                                    <circle cx="50" cy="50" r="15" fill="none" stroke="#f0f0f0" />
                                    <line x1="50" y1="5" x2="50" y2="95" stroke="#e5e5e5" strokeDasharray="2,2" />
                                    <line x1="5" y1="50" x2="95" y2="50" stroke="#e5e5e5" strokeDasharray="2,2" />
                                    <line x1="18" y1="18" x2="82" y2="82" stroke="#e5e5e5" strokeDasharray="2,2" />
                                    <line x1="18" y1="82" x2="82" y2="18" stroke="#e5e5e5" strokeDasharray="2,2" />
                                    <polygon points="50,15 80,40 70,80 30,80 20,40" fill="rgba(0,0,0,0.1)" stroke="black" strokeWidth="1.5" />
                                    {[[50, 15], [80, 40], [70, 80], [30, 80], [20, 40]].map(([cx, cy]) => (
                                        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill="black" />
                                    ))}
                                </svg>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 text-[7px] font-mono bg-white px-0.5">TRUST</div>
                                <div className="absolute top-[30%] right-0 -mr-1 text-[7px] font-mono bg-white px-0.5">VALUE</div>
                                <div className="absolute bottom-[20%] right-[8%] text-[7px] font-mono bg-white px-0.5">EASE</div>
                                <div className="absolute bottom-[20%] left-[8%] text-[7px] font-mono bg-white px-0.5">SAFETY</div>
                                <div className="absolute top-[30%] left-0 -ml-2 text-[7px] font-mono bg-white px-0.5">SUPPORT</div>
                            </div>
                        </div>
                        <div className="mt-2 text-center text-[9px] font-mono text-[var(--bp-muted)]">
                            IDX SCORE: <span className="text-black font-bold">8.4</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ RIGHT — Command Node / Recommendations ══════════════════════ */}
            <div className="w-[360px] shrink-0 border-l-2 border-black flex flex-col bg-white overflow-hidden my-4 mr-4 border border-gray-100" style={{ boxShadow: '-8px 0 24px rgba(0,0,0,0.06)' }}>
                {/* Header */}
                <div className="bg-black text-white px-4 py-3 flex justify-between items-center font-mono text-[11px] uppercase tracking-wider shrink-0">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        Command Node
                    </div>
                    <span className="animate-pulse text-green-400">● ONLINE</span>
                </div>

                {/* Section label */}
                <div className="px-6 pt-4 pb-1 shrink-0">
                    <p className="bp-label mb-0 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                        Recommendations
                    </p>
                </div>

                {/* Scrollable cards */}
                <div className="flex-1 overflow-y-auto scrollbar-thin-black px-6 pb-6 space-y-4 pt-2">
                    {/* ── Priority Alpha ── */}
                    <RecommendationCard
                        priority="Priority Alpha"
                        ref_id="#REC-01"
                        title="Renegotiate Kyoto Group Rate"
                        riskPct={85}
                        impact="+4.2%"
                        impactColor="text-green-600"
                        logic={[
                            '> DETECTED: Occupancy drop (Week 42)',
                            '> ACTION: Leverage volume for rate reduction',
                            '> EST. SAVINGS: $2,400',
                        ]}
                        ctaLabel="Initiate"
                        ctaStyle="bg-black text-white hover:bg-gray-800"
                        priorityStyle="text-black"
                        riskMarkerPct={20}
                        markerColor="bg-red-500"
                        borderAccent="border-l-4 border-l-black"
                    />

                    {/* ── Priority Beta ── */}
                    <RecommendationCard
                        priority="Priority Beta"
                        ref_id="#REC-02"
                        title="Consolidate Iceland Transfers"
                        riskPct={45}
                        impact="+2.8%"
                        impactColor="text-green-600"
                        logic={[
                            '> DETECTED: 4x Single Pax Transfers',
                            '> ACTION: Merge to Group Coach #B4',
                            '> EST. SAVINGS: $850',
                        ]}
                        ctaLabel="Review Plan"
                        ctaStyle="border border-black text-black hover:bg-gray-50"
                        priorityStyle="text-[var(--bp-muted)]"
                        riskMarkerPct={60}
                        markerColor="bg-orange-500"
                        borderAccent="border-l-4 border-l-gray-300"
                    />
                </div>

                {/* System Resources footer */}
                <div className="px-6 pb-5 pt-4 border-t border-dashed border-gray-300 shrink-0">
                    <div className="flex justify-between items-end mb-2">
                        <span className="bp-label mb-0">System Resources</span>
                        <span className="text-[9px] font-mono text-[var(--bp-muted)]">14ms latency</span>
                    </div>
                    <div className="flex gap-1 h-1.5">
                        <div className="bg-black w-1/4" />
                        <div className="bg-black w-1/4" />
                        <div className="bg-black w-1/6" />
                        <div className="bg-gray-200 flex-1" />
                    </div>
                </div>
            </div>

        </div>
    );
}

// ─── RecommendationCard subcomponent ─────────────────────────────────────────

interface RecCardProps {
    priority: string;
    ref_id: string;
    title: string;
    riskPct: number;
    impact: string;
    impactColor: string;
    logic: string[];
    ctaLabel: string;
    ctaStyle: string;
    priorityStyle: string;
    riskMarkerPct: number;
    markerColor: string;
    borderAccent: string;
}

function RecommendationCard({
    priority, ref_id, title, riskPct, impact, impactColor, logic,
    ctaLabel, ctaStyle, priorityStyle, riskMarkerPct, markerColor, borderAccent,
}: RecCardProps) {
    return (
        <div className={`border border-gray-200 p-4 ${borderAccent} relative hover:border-gray-400 transition-colors`}>
            <div className="flex justify-between items-start mb-3">
                <span className={`bp-label mb-0 ${priorityStyle}`}>{priority}</span>
                <span className="text-[9px] font-mono border border-black px-1">{ref_id}</span>
            </div>
            <h3 className="text-sm font-bold uppercase leading-snug mb-4 text-[var(--bp-text)]">{title}</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <span className="text-[9px] text-gray-400 block mb-1 uppercase tracking-wider">Risk vs Reward</span>
                    <div className="h-1.5 bg-gray-200 w-full relative mt-2">
                        <div className="h-full bg-black absolute left-0 top-0" style={{ width: `${riskPct}%` }} />
                        <div className={`absolute top-[-2px] w-0.5 h-2.5 ${markerColor}`} style={{ left: `${riskMarkerPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] font-mono mt-1 text-gray-500">
                        <span>LO</span><span>HI</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[9px] text-gray-400 block mb-1 uppercase tracking-wider">Impact</span>
                    <span className={`text-xl font-mono font-bold ${impactColor}`}>{impact}</span>
                </div>
            </div>

            <div className="bg-gray-50 p-3 border border-gray-100 mb-4">
                <span className="text-[8px] font-bold uppercase text-gray-400 mb-1 block">Execution Logic</span>
                <p className="font-mono text-[9px] leading-relaxed text-gray-700 whitespace-pre-line">
                    {logic.join('\n')}
                </p>
            </div>

            <button className={`w-full text-[10px] font-bold uppercase py-2 transition-colors flex items-center justify-center gap-2 ${ctaStyle}`}>
                {ctaLabel === 'Initiate' && (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M7 2l10 10L7 22V2z" /></svg>
                )}
                {ctaLabel}
            </button>
        </div>
    );
}
