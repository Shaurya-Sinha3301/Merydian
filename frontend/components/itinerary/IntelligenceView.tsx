'use client';

import { LayoutGrid, TrendingUp, Grid3x3, Radar, LineChart, Sparkles, ChevronRight } from 'lucide-react';

// ─── IntelligenceView ─────────────────────────────────────────────────────────
// Redesigned for readability: right-panel cards now collapse analytical detail
// behind a <details> accordion, matching inteli.html / inteli.png reference.

// Technical label style matching inteli.html `.technical-label`
const techLabel = 'text-[14px] font-semibold capitalize text-gray-900 tracking-tight flex items-center gap-1.5 mb-0';
// Muted mono tag (e.g. Q3-2024, HM-01)
const monoTag = 'text-[10px] font-mono text-gray-400';

export default function IntelligenceView() {
    return (
        <div className="flex h-full bp-grid-bg bg-white overflow-hidden">

            {/* ══ LEFT — Analysis Section ════════════════════════════════════ */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 md:px-8 py-6 min-w-0">

                {/* Section label — Inter, small uppercase tracking, matches inteli.html */}
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-5 flex items-center gap-2">
                    · Analysis
                </p>

                {/* ── Row 1 ─── Treemap  +  Area chart ─────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                    {/* Portfolio Expenditure Allocation */}
                    <div className="bp-card p-5">
                        <div className="flex justify-between items-center mb-5">
                            <span className={techLabel}>
                                <LayoutGrid className="w-4 h-4 shrink-0" />
                                Portfolio Expenditure Allocation
                            </span>
                            <span className={monoTag}>Q3-2024</span>
                        </div>
                        {/* Treemap */}
                        <div className="grid gap-0.5 border border-black"
                            style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', height: '160px', background: '#000', padding: '2px' }}>
                            <div className="bg-white p-2 flex flex-col justify-between hover:bg-gray-50 transition-colors" style={{ gridRow: 'span 2' }}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-900">Aviation Logistics</span>
                                <div className="text-right">
                                    <span className="block text-xl font-mono font-bold text-gray-900">45%</span>
                                    <span className="text-[9px] text-gray-400">$45.2k</span>
                                </div>
                            </div>
                            <div className="bg-white p-1.5 flex flex-col justify-between hover:bg-gray-50 transition-colors">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Premium Stay</span>
                                <div className="text-right">
                                    <span className="block text-sm font-mono font-bold text-gray-900">30%</span>
                                    <span className="text-[8px] text-gray-400">$30.1k</span>
                                </div>
                            </div>
                            <div className="bg-white p-1.5 flex flex-col justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between w-full">
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Curated</span>
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Ancillary</span>
                                </div>
                                <div className="flex justify-between w-full items-end mt-1">
                                    <span className="text-xs font-mono font-bold text-gray-900">15%</span>
                                    <span className="text-xs font-mono font-bold text-gray-900 border-l border-gray-200 pl-2">10%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Real-Time Revenue Performance */}
                    <div className="bp-card p-5">
                        <div className="flex justify-between items-center mb-5">
                            <span className={techLabel}>
                                <LineChart className="w-4 h-4 shrink-0" />
                                Real-Time Revenue Performance
                            </span>
                            <div className="flex gap-1.5">
                                <span className="text-[9px] font-mono px-1.5 border border-black bg-black text-white">D</span>
                                <span className="text-[9px] font-mono px-1.5 border border-gray-200 text-gray-400">W</span>
                                <span className="text-[9px] font-mono px-1.5 border border-gray-200 text-gray-400">M</span>
                            </div>
                        </div>
                        <div className="h-[160px] w-full relative border-b border-l border-black">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3].map(i => <div key={i} className="w-full border-t border-dashed border-gray-200" />)}
                            </div>
                            <svg className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <path d="M0,80 Q10,75 20,60 T40,55 T60,40 T80,45 T100,20 V100 H0 Z" fill="rgba(0,0,0,0.05)" stroke="black" strokeWidth="1.5" />
                                <circle cx="20" cy="60" r="1.5" fill="black" />
                                <circle cx="60" cy="40" r="1.5" fill="black" />
                                <circle cx="100" cy="20" r="2" fill="red" stroke="white" strokeWidth="0.5" />
                            </svg>
                            <div className="absolute -bottom-5 w-full flex justify-between text-[9px] font-mono text-gray-400">
                                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Row 2 ─── Heatmap  +  Velocity  +  Radar ─────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Regional Yield Efficiency */}
                    <div className="bp-card p-5 flex flex-col">
                        <div className="flex justify-between items-center mb-5">
                            <span className={techLabel}>
                                <Grid3x3 className="w-4 h-4 shrink-0" />
                                Regional Yield Efficiency
                            </span>
                            <span className="text-[9px] font-mono text-gray-400 border border-gray-200 px-1">HM-01</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="grid grid-cols-4 gap-px border border-black" style={{ background: '#eee' }}>
                                {[
                                    { code: 'JP', opacity: 0.9 }, { code: 'UK', opacity: 0.8 }, { code: 'US', opacity: 0.4 }, { code: 'IT', opacity: 0.2 },
                                    { code: 'FR', opacity: 0.7 }, { code: 'DE', opacity: 0.95 }, { code: 'ES', opacity: 0.3 }, { code: 'PT', opacity: 0.1 },
                                    { code: 'CN', opacity: 0.5 }, { code: 'SG', opacity: 0.6 }, { code: 'TH', opacity: 0.2 }, { code: 'VN', opacity: 0.05 },
                                    { code: 'AU', opacity: 0.85 }, { code: 'NZ', opacity: 0.75 }, { code: 'CA', opacity: 0.15 }, { code: 'MX', opacity: 0 },
                                ].map(({ code, opacity }) => (
                                    <div key={code} className="aspect-square flex items-center justify-center font-mono text-[10px] hover:opacity-80 transition-opacity"
                                        style={{ background: opacity === 0 ? 'white' : `rgba(0,0,0,${opacity})`, color: opacity > 0.4 ? 'white' : 'black' }}>
                                        {code}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase tracking-wider mt-2">
                                <span>Base Yield</span>
                                <div className="h-1 w-16 bg-gradient-to-r from-white via-gray-400 to-black border border-gray-200" />
                                <span>Optimal Yield</span>
                            </div>
                        </div>
                    </div>

                    {/* Acquisition Velocity */}
                    <div className="bp-card p-5 flex flex-col">
                        <div className="flex justify-between items-center mb-5">
                            <span className={techLabel}>
                                <TrendingUp className="w-4 h-4 shrink-0" />
                                Acquisition Velocity
                            </span>
                            <span className="text-[9px] font-mono text-green-600">+12.4%</span>
                        </div>
                        <div className="flex-1 relative border border-gray-200 bg-gray-50/50 min-h-[120px]">
                            <div className="absolute inset-0 grid grid-cols-6 grid-rows-4">
                                {[...Array(3)].map((_, i) => <div key={i} className="border-r border-gray-200/50" />)}
                                <div className="border-r border-gray-200/50" /><div className="border-r border-gray-200/50" /><div />
                                {[...Array(3)].map((_, i) => <div key={i} className="col-span-6 border-b border-gray-200/50" />)}
                            </div>
                            <svg className="w-full h-full absolute inset-0 p-2 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <polyline fill="none" points="0,70 20,65 40,60 60,62 80,55 100,50" stroke="#ccc" strokeDasharray="2,2" strokeWidth="1.5" />
                                <polyline fill="none" points="0,80 20,70 40,55 60,40 80,35 100,20" stroke="black" strokeWidth="2" />
                                {[[20, 70], [40, 55], [60, 40], [80, 35]].map(([cx, cy]) => (
                                    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill="black" />
                                ))}
                                <circle cx="100" cy="20" r="2.5" fill="black" stroke="white" strokeWidth="1" />
                            </svg>
                        </div>
                        <div className="flex justify-between mt-2 text-[9px] font-mono text-gray-400">
                            <span>PRIOR</span><span>CURRENT</span>
                        </div>
                        <div className="mt-1.5 text-[9px] font-mono text-gray-500 border-t border-gray-100 pt-2">
                            <span className="text-black font-bold">AVG:</span> 42/hr <span className="mx-1">|</span> <span className="text-black font-bold">PEAK:</span> 15:00
                        </div>
                    </div>

                    {/* Client Sentiment Index */}
                    <div className="bp-card p-5 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <span className={techLabel}>
                                <Radar className="w-4 h-4 shrink-0" />
                                Client Sentiment Index
                            </span>
                        </div>
                        <div className="flex-1 relative flex items-center justify-center py-3">
                            <div className="relative w-36 h-36">
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
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 text-[8px] font-mono bg-white px-1">TRUST</div>
                                <div className="absolute top-[30%] right-0 -mr-2 text-[8px] font-mono bg-white px-1">VALUE</div>
                                <div className="absolute bottom-[20%] right-[10%] text-[8px] font-mono bg-white px-1">EASE</div>
                                <div className="absolute bottom-[20%] left-[10%] text-[8px] font-mono bg-white px-1">SAFETY</div>
                                <div className="absolute top-[30%] left-0 -ml-3 text-[8px] font-mono bg-white px-1">SUPPORT</div>
                            </div>
                        </div>
                        <div className="mt-2 text-center text-[9px] font-mono text-gray-500">
                            BENCHMARK SCORE: <span className="text-black font-bold">8.4</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ RIGHT — Strategic Insights (vertically centered, all 4 borders) ═══ */}
            <div className="w-[360px] shrink-0 flex items-center py-6 pr-6">
                <div className="border-2 border-black flex flex-col bg-white w-full h-full shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-black text-white px-4 py-3 flex justify-between items-center font-mono text-[11px] uppercase tracking-wider shrink-0">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Strategic Insights
                        </div>
                        <span className="flex items-center gap-1.5 text-[10px] tracking-wider">
                            <span className="animate-pulse text-green-400">●</span> Active Analysis
                        </span>
                    </div>

                    {/* Scrollable insight cards */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-6 space-y-4 pt-5">

                        {/* ── Strategic Imperative #1 ── */}
                        <InsightCard
                            id="#SI-01"
                            title="Maximize Margins on Kyoto Group Bookings"
                            growth="+4.2%"
                            ctaLabel="Execute"
                            ctaStyle="bg-gray-100 text-black border border-gray-200 hover:bg-black hover:text-white hover:border-black"
                            accentBorder="border-l-4 border-l-black"
                            priorityLabel="Strategic Imperative"
                            priorityColor="text-black"
                            riskPct={85}
                            riskMarkerPct={20}
                            markerColor="bg-red-500"
                            logic={[
                                '> SIGNAL: Q4 Occupancy Trend Alert',
                                '> OPPORTUNITY: Preferential Rate Negotiation',
                                '> PROJECTED REVENUE: +$2.4k Net',
                            ]}
                        />

                        {/* ── Strategic Imperative #2 ── */}
                        <InsightCard
                            id="#SI-02"
                            title="Optimize Iceland Logistics Efficiency"
                            growth="+2.8%"
                            ctaLabel="Review Plan"
                            ctaStyle="bg-gray-50 text-gray-600 border border-gray-200 hover:bg-black hover:text-white hover:border-black"
                            accentBorder="border-l-4 border-l-gray-300"
                            priorityLabel="Strategic Imperative"
                            priorityColor="text-gray-500"
                            riskPct={45}
                            riskMarkerPct={60}
                            markerColor="bg-orange-500"
                            logic={[
                                '> SIGNAL: Fragmented Transfer Patterns',
                                '> OPPORTUNITY: Group Transport Consolidation',
                                '> PROJECTED REVENUE: +$850 Net',
                            ]}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}

// ─── InsightCard subcomponent ─────────────────────────────────────────────────
// Top section is always visible; analytical rationale is collapsed in a <details>.

interface InsightCardProps {
    id: string;
    title: string;
    growth: string;
    ctaLabel: string;
    ctaStyle: string;
    accentBorder: string;
    priorityLabel: string;
    priorityColor: string;
    riskPct: number;
    riskMarkerPct: number;
    markerColor: string;
    logic: string[];
}

function InsightCard({
    id, title, growth, ctaLabel, ctaStyle, accentBorder,
    priorityLabel, priorityColor, riskPct, riskMarkerPct, markerColor, logic,
}: InsightCardProps) {
    return (
        <div className={`border border-gray-200 p-5 ${accentBorder} bg-white hover:border-gray-400 transition-colors`}>
            {/* Priority label + ref */}
            <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${priorityColor}`}>{priorityLabel}</span>
                <span className="text-[10px] font-mono border border-gray-300 px-1.5 py-0.5 text-gray-500">{id}</span>
            </div>

            {/* Title */}
            <h3 className="text-base font-bold leading-tight mb-4 text-gray-900">{title}</h3>

            {/* Growth + CTA — always visible */}
            <div className="flex items-end justify-between mb-4">
                <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Estimated Growth</span>
                    <span className="text-3xl font-mono text-green-600 tracking-tight">{growth}</span>
                </div>
                <button className={`text-[10px] font-bold uppercase py-2.5 px-5 transition-all flex items-center gap-1.5 tracking-wider ${ctaStyle}`}>
                    {ctaLabel}
                </button>
            </div>

            {/* Analytical Rationale — collapsed by default */}
            <details className="group">
                <summary className="cursor-pointer text-[10px] font-bold uppercase text-gray-400 hover:text-black flex items-center gap-1 select-none transition-colors border-t border-gray-100 pt-3 list-none">
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90 shrink-0" />
                    Analytical Rationale
                </summary>
                <div className="pt-4 pl-1">
                    {/* Risk meter */}
                    <span className="text-[9px] text-gray-400 block mb-1 uppercase tracking-wider">Yield vs Risk Assessment</span>
                    <div className="h-1.5 bg-gray-200 w-full max-w-[200px] relative mt-1 mb-0.5">
                        <div className="h-full bg-black absolute left-0 top-0" style={{ width: `${riskPct}%` }} />
                        <div className={`absolute top-[-2px] w-0.5 h-2.5 ${markerColor}`} style={{ left: `${riskMarkerPct}%` }} />
                    </div>
                    <div className="flex justify-between max-w-[200px] text-[8px] font-mono mb-4 text-gray-500">
                        <span>CONSERVATIVE</span><span>AGGRESSIVE</span>
                    </div>

                    {/* Logic block */}
                    <div className="bg-gray-50 p-3 border border-gray-100">
                        <p className="font-mono text-[9px] leading-relaxed text-gray-600 whitespace-pre-line">
                            {logic.join('\n')}
                        </p>
                    </div>
                </div>
            </details>
        </div>
    );
}
