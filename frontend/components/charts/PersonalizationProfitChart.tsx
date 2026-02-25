"use client"

import { TrendingUp, Target } from "lucide-react"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, ReferenceLine, Label } from "recharts"

export const description = "Personalization vs Profit Tradeoff - Efficiency Frontier"

// Possible itinerary solutions plotted on the frontier
const frontierData = [
  { personalization: 45, margin: 78, type: "frontier", label: "High Profit" },
  { personalization: 55, margin: 75, type: "frontier" },
  { personalization: 65, margin: 72, type: "frontier" },
  { personalization: 72, margin: 68, type: "frontier", label: "Optimal" },
  { personalization: 78, margin: 62, type: "frontier" },
  { personalization: 85, margin: 55, type: "frontier" },
  { personalization: 92, margin: 45, type: "frontier", label: "High Personal" },
]

// Current chosen solution and alternatives
const solutionPoints = [
  { personalization: 72, margin: 68, type: "chosen", label: "Current Solution", size: 120 },
  { personalization: 58, margin: 52, type: "suboptimal", label: "Alt 1", size: 60 },
  { personalization: 82, margin: 48, type: "suboptimal", label: "Alt 2", size: 60 },
  { personalization: 65, margin: 58, type: "suboptimal", label: "Alt 3", size: 60 },
]

// Time series data for derived metrics
const timeSeriesData = [
  { day: "Day 1", personalizationIndex: 65, profitProtectionIndex: 72 },
  { day: "Day 2", personalizationIndex: 68, profitProtectionIndex: 70 },
  { day: "Day 3", personalizationIndex: 70, profitProtectionIndex: 69 },
  { day: "Day 4", personalizationIndex: 72, profitProtectionIndex: 68 },
  { day: "Day 5", personalizationIndex: 72, profitProtectionIndex: 68 },
]

// Derived metrics
const derivedMetrics = [
  { 
    label: "Personalization Index", 
    value: "72%", 
    formula: "(Preference Alignment + Must-Visit Adherence) / Total Constraints",
    description: "Measures how well the itinerary matches family preferences"
  },
  { 
    label: "Profit Protection Index", 
    value: "68%", 
    formula: "(Actual Margin / Maximum Feasible Margin) × 100",
    description: "Shows margin efficiency vs theoretical maximum"
  },
]

// Custom tooltip for scatter plot
const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-gray-200 shadow-lg p-3 rounded">
        <p className="text-[10px] font-bold text-gray-900 mb-1.5">
          {data.label || "Solution Point"}
        </p>
        <div className="space-y-0.5 text-[9px]">
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Personalization:</span>
            <span className="font-mono font-bold text-gray-900">{data.personalization}%</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Margin:</span>
            <span className="font-mono font-bold text-gray-900">{data.margin}%</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// Custom tooltip for time series
const CustomTimeTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 shadow-lg p-3 rounded">
        <p className="text-[10px] font-bold text-gray-900 mb-1.5">{label}</p>
        <div className="space-y-0.5 text-[9px]">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-600">
                  {entry.dataKey === 'personalizationIndex' ? 'Personalization' : 'Profit Protection'}:
                </span>
              </div>
              <span className="font-mono font-bold text-gray-900">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export function PersonalizationProfitChart() {
  return (
    <div className="border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[14px] font-semibold capitalize text-gray-900 tracking-tight flex items-center gap-1.5">
            <Target className="w-4 h-4 shrink-0" />
            Personalization vs Profit Tradeoff
          </span>
          <span className="text-[10px] font-mono text-gray-400 border border-gray-200 px-1.5 py-0.5">
            EFFICIENCY FRONTIER
          </span>
        </div>
        <p className="text-[11px] text-gray-500 tracking-tight">
          Optimal balance between customer satisfaction and business margin
        </p>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-2 gap-4 p-5">
        
        {/* Left: Frontier Curve */}
        <div>
          <div className="mb-3">
            <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">
              Efficiency Frontier
            </h4>
            <p className="text-[8px] text-gray-500 leading-relaxed">
              Each point represents a possible itinerary solution. The curve shows optimal tradeoffs.
            </p>
          </div>
          
          <div className="w-full h-[200px] border border-gray-100 bg-gray-50/30 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e5e5e5" />
                <XAxis 
                  type="number" 
                  dataKey="personalization" 
                  name="Personalization"
                  domain={[40, 95]}
                  tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                >
                  <Label 
                    value="Personalization Score (%)" 
                    position="bottom" 
                    style={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'ui-monospace, monospace' }}
                    offset={5}
                  />
                </XAxis>
                <YAxis 
                  type="number" 
                  dataKey="margin" 
                  name="Margin"
                  domain={[40, 80]}
                  tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                >
                  <Label 
                    value="Margin (%)" 
                    angle={-90} 
                    position="left" 
                    style={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'ui-monospace, monospace' }}
                    offset={5}
                  />
                </YAxis>
                <Tooltip content={<CustomScatterTooltip />} />
                
                {/* Frontier line */}
                <Scatter 
                  data={frontierData} 
                  fill="#7B8FA3" 
                  line={{ stroke: '#7B8FA3', strokeWidth: 2 }}
                  shape="circle"
                />
                
                {/* Solution points */}
                <Scatter 
                  data={solutionPoints.filter(p => p.type === 'chosen')} 
                  fill="#6B8E7F"
                  shape="circle"
                />
                <Scatter 
                  data={solutionPoints.filter(p => p.type === 'suboptimal')} 
                  fill="#C17767"
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-[8px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#7B8FA3]"></div>
              <span className="text-gray-600">Frontier</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#6B8E7F]"></div>
              <span className="text-gray-600 font-bold">Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#C17767]"></div>
              <span className="text-gray-600">Suboptimal</span>
            </div>
          </div>

          {/* Interpretation */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="space-y-1.5 text-[8px] font-mono">
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">↓</span>
                <span className="text-gray-600">Too personalized → Margin drops</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">↓</span>
                <span className="text-gray-600">Too profit-focused → Satisfaction drops</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-900 font-bold">Optimal point balances both</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Time Series & Metrics */}
        <div>
          <div className="mb-3">
            <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">
              Derived Metrics Over Time
            </h4>
            <p className="text-[8px] text-gray-500 leading-relaxed">
              Track how personalization and profit protection evolve throughout the trip.
            </p>
          </div>

          <div className="w-full h-[200px] border border-gray-100 bg-gray-50/30 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e5e5e5" vertical={false} />
                <XAxis 
                  dataKey="day"
                  tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                />
                <YAxis
                  domain={[60, 75]}
                  tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                >
                  <Label 
                    value="Index (%)" 
                    angle={-90} 
                    position="left" 
                    style={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'ui-monospace, monospace' }}
                    offset={5}
                  />
                </YAxis>
                <Tooltip content={<CustomTimeTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="personalizationIndex" 
                  stroke="#8B7355" 
                  strokeWidth={2}
                  dot={{ fill: '#8B7355', r: 3 }}
                  name="Personalization"
                />
                <Line 
                  type="monotone" 
                  dataKey="profitProtectionIndex" 
                  stroke="#6B8E7F" 
                  strokeWidth={2}
                  dot={{ fill: '#6B8E7F', r: 3 }}
                  name="Profit Protection"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Metric Cards */}
          <div className="mt-3 space-y-2">
            {derivedMetrics.map((metric, index) => (
              <div key={index} className="border border-gray-100 bg-white p-2.5">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[9px] font-bold text-gray-900">{metric.label}</span>
                  <span className="text-[13px] font-mono font-bold text-gray-900">{metric.value}</span>
                </div>
                <div className="text-[7px] text-gray-500 mb-1 leading-relaxed">
                  {metric.description}
                </div>
                <div className="text-[7px] bg-gray-50 border border-gray-100 px-1.5 py-1 rounded font-mono text-gray-600">
                  {metric.formula}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Insight */}
      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/30">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-[9px] text-gray-600 leading-relaxed">
            <span className="font-bold text-gray-900">Current Position:</span> Your solution sits on the efficiency frontier at 72% personalization and 68% margin, 
            representing an optimal balance. Moving further right would sacrifice 4-6% margin for each 10% personalization gain.
          </div>
        </div>
      </div>
    </div>
  )
}
