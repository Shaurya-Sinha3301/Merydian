"use client"

import { Radar as RadarIcon } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, Legend, Tooltip, ResponsiveContainer, Pie, PieChart, Cell, Label, Sector } from "recharts"
import { type PieSectorDataItem } from "recharts/types/polar/Pie"
import * as React from "react"

export const description = "Analysis of Each Family Radar Chart"

// Analytical metrics for multiple families - SCALED 0-100 for Radar Chart visualization
// User requested parameters:
// 1. Profit Margin -> (Family Revenue - Family Cost) / Family Revenue
// 2. Total Cost
// 3. Satisfaction Score -> no of POIs met
// 4. Profit Contribution -> Family Profit / Total Profit
// 5. Cost per POI -> Family Total Cost / Number of POIs visited

const chartData = [
  {
    metric: "Profit Margin",
    family1: 65,  // Actual: 65%
    family2: 72,  // Actual: 72%
    family3: 58,  // Actual: 58%
    family4: 68,  // Actual: 68%
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
  "Profit Margin": {
    family1: "65%", family2: "72%", family3: "58%", family4: "68%"
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
    name: "Profit Margin",
    description: "Net Margin (Rev - Cost)/Rev",
    formula: "Direct %",
    range: "Higher is better"
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

// Cost breakdown data for pie chart
const costBreakdownData = [
  { category: "Transport", amount: 45200, percentage: 35, color: "#8B7355" },
  { category: "Stay", amount: 38500, percentage: 30, color: "#6B8E7F" },
  { category: "Meals", amount: 25800, percentage: 20, color: "#7B8FA3" },
  { category: "Flight", amount: 12900, percentage: 10, color: "#A08B7A" },
  { category: "Misc", amount: 6450, percentage: 5, color: "#9CA3AF" },
]

// Calculate total
const totalCost = costBreakdownData.reduce((acc, curr) => acc + curr.amount, 0)

// Custom label for pie chart center
const renderCenterLabel = ({ viewBox }: any) => {
  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
    return (
      <text
        x={viewBox.cx}
        y={viewBox.cy}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        <tspan
          x={viewBox.cx}
          y={viewBox.cy - 5}
          className="fill-gray-900 text-[20px] font-bold font-mono"
        >
          ₹{(totalCost / 1000).toFixed(0)}k
        </tspan>
        <tspan
          x={viewBox.cx}
          y={viewBox.cy + 12}
          className="fill-gray-400 text-[11px] uppercase tracking-wider"
        >
          Total Cost
        </tspan>
      </text>
    )
  }
}

// Custom tooltip for pie chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-gray-200 shadow-lg p-3 rounded">
        <p className="text-[12px] font-bold text-gray-900 mb-1.5">
          {data.category}
        </p>
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Amount:</span>
            <span className="font-mono font-bold text-gray-900">₹{data.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Percentage:</span>
            <span className="font-mono font-bold text-gray-900">{data.percentage}%</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

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
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined)

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
  }

  return (
    <div className="border border-gray-200 bg-white shadow-sm">
      {/* Header matching dashboard style */}
      <div className="border-b border-gray-200 px-5 py-3 bg-gray-50/50">
        <div className="flex justify-between items-center mb-0">
          <span className="text-[16px] font-bold capitalize text-gray-900 tracking-tight flex items-center gap-1.5">
            <RadarIcon className="w-5 h-5 text-gray-700 shrink-0" />
            Analysis of Each Family
          </span>
          <span className="text-[12px] font-mono font-bold text-gray-400 border border-gray-200 px-1.5 py-0.5 bg-white">
            MULTI-FAMILY
          </span>
        </div>
      </div>

      {/* Chart Content */}
      <div className="px-5 py-4">
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

        {/* Cost Breakdown Pie Chart */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="mb-3">
            <h4 className="text-[12px] font-bold uppercase text-gray-600 tracking-wider mb-1">
              Global Cost Breakdown
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
              Distribution of expenses across aggregate trip categories
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Pie Chart */}
            <div className="w-[140px] h-[140px] min-w-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={costBreakdownData}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    strokeWidth={2}
                    stroke="#fff"
                    activeShape={({
                      outerRadius = 0,
                      ...props
                    }: PieSectorDataItem) => (
                      <Sector {...props} outerRadius={outerRadius + 8} />
                    )}
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                      />
                    ))}
                    <Label
                      content={renderCenterLabel}
                      position="center"
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1.5">
              {costBreakdownData.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-2 p-1.5 hover:bg-gray-50 transition-colors rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[9px] font-semibold text-gray-900 truncate">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[8px] font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 border border-gray-200 rounded">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metric Definitions */}
        <details className="mt-4 pt-4 border-t border-gray-100 group">
          <summary className="cursor-pointer text-[11px] font-bold uppercase text-gray-400 hover:text-black flex items-center gap-1 select-none transition-colors list-none">
            <span className="text-[13px]">▸</span>
            <span className="group-open:hidden">Show Radar Metrics Definition</span>
            <span className="hidden group-open:inline">Hide Radar Metrics Definition</span>
          </summary>
          <div className="mt-2 bg-gray-50/50 border border-gray-100 p-2.5">
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
