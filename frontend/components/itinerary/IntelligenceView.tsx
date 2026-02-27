'use client';

import { Sparkles, ChevronRight, TrendingUp } from 'lucide-react';
import { FamilyAnalysisRadarChart } from '@/components/charts/FamilyAnalysisRadarChart';
import { FamilyCostStackedChart } from '@/components/charts/FamilyCostStackedChart';
import { PersonalizationProfitChart } from '@/components/charts/PersonalizationProfitChart';
import { DisruptionImpactChart } from '@/components/charts/DisruptionImpactChart';
import { summaryMetrics } from '@/components/charts/PersonalizationProfitChart';

// ─── IntelligenceView ─────────────────────────────────────────────────────────
// Intelligence dashboard with analytical charts and strategic insights

export default function IntelligenceView() {
    return (
        <div className="flex h-full bp-grid-bg bg-white overflow-hidden">

            {/* ══ LEFT — Analysis Section ════════════════════════════════════ */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 md:px-8 py-6 min-w-0">

                {/* Section label */}
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-5 flex items-center gap-2">
                    · Analysis
                </p>

                {/* Charts Grid - 2 columns at Top */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Analysis of Each Family Radar Chart */}
                    <FamilyAnalysisRadarChart />

                    {/* Family Cost Stacked Chart */}
                    <FamilyCostStackedChart />
                </div>

                {/* Personalization + Disruption — side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <PersonalizationProfitChart />
                    <DisruptionImpactChart />
                </div>
            </div>

            {/* ══ RIGHT — Strategic Insights (vertically centered, all 4 borders) ═══ */}
            <div className="w-[360px] shrink-0 flex items-center py-6 pr-6">
                <div className="border-2 border-black flex flex-col bg-white w-full h-full shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-black text-white px-4 py-3 flex justify-between items-center font-mono text-[13px] uppercase tracking-wider shrink-0">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Strategic Insights
                        </div>
                        <span className="flex items-center gap-1.5 text-[11px] tracking-wider">
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

                        {/* ── Divider ── */}
                        <div className="border-t border-gray-200 pt-4 mt-2">
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 flex items-center gap-1.5 mb-4">
                                <TrendingUp className="w-3.5 h-3.5" />
                                Portfolio KPIs
                            </span>

                            {/* KPI Summary Cards from Personalization Chart */}
                            <div className="space-y-3">
                                {summaryMetrics.map((metric, idx) => (
                                    <div key={idx} className="border-l-4 border-black bg-white p-3 shadow-sm hover:shadow-md hover:border-gray-600 transition-all border-y border-r border-y-gray-200 border-r-gray-200 group">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">{metric.label}</span>
                                            {metric.icon}
                                        </div>
                                        <div className="text-2xl font-mono font-bold text-black tracking-tighter my-0.5">
                                            {metric.value}
                                        </div>
                                        <div className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-wider">
                                            ↳ {metric.subtext}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── AI Strategic Insight ── */}
                        <div className="mt-4 border-2 border-[#111827] bg-[#f9fafb] p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-[#111827] transform translate-x-4 -translate-y-4 rotate-45"></div>
                            <h5 className="text-[11px] font-bold uppercase tracking-widest text-[#111827] mb-2 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                AI Strategic Insight
                            </h5>
                            <p className="text-[12px] leading-relaxed text-gray-700">
                                <span className="font-bold font-mono text-black">FAM-004 &amp; FAM-006</span> are consistently demanding high customization but yielding below-average margins.
                            </p>
                            <p className="text-[12px] leading-relaxed text-gray-700 mt-2 font-mono pb-2 border-b border-gray-300">
                                <strong className="text-blue-600 uppercase tracking-widest text-[10px]">Recommendation:</strong> Implement a mandatory &quot;Service Fee Tier&quot; for custom requests exceeding 10 POI deviations.
                            </p>
                            <div className="mt-3 text-right">
                                <button className="text-[10px] uppercase tracking-widest font-bold text-black hover:text-blue-600 transition-colors flex items-center justify-end w-full gap-1">
                                    Apply Pricing Rules <TrendingUp className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
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
                <span className={`text-[12px] font-bold uppercase tracking-[0.1em] ${priorityColor}`}>{priorityLabel}</span>
                <span className="text-[12px] font-mono border border-gray-300 px-1.5 py-0.5 text-gray-500">{id}</span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold leading-tight mb-4 text-gray-900">{title}</h3>

            {/* Growth + CTA — always visible */}
            <div className="flex items-end justify-between mb-4">
                <div className="flex flex-col">
                    <span className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">Estimated Growth</span>
                    <span className="text-4xl font-mono text-green-600 tracking-tight">{growth}</span>
                </div>
                <button className={`text-[12px] font-bold uppercase py-2.5 px-5 transition-all flex items-center gap-1.5 tracking-wider ${ctaStyle}`}>
                    {ctaLabel}
                </button>
            </div>

            {/* Analytical Rationale — collapsed by default */}
            <details className="group">
                <summary className="cursor-pointer text-[12px] font-bold uppercase text-gray-400 hover:text-black flex items-center gap-1 select-none transition-colors border-t border-gray-100 pt-3 list-none">
                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 shrink-0" />
                    Analytical Rationale
                </summary>
                <div className="pt-4 pl-1">
                    {/* Risk meter */}
                    <span className="text-[11px] text-gray-400 block mb-1 uppercase tracking-wider">Yield vs Risk Assessment</span>
                    <div className="h-1.5 bg-gray-200 w-full max-w-[200px] relative mt-1 mb-0.5">
                        <div className="h-full bg-black absolute left-0 top-0" style={{ width: `${riskPct}%` }} />
                        <div className={`absolute top-[-2px] w-0.5 h-2.5 ${markerColor}`} style={{ left: `${riskMarkerPct}%` }} />
                    </div>
                    <div className="flex justify-between max-w-[200px] text-[10px] font-mono mb-4 text-gray-500">
                        <span>CONSERVATIVE</span><span>AGGRESSIVE</span>
                    </div>

                    {/* Logic block */}
                    <div className="bg-gray-50 p-3 border border-gray-100">
                        <p className="font-mono text-[11px] leading-relaxed text-gray-600 whitespace-pre-line">
                            {logic.join('\n')}
                        </p>
                    </div>
                </div>
            </details>
        </div>
    );
}
