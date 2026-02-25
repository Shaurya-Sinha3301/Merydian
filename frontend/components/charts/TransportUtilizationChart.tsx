"use client"

import { TrendingUp, AlertTriangle } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, Tooltip } from "recharts"

export const description = "Transport Utilization Efficiency Score with Multi-Family Comparison"

// Transport utilization data for multiple families across different modes
const chartData = [
  { 
    mode: "Metro",
    kumar: 85,
    sharma: 78,
    patel: 92,
    gupta: 88,
  },
  { 
    mode: "Cab",
    kumar: 65,
    sharma: 72,
    patel: 58,
    gupta: 70,
  },
  { 
    mode: "Bus",
    kumar: 75,
    sharma: 82,
    patel: 79,
    gupta: 76,
  },
  { 
    mode: "Train",
    kumar: 90,
    sharma: 85,
    patel: 88,
    gupta: 92,
  },
  { 
    mode: "Flight",
    kumar: 70,
    sharma: 68,
    patel: 75,
    gupta: 72,
  },
]

// Key metrics for transport efficiency
const keyMetrics = [
  { label: "Utilization %", value: "82.4%", trend: "+5.2%", positive: true },
  { label: "Cost per Minute", value: "₹12.50", trend: "-8.1%", positive: true },
  { label: "Satisfaction Yield", value: "8.2/10", trend: "+0.4", positive: true },
  { label: "Empty Route Time", value: "15.3%", trend: "+2.1%", positive: false },
]

// Mode dependency risk data
const dependencyRisk = [
  { mode: "Metro", risk: "Low", score: 25, color: "#6B8E7F" },
  { mode: "Cab", risk: "High", score: 85, color: "#C17767" },
  { mode: "Bus", risk: "Medium", score: 45, color: "#A08B7A" },
  { mode: "Train", risk: "Low", score: 30, color: "#6B8E7F" },
  { mode: "Flight", risk: "Medium", score: 55, color: "#A08B7A" },
]

// Family metadata
const families = [
  { id: 'kumar', name: 'Kumar Family', color: '#8B7355' },
  { id: 'sharma', name: 'Sharma Family', color: '#6B8E7F' },
  { id: 'patel', name: 'Patel Family', color: '#7B8FA3' },
  { id: 'gupta', name: 'Gupta Family', color: '#A08B7A' },
]

// Custom tooltip
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
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export function TransportUtilizationChart() {
  return (
    <div className="border border-gray-200 bg-white">
      {/* Header matching dashboard style */}
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[14px] font-semibold capitalize text-gray-900 tracking-tight flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 shrink-0" />
            Transport Utilization Efficiency Score
          </span>
          <span className="text-[10px] font-mono text-gray-400 border border-gray-200 px-1.5 py-0.5">
            MULTI-MODE
          </span>
        </div>
        <p className="text-[11px] text-gray-500 tracking-tight">
          Efficiency analysis across transport modes and families
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="grid grid-cols-4 gap-3">
          {keyMetrics.map((metric, index) => (
            <div 
              key={index}
              className="p-3 border border-gray-100 bg-gray-50/30"
            >
              <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">
                {metric.label}
              </div>
              <div className="text-[16px] font-mono font-bold text-gray-900 mb-0.5">
                {metric.value}
              </div>
              <div className={`text-[9px] font-mono ${metric.positive ? 'text-green-600' : 'text-red-600'}`}>
                {metric.trend}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Content */}
      <div className="px-5 py-4">
        <div className="w-full h-[250px]">
          <BarChart 
            width={700} 
            height={250} 
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="2 2" 
              stroke="#e5e5e5"
              vertical={false}
            />
            <XAxis 
              dataKey="mode"
              tick={{ 
                fill: '#6b7280', 
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace'
              }}
              axisLine={{ stroke: '#e5e5e5' }}
              tickLine={false}
            />
            <YAxis
              tick={{ 
                fill: '#6b7280', 
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace'
              }}
              axisLine={{ stroke: '#e5e5e5' }}
              tickLine={false}
              label={{ 
                value: 'Efficiency %', 
                angle: -90, 
                position: 'insideLeft',
                style: { 
                  fontSize: 10, 
                  fill: '#9ca3af',
                  fontFamily: 'ui-monospace, monospace'
                }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '11px',
                fontFamily: 'ui-sans-serif, system-ui'
              }}
            />
            
            {/* Bar for each family */}
            {families.map((family) => (
              <Bar
                key={family.id}
                dataKey={family.id}
                name={family.name}
                fill={family.color}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </div>

        {/* Mode Dependency Risk Index */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
              Mode Dependency Risk Index
            </span>
          </div>
          
          <div className="space-y-2.5">
            {dependencyRisk.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-20 text-[10px] font-mono text-gray-600">
                  {item.mode}
                </div>
                <div className="flex-1 relative h-6 bg-gray-100 border border-gray-200">
                  <div 
                    className="absolute left-0 top-0 h-full transition-all"
                    style={{ 
                      width: `${item.score}%`,
                      backgroundColor: item.color,
                      opacity: 0.6
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-[9px] font-mono font-bold text-gray-900">
                      {item.score}
                    </span>
                  </div>
                </div>
                <div className={`w-16 text-[9px] font-bold uppercase tracking-wider text-right ${
                  item.risk === 'Low' ? 'text-green-600' : 
                  item.risk === 'High' ? 'text-red-600' : 
                  'text-orange-600'
                }`}>
                  {item.risk}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Causal Chain Insight */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <details className="group">
            <summary className="cursor-pointer text-[10px] font-bold uppercase text-gray-400 hover:text-black flex items-center gap-1 select-none transition-colors list-none">
              <span className="text-[12px]">▸</span>
              <span className="group-open:hidden">Show Causal Chain Analysis</span>
              <span className="hidden group-open:inline">Hide Causal Chain Analysis</span>
            </summary>
            <div className="mt-3 bg-gray-50/50 border border-gray-100 p-4">
              <div className="space-y-3">
                {/* Example causal chain */}
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <div className="px-2 py-1 bg-green-100 text-green-800 border border-green-200">
                    Metro (Day 1)
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="px-2 py-1 bg-green-100 text-green-800 border border-green-200">
                    Low Cost
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="px-2 py-1 bg-green-100 text-green-800 border border-green-200">
                    High Efficiency
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <div className="px-2 py-1 bg-red-100 text-red-800 border border-red-200">
                    Strike: Metro Removed
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="px-2 py-1 bg-red-100 text-red-800 border border-red-200">
                    Cab Surge
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="px-2 py-1 bg-red-100 text-red-800 border border-red-200">
                    Cost Increase
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 text-[9px] text-gray-600 leading-relaxed">
                  <span className="font-bold text-gray-900">Analysis:</span> Metro dependency creates vulnerability. 
                  When unavailable, families shift to cabs, increasing costs by 3.2x and reducing satisfaction by 18%.
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
