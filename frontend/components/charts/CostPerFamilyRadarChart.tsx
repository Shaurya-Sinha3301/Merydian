"use client"

import { Radar as RadarIcon } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, Legend, Tooltip, ResponsiveContainer, Pie, PieChart, Cell, Label, Sector } from "recharts"
import { type PieSectorDataItem } from "recharts/types/polar/Pie"
import * as React from "react"

export const description = "Cost Per Family Radar Chart with Multi-Family Comparison"

// Analytical metrics for multiple families - ALL SCALED TO 0-100
const chartData = [
  {
    metric: "Total Cost",
    family1: 74,  // Scaled from ₹186k (max ₹250k)
    family2: 88,  // Scaled from ₹220k
    family3: 66,  // Scaled from ₹165k
    family4: 78,  // Scaled from ₹195k
  },
  {
    metric: "Transport %",
    family1: 75,  // Already 0-100
    family2: 68,
    family3: 82,
    family4: 71,
  },
  {
    metric: "Value/₹",
    family1: 68,  // Already 0-100 (satisfaction points per ₹1000)
    family2: 82,
    family3: 75,
    family4: 79,
  },
  {
    metric: "Margin",
    family1: 65,  // Already 0-100 (% margin)
    family2: 72,
    family3: 68,
    family4: 70,
  },
]

// Scaling information for metrics
const metricScaling = [
  {
    name: "Total Cost",
    description: "Trip cost 0-100",
    formula: "Cost / Max",
    example: "74",
    range: "Lower is better"
  },
  {
    name: "Transport %",
    description: "Transport % of total",
    formula: "Transport / Total",
    example: "Percentage",
    range: "30-40%"
  },
  {
    name: "Value/₹",
    description: "Points per ₹1k",
    formula: "Score / ₹1k",
    example: "68",
    range: "Higher is better"
  },
  {
    name: "Margin",
    description: "Net Margin",
    formula: "Profit / Rev",
    example: "Percentage",
    range: "60-75%"
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
          className="fill-gray-900 text-[18px] font-bold font-mono"
        >
          ₹{(totalCost / 1000).toFixed(0)}k
        </tspan>
        <tspan
          x={viewBox.cx}
          y={viewBox.cy + 12}
          className="fill-gray-400 text-[9px] uppercase tracking-wider"
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
        <p className="text-[10px] font-bold text-gray-900 mb-1.5">
          {data.category}
        </p>
        <div className="space-y-0.5 text-[9px]">
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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 shadow-lg p-3 rounded">
        <p className="text-[11px] font-semibold text-gray-900 mb-2 font-mono">
          {label}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[10px] text-gray-600">
                {entry.name}:
              </span>
              <span className="text-[10px] font-bold text-gray-900 font-mono">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export function CostPerFamilyRadarChart() {
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined)

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
  }

  return (
    <div className="border border-gray-200 bg-white">
      {/* Header matching dashboard style */}
      <div className="border-b border-gray-200 px-5 py-3">
        <div className="flex justify-between items-center mb-0">
          <span className="text-[14px] font-semibold capitalize text-gray-900 tracking-tight flex items-center gap-1.5">
            <RadarIcon className="w-4 h-4 shrink-0" />
            Cost Analysis
          </span>
          <span className="text-[10px] font-mono text-gray-400 border border-gray-200 px-1.5 py-0.5">
            MULTI-FAMILY
          </span>
        </div>
      </div>

      {/* Chart Content */}
      <div className="px-5 py-4">
        {/* Scale indicator */}
        <div className="flex justify-between items-center mb-2 px-4">
          <span className="text-[8px] font-mono text-gray-400">Scale: 0-100</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              <span className="text-[7px] text-gray-500">0-40: Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
              <span className="text-[7px] text-gray-500">40-70: Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
              <span className="text-[7px] text-gray-500">70-100: High</span>
            </div>
          </div>
        </div>

        <div className="w-full h-[220px] min-w-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={chartData}
            >
              <PolarGrid
                stroke="#e5e5e5"
                strokeDasharray="2 2"
              />
              <PolarAngleAxis
                dataKey="metric"
                tick={{
                  fill: '#6b7280',
                  fontSize: 13,
                  fontFamily: 'ui-monospace, monospace'
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
                  strokeWidth={1.5}
                />
              ))}

              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '13px',
                  fontFamily: 'ui-sans-serif, system-ui'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Breakdown Pie Chart */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="mb-3">
            <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">
              Cost Breakdown by Category
            </h4>
            <p className="text-[8px] text-gray-500 leading-relaxed">
              Distribution of total expenses across major categories
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
                    <span className="text-[9px] font-mono text-gray-600">
                      ₹{(item.amount / 1000).toFixed(1)}k
                    </span>
                    <span className="text-[8px] font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
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
          <summary className="cursor-pointer text-[9px] font-bold uppercase text-gray-400 hover:text-black flex items-center gap-1 select-none transition-colors list-none">
            <span className="text-[11px]">▸</span>
            <span className="group-open:hidden">Show Metrics & Scaling</span>
            <span className="hidden group-open:inline">Hide Metrics & Scaling</span>
          </summary>
          <div className="mt-2 bg-gray-50/50 border border-gray-100 p-2.5">
            <div className="mb-2 pb-2 border-b border-gray-200">
              <p className="text-[9px] font-bold text-gray-900 uppercase tracking-wider mb-1">
                Metrics scaled 0-100
              </p>
            </div>
            <div className="space-y-2 font-mono text-[8px] text-gray-600">
              {metricScaling.map((metric, index) => (
                <div key={index} className="pb-2 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="text-gray-900 font-bold">{metric.name}</span>
                    <span className="text-[7px] text-blue-600 font-semibold">{metric.range}</span>
                  </div>
                  <div className="text-[7px] text-gray-500 mb-0.5">{metric.description}</div>
                  <div className="text-[7px] bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                    <span className="text-gray-400">Formula:</span> {metric.formula}
                  </div>
                  <div className="text-[7px] text-gray-400 mt-0.5">
                    <span className="text-gray-500">Example:</span> {metric.example}
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
