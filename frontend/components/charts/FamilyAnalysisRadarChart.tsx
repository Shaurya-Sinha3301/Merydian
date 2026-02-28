"use client"

import { Radar as RadarIcon } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, Legend, Tooltip, ResponsiveContainer, Pie, PieChart, Cell, Label, Sector } from "recharts"
import { type PieSectorDataItem } from "recharts/types/polar/Pie"
import * as React from "react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export const description = "Analysis of Each Family Radar Chart"

// Analytical metrics for multiple families - SCALED 0-100 for Radar Chart visualization
// User requested parameters:
// 1. Revenue Contribution -> Family Revenue / Total Revenue (shown as %)
// 2. Total Cost
// 3. Satisfaction Score -> no of POIs met
// 4. Profit Contribution -> Family Profit / Total Profit
// 5. Cost per POI -> Family Total Cost / Number of POIs visited

// Revenue data for calculating Revenue Contribution
// family1 (Kumar): ₹310k, family2 (Sharma): ₹380k, family3 (Patel): ₹196k, family4 (Gupta): ₹314k
// Total Revenue = ₹1,200k
// Revenue Contrib: family1=25.8%, family2=31.7%, family3=16.3%, family4=26.2%

const chartData = [
  {
    metric: "Revenue Contrib.",
    family1: 26,  // Actual: 25.8%
    family2: 32,  // Actual: 31.7%
    family3: 16,  // Actual: 16.3%
    family4: 26,  // Actual: 26.2%
  },
  {
    metric: "Total Cost",
    family1: 74,  // Actual: ₹186k (scaled vs max ₹250k)
    family2: 88,  // Actual: ₹220k
    family3: 55,  // Actual: ₹138k
    family4: 78,  // Actual: ₹195k
  },
  {
    metric: "Satisfaction",
    family1: 80,  // Actual: 12 POIs met (scaled vs max 15)
    family2: 95,  // Actual: 14 POIs met
    family3: 65,  // Actual: 10 POIs met
    family4: 85,  // Actual: 13 POIs met
  },
  {
    metric: "Profit Contrib.",
    family1: 28,  // Actual: 28% of total profit pool
    family2: 45,  // Actual: 45% of total profit pool
    family3: 12,  // Actual: 12% of total profit pool
    family4: 15,  // Actual: 15% of total profit pool
  },
  {
    metric: "Cost/POI",
    family1: 62,  // Actual: ₹15.5k / POI (scaled invert, lower is better but radar needs higher=better or standard)
    family2: 45,  // Actual: ₹15.7k / POI 
    family3: 88,  // Actual: ₹13.8k / POI (Highly efficient)
    family4: 70,  // Actual: ₹15.0k / POI
  },
]

// Unscaled true values map for tooltips
const trueValues: Record<string, any> = {
  "Revenue Contrib.": {
    family1: "25.8%", family2: "31.7%", family3: "16.3%", family4: "26.2%"
  },
  "Total Cost": {
    family1: "₹186k", family2: "₹220k", family3: "₹138k", family4: "₹195k"
  },
  "Satisfaction": {
    family1: "12 POIs", family2: "14 POIs", family3: "10 POIs", family4: "13 POIs"
  },
  "Profit Contrib.": {
    family1: "28%", family2: "45%", family3: "12%", family4: "15%"
  },
  "Cost/POI": {
    family1: "₹15.5k", family2: "₹15.7k", family3: "₹13.8k", family4: "₹15.0k"
  }
}

// Scaling information for metrics
const metricScaling = [
  {
    name: "Revenue Contrib.",
    description: "Family Revenue / Total Revenue",
    formula: "(Fam Rev / Total Rev) × 100",
    range: "Higher = Larger share"
  },
  {
    name: "Total Cost",
    description: "Trip cost relative to max",
    formula: "Cost / Max",
    range: "Contextual"
  },
  {
    name: "Satisfaction",
    description: "Number of POIs met mapped 0-100",
    formula: "(POIs / Max POIs) * 100",
    range: "Higher is better"
  },
  {
    name: "Profit Contrib.",
    description: "Share of global profit pool",
    formula: "Fam Profit / Total Profit",
    range: "Higher=More critical client"
  },
  {
    name: "Cost/POI",
    description: "Total cost spent of that family divided by total POIs visited by that family",
    formula: "Cost / POIs",
    range: "Higher score = Cheaper"
  },
]

// Cost breakdown data for inner pie ring
// Transport is the biggest cost driver; Stay is moderate; Flight is expensive relative to its profit
const costBreakdownData = [
  { category: "transport", cost: 52000, fill: "var(--color-transport)" },
  { category: "stay", cost: 28500, fill: "var(--color-stay)" },
  { category: "meals", cost: 22400, fill: "var(--color-meals)" },
  { category: "flight", cost: 18600, fill: "var(--color-flight)" },
  { category: "misc", cost: 7500, fill: "var(--color-misc)" },
]

// Profit breakdown data for outer pie ring
// Stay yields highest profit despite lower cost; Transport yields low profit despite highest cost
const profitBreakdownData = [
  { category: "transport", profit: 8400, fill: "var(--color-transport)" },
  { category: "stay", profit: 24800, fill: "var(--color-stay)" },
  { category: "meals", profit: 12600, fill: "var(--color-meals)" },
  { category: "flight", profit: 4200, fill: "var(--color-flight)" },
  { category: "misc", profit: 3000, fill: "var(--color-misc)" },
]

// Chart config for shadcn ChartContainer
const pieChartConfig = {
  cost: {
    label: "Cost",
  },
  profit: {
    label: "Profit",
  },
  transport: {
    label: "Transport",
    color: "#8B7355",
  },
  stay: {
    label: "Stay",
    color: "#6B8E7F",
  },
  meals: {
    label: "Meals",
    color: "#7B8FA3",
  },
  flight: {
    label: "Flight",
    color: "#A08B7A",
  },
  misc: {
    label: "Misc",
    color: "#9CA3AF",
  },
} satisfies ChartConfig

// Calculate totals
const totalCost = costBreakdownData.reduce((acc, curr) => acc + curr.cost, 0)
const totalProfit = profitBreakdownData.reduce((acc, curr) => acc + curr.profit, 0)

// Build a lookup map for percentages
const sectorPercentages = costBreakdownData.map((costItem, i) => {
  const profitItem = profitBreakdownData[i]
  return {
    key: costItem.category,
    costPct: ((costItem.cost / totalCost) * 100).toFixed(0),
    profitPct: ((profitItem.profit / totalProfit) * 100).toFixed(0),
  }
})

// Family metadata matching dashboard aesthetic
const families = [
  { id: 'family1', name: 'Kumar Family', color: '#8B7355', members: 4 },
  { id: 'family2', name: 'Sharma Family', color: '#6B8E7F', members: 3 },
  { id: 'family3', name: 'Patel Family', color: '#7B8FA3', members: 5 },
  { id: 'family4', name: 'Gupta Family', color: '#A08B7A', members: 4 },
]

// Custom tooltip component mapping back to TRUE unscaled values
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 shadow-lg p-3 rounded">
        <p className="text-[13px] font-semibold text-gray-900 mb-2 font-mono">
          {label}
        </p>
        <div className="space-y-1.5 border-t border-gray-100 pt-1.5">
          {payload.map((entry: any, index: number) => {
            // Retrieve true unscaled value for the current metric and family
            const trueValue = trueValues[label] ? trueValues[label][entry.dataKey] : entry.value;

            return (
              <div key={index} className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-[12px] text-gray-600">
                    {entry.name}:
                  </span>
                </div>
                <span className="text-[12px] font-bold text-gray-900 font-mono">
                  {trueValue}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  return null
}

export function FamilyAnalysisRadarChart() {

  return (
    <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] relative">
      {/* Decorative Blueprint Overlay */}
      <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Header */}
      <div className="border-b-2 border-black px-6 py-4 bg-[#f8f9fa] relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center bg-white shrink-0">
              <RadarIcon className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold uppercase tracking-widest text-black">
                Analysis of Each Family
              </h2>
              <p className="text-[12px] text-gray-500 tracking-wider mt-0.5 uppercase">
                Multi-Family Performance Radar
              </p>
            </div>
          </div>
          <span className="text-[12px] font-mono text-black border-2 border-black px-2 py-1 bg-[#e9ecef] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">
            MULTI-FAMILY
          </span>
        </div>
      </div>

      {/* Chart Content */}
      <div className="px-6 py-4 relative z-10">
        {/* Scale indicator */}
        <div className="flex justify-between items-center mb-2 px-4">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">Chart Scale: 0-100 (Hover for exact figures)</span>
        </div>

        <div className="w-full h-[240px] min-w-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={chartData}
            >
              <PolarGrid
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey="metric"
                tick={{
                  fill: '#64748b',
                  fontSize: 12,
                  fontFamily: 'ui-monospace, monospace',
                  fontWeight: 600
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Radar for each family */}
              {families.map((family, index) => (
                <Radar
                  key={family.id}
                  name={family.name}
                  dataKey={family.id}
                  stroke={family.color}
                  fill={family.color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}

              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '13px',
                  fontFamily: 'ui-sans-serif, system-ui',
                  fontWeight: 600,
                  color: '#475569'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost & Profit Breakdown — Double Pie Chart */}
        <div className="mt-4 pt-4 border-t-2 border-black">
          <div className="mb-3">
            <h4 className="text-[12px] font-bold uppercase text-black tracking-widest mb-1">
              Global Cost & Profit Breakdown
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
              Inner ring: Cost · Outer ring: Profit
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Double Pie Chart */}
            <div className="w-[180px] h-[180px] min-w-[180px]">
              <ChartContainer
                config={pieChartConfig}
                className="mx-auto aspect-square w-full h-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelKey="category"
                        nameKey="category"
                        indicator="line"
                        labelFormatter={(_, payload) => {
                          const dataKey = payload?.[0]?.dataKey as string
                          return dataKey === "cost" ? "Cost Breakdown" : "Profit Breakdown"
                        }}
                      />
                    }
                  />
                  {/* Inner ring — Cost */}
                  <Pie
                    data={costBreakdownData}
                    dataKey="cost"
                    nameKey="category"
                    outerRadius={50}
                    strokeWidth={2}
                    stroke="#fff"
                  />
                  {/* Outer ring — Profit */}
                  <Pie
                    data={profitBreakdownData}
                    dataKey="profit"
                    nameKey="category"
                    innerRadius={58}
                    outerRadius={80}
                    strokeWidth={2}
                    stroke="#fff"
                  />
                </PieChart>
              </ChartContainer>
            </div>

            {/* Legend with percentage breakdown */}
            <div className="flex-1 space-y-2">
              {/* Header row */}
              <div className="flex items-center gap-1 px-1 pb-1 border-b border-gray-200">
                <span className="flex-1 text-[8px] font-bold uppercase tracking-widest text-gray-400">Sector</span>
                <span className="w-[40px] text-right text-[8px] font-bold uppercase tracking-widest text-gray-400">Cost%</span>
                <span className="w-[40px] text-right text-[8px] font-bold uppercase tracking-widest text-green-600">Profit%</span>
              </div>
              {/* Category rows */}
              <div className="space-y-0.5">
                {sectorPercentages.map((sector) => {
                  const cfg = pieChartConfig[sector.key as keyof typeof pieChartConfig]
                  return (
                    <div key={sector.key} className="flex items-center gap-1 px-1 py-0.5 hover:bg-gray-50 transition-colors rounded">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ backgroundColor: 'color' in cfg ? cfg.color : undefined }}
                        />
                        <span className="text-[9px] font-semibold text-gray-900 truncate">
                          {'label' in cfg ? cfg.label : sector.key}
                        </span>
                      </div>
                      <span className="w-[40px] text-right text-[9px] font-mono font-bold text-gray-700">
                        {sector.costPct}%
                      </span>
                      <span className="w-[40px] text-right text-[9px] font-mono font-bold text-green-700">
                        {sector.profitPct}%
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Totals */}
              <div className="border-t border-gray-200 pt-1.5 space-y-0.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Total Cost</span>
                  <span className="text-[10px] font-mono font-bold text-gray-900">₹{(totalCost / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Total Profit</span>
                  <span className="text-[10px] font-mono font-bold text-green-700">₹{(totalProfit / 1000).toFixed(1)}k</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Definitions */}
        <details className="mt-4 pt-4 border-t-2 border-black group">
          <summary className="cursor-pointer text-[11px] font-bold uppercase text-gray-400 hover:text-black flex items-center gap-1 select-none transition-colors list-none">
            <span className="text-[13px]">▸</span>
            <span className="group-open:hidden">Show Radar Metrics Definition</span>
            <span className="hidden group-open:inline">Hide Radar Metrics Definition</span>
          </summary>
          <div className="mt-2 bg-[#f8f9fa] border-2 border-black p-2.5">
            <div className="space-y-2 font-mono text-[10px] text-gray-600">
              {metricScaling.map((metric, index) => (
                <div key={index} className="pb-2 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="text-gray-900 font-bold">{metric.name}</span>
                    <span className="text-[9px] text-blue-600 font-semibold">{metric.range}</span>
                  </div>
                  <div className="text-[9px] text-gray-500 mb-0.5">{metric.description}</div>
                  <div className="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                    <span className="text-gray-400">Formula:</span> {metric.formula}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
