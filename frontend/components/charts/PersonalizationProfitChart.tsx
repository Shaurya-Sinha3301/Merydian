"use client"

import { Target, Info, TrendingUp, Minus } from "lucide-react"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label, ZAxis } from "recharts"

export const description = "Per-Family Personalization vs Profitability"

// Mock data representing families, their personalization score, and profit metrics
// Personalization Score: (Unique POIs) + (Route Deviations) + (Special Constraints)
// Profit: Revenue - Cost
const familyData = [
  { id: "FAM-001", name: "Sharma Family", personalization: 12, margin: 45, profit: 4500, revenue: 10000, cost: 5500, classification: "premium" },
  { id: "FAM-002", name: "Patel Family", personalization: 3, margin: 65, profit: 5200, revenue: 8000, cost: 2800, classification: "ideal" },
  { id: "FAM-003", name: "Gupta Family", personalization: 8, margin: 55, profit: 6600, revenue: 12000, cost: 5400, classification: "premium" },
  { id: "FAM-004", name: "Singh Family", personalization: 18, margin: 25, profit: 1500, revenue: 6000, cost: 4500, classification: "risky" },
  { id: "FAM-005", name: "Reddy Family", personalization: 5, margin: 40, profit: 2000, revenue: 5000, cost: 3000, classification: "inefficient" },
  { id: "FAM-006", name: "Verma Family", personalization: 15, margin: 35, profit: 3150, revenue: 9000, cost: 5850, classification: "risky" },
  { id: "FAM-007", name: "Khan Family", personalization: 7, margin: 50, profit: 4250, revenue: 8500, cost: 4250, classification: "ideal" },
  { id: "FAM-008", name: "Desai Family", personalization: 10, margin: 60, profit: 7200, revenue: 12000, cost: 4800, classification: "premium" },
]

// Calculate averages for quadrants
const avgPersonalization = familyData.reduce((acc, curr) => acc + curr.personalization, 0) / familyData.length
const avgMargin = familyData.reduce((acc, curr) => acc + curr.margin, 0) / familyData.length

// KPI Aggregations
const highestPersonalization = familyData.reduce((prev, current) => (prev.personalization > current.personalization) ? prev : current)
const highestProfit = familyData.reduce((prev, current) => (prev.profit > current.profit) ? prev : current)
const avgProfitMargin = avgMargin.toFixed(1)
const avgPersonalizationScore = avgPersonalization.toFixed(1)

// Derived metrics for summary cards
const summaryMetrics = [
  {
    label: "Highest Profit",
    value: `₹${(highestProfit.profit / 1000).toFixed(1)}k`,
    subtext: highestProfit.name,
    icon: <TrendingUp className="w-3.5 h-3.5 text-green-600" />
  },
  {
    label: "Highest Personalization",
    value: `${highestPersonalization.personalization} pts`,
    subtext: highestPersonalization.name,
    icon: <Target className="w-3.5 h-3.5 text-blue-600" />
  },
  {
    label: "Avg Profit Margin",
    value: `${avgProfitMargin}%`,
    subtext: "Across all families",
    icon: <Minus className="w-3.5 h-3.5 text-gray-500" />
  },
  {
    label: "Avg Customization",
    value: `${avgPersonalizationScore} pts`,
    subtext: "Per family average",
    icon: <Minus className="w-3.5 h-3.5 text-gray-500" />
  }
]

// Custom tooltip for the bubble chart
const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 min-w-[200px] z-50 rounded-none mix-blend-normal">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
          <p className="text-[14px] font-bold text-gray-900 uppercase tracking-widest">
            {data.name}
          </p>
          <span className="text-[11px] font-mono bg-gray-100 px-1 py-0.5 border border-gray-300">
            {data.id}
          </span>
        </div>

        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between items-center group">
            <span className="text-gray-500 uppercase tracking-wider text-[11px] group-hover:text-black transition-colors">Customization</span>
            <span className="font-mono font-bold text-gray-900">{data.personalization} pts</span>
          </div>
          <div className="flex justify-between items-center group">
            <span className="text-gray-500 uppercase tracking-wider text-[11px] group-hover:text-black transition-colors">Profit Margin</span>
            <span className="font-mono font-bold text-gray-900">{data.margin}%</span>
          </div>
          <div className="flex justify-between items-center group">
            <span className="text-gray-500 uppercase tracking-wider text-[11px] group-hover:text-black transition-colors">Net Profit</span>
            <span className="font-mono font-bold text-green-600">₹{data.profit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center group">
            <span className="text-gray-500 uppercase tracking-wider text-[11px] group-hover:text-black transition-colors">Total Revenue</span>
            <span className="font-mono font-bold text-gray-600">₹{data.revenue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function PersonalizationProfitChart() {
  return (
    <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] relative">
      {/* Decorative Blueprint Overlay */}
      <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Header */}
      <div className="border-b-2 border-black px-6 py-4 bg-[#f8f9fa] relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center bg-white shrink-0">
              <Target className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold uppercase tracking-widest text-black">
                Personalization vs Profitability
              </h2>
              <p className="text-[12px] text-gray-500 tracking-wider mt-0.5 uppercase">
                Per-Family Efficiency Quadrant Analysis
              </p>
            </div>
          </div>
          <span className="text-[12px] font-mono text-black border-2 border-black px-2 py-1 bg-[#e9ecef] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">
            INTELLIGENCE MODULE
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] divide-y lg:divide-y-0 lg:divide-x-2 divide-black relative z-10">

        {/* Left: Bubble Scatter Plot Workspace */}
        <div className="p-6 bg-white relative">
          {/* Blueprint Corner Markers */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black -translate-x-[2px] -translate-y-[2px]"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-black translate-x-[2px] -translate-y-[2px]"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-black -translate-x-[2px] translate-y-[2px]"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black translate-x-[2px] translate-y-[2px]"></div>


          {/* Contextual Axis Interpretations */}
          <div className="absolute top-6 right-6 text-[11px] uppercase font-bold tracking-widest text-[#7B8FA3] mix-blend-multiply z-0 opacity-40">
            High Margin
          </div>
          <div className="absolute bottom-16 right-6 text-[11px] uppercase font-bold tracking-widest text-[#7B8FA3] mix-blend-multiply z-0 opacity-40">
            High Customization
          </div>


          <div className="w-full h-[350px] relative z-10 min-w-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />

                {/* X Axis: Personalization */}
                <XAxis
                  type="number"
                  dataKey="personalization"
                  name="Personalization Score"
                  domain={[0, 20]} // Set domain based on max score
                  tick={{ fill: '#6b7280', fontSize: 13, fontFamily: 'ui-monospace, monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                >
                  <Label
                    value="Customization Effort (Unique POIs + Routing Deviations)"
                    position="bottom"
                    style={{ fontSize: 12, fill: '#000', fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                    offset={15}
                  />
                </XAxis>

                {/* Y Axis: Profit Margin */}
                <YAxis
                  type="number"
                  dataKey="margin"
                  name="Profit Margin"
                  domain={[0, 80]} // Set domain based on max margin
                  tick={{ fill: '#6b7280', fontSize: 13, fontFamily: 'ui-monospace, monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                  tickFormatter={(val) => `${val}%`}
                >
                  <Label
                    value="Profit Margin (%)"
                    angle={-90}
                    position="insideLeft"
                    style={{ fontSize: 12, fill: '#000', fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                    offset={5}
                    dy={50}
                  />
                </YAxis>

                {/* Z Axis: Revenue (controls bubble size) */}
                <ZAxis type="number" dataKey="revenue" range={[100, 1500]} name="Revenue" />

                <Tooltip
                  content={<CustomScatterTooltip />}
                  cursor={{ strokeDasharray: '3 3', stroke: '#a3a3a3', strokeWidth: 1 }}
                />

                {/* Quadrant Lines (Averages) */}
                <ReferenceLine
                  y={avgMargin}
                  stroke="#111827"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  label={{ value: "AVG MARGIN", position: "insideTopRight", fill: "#374151", fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}
                />
                <ReferenceLine
                  x={avgPersonalization}
                  stroke="#111827"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  label={{ value: "AVG EFFORT", position: "insideBottomRight", fill: "#374151", fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}
                />

                {/* Quadrant Data Series classification */}
                <Scatter data={familyData.filter(d => d.classification === 'ideal')} fill="#6B8E7F" opacity={0.8} shape="circle" stroke="#111827" strokeWidth={1} />
                <Scatter data={familyData.filter(d => d.classification === 'premium')} fill="#7B8FA3" opacity={0.8} shape="circle" stroke="#111827" strokeWidth={1} />
                <Scatter data={familyData.filter(d => d.classification === 'inefficient')} fill="#D4A373" opacity={0.8} shape="circle" stroke="#111827" strokeWidth={1} />
                <Scatter data={familyData.filter(d => d.classification === 'risky')} fill="#C17767" opacity={0.8} shape="circle" stroke="#111827" strokeWidth={1} />

              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Legend / Quadrant Explanations Bottom Left */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#4b5563] mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              Quadrant Classification Guide
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#6B8E7F] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"></div>
                  <span className="text-[12px] font-bold text-gray-900 uppercase tracking-wider">Ideal</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">Low custom. High margin. Highly scalable.</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#7B8FA3] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"></div>
                  <span className="text-[12px] font-bold text-gray-900 uppercase tracking-wider">Premium</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">High custom. High margin. Worth the effort.</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D4A373] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"></div>
                  <span className="text-[12px] font-bold text-gray-900 uppercase tracking-wider">Inefficient</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">Low custom. Low margin. Pricing review needed.</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C17767] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"></div>
                  <span className="text-[12px] font-bold text-gray-900 uppercase tracking-wider">Risky</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">High custom. Low margin. Operations drain.</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-500 uppercase tracking-wider border border-gray-200 px-3 py-2 bg-gray-50/50">
              <span className="font-bold text-black border border-black rounded-full px-1.5 py-0.5 bg-white">!</span>
              Bubble size indicates Total Revenue volume
            </div>
          </div>
        </div>

        {/* Right: Key Metrics / KPI Summary */}
        <div className="bg-[#f8f9fa] flex flex-col items-stretch p-0">
          <div className="px-5 py-4 border-b border-gray-200 bg-white">
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-black flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              Portfolio Summary
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-4">
            {summaryMetrics.map((metric, idx) => (
              <div key={idx} className="border-l-4 border-black bg-white p-3 shadow-sm hover:shadow-md hover:border-gray-600 transition-all border-y border-r border-y-gray-200 border-r-gray-200 group">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[12px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">{metric.label}</span>
                  {metric.icon}
                </div>
                <div className="text-3xl font-mono font-bold text-black tracking-tighter my-0.5">
                  {metric.value}
                </div>
                <div className="text-[11px] font-mono text-gray-400 mt-1 uppercase tracking-wider">
                  ↳ {metric.subtext}
                </div>
              </div>
            ))}

            {/* AI Actionable Insight Card */}
            <div className="mt-6 border-2 border-[#111827] bg-[#f9fafb] p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-[#111827] transform translate-x-4 -translate-y-4 rotate-45"></div>
              <h5 className="text-[12px] font-bold uppercase tracking-widest text-[#111827] mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                AI Strategic Insight
              </h5>
              <p className="text-[13px] leading-relaxed text-gray-700">
                <span className="font-bold font-mono text-black">FAM-004 & FAM-006</span> are consistently demanding high customization but yielding below-average margins.
              </p>
              <p className="text-[13px] leading-relaxed text-gray-700 mt-2 font-mono pb-2 border-b border-gray-300">
                <strong className="text-blue-600 uppercase tracking-widest text-[11px]">Recommendation:</strong> Implement a mandatory "Service Fee Tier" for any custom requests exceeding 10 POI deviations.
              </p>
              <div className="mt-3 text-right">
                <button className="text-[11px] uppercase tracking-widest font-bold text-black hover:text-blue-600 transition-colors flex items-center justify-end w-full gap-1">
                  Apply Pricing Rules <TrendingUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
