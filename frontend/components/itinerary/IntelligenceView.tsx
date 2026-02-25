'use client';

import { Sparkles, ChevronRight } from 'lucide-react';
import { CostPerFamilyRadarChart } from '@/components/charts/CostPerFamilyRadarChart';
import { TransportUtilizationChart } from '@/components/charts/TransportUtilizationChart';
import { PersonalizationProfitChart } from '@/components/charts/PersonalizationProfitChart';

// ─── IntelligenceView ─────────────────────────────────────────────────────────
// Intelligence dashboard with analytical charts and strategic insights

export default function IntelligenceView() {
    return (
        <div className="flex h-full bp-grid-bg bg-white overflow-hidden">

            {/* ══ LEFT — Analysis Section ════════════════════════════════════ */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 md:px-8 py-6 min-w-0">

                {/* Section label */}
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-5 flex items-center gap-2">
                    · Analysis
                </p>

                {/* Personalization vs Profit - Full Width at Top */}
                <div className="mb-6">
                    <PersonalizationProfitChart />
                </div>

                {/* Charts Grid - 2 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cost Per Family Radar Chart */}
                    <CostPerFamilyRadarChart />

                    {/* Transport Utilization Chart */}
                    <TransportUtilizationChart />
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
