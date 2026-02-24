"use client"

import { Radar as RadarIcon } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, Legend, Tooltip } from "recharts"

export const description = "Cost Per Family Radar Chart with Multi-Family Comparison"

// Analytical metrics for multiple families
const chartData = [
  { 
    metric: "Total Cost",
    family1: 186,
    family2: 220,
    family3: 165,
    family4: 195,
  },
  { 
    metric: "Transport %",
    family1: 75,
    family2: 68,
    family3: 82,
    family4: 71,
  },
  { 
    metric: "Satisfaction",
    family1: 85,
    family2: 78,
    family3: 92,
    family4: 88,
  },
  { 
    metric: "Value/₹",
    family1: 68,
    family2: 82,
    family3: 75,
    family4: 79,
  },
  { 
    metric: "POIs",
    family1: 92,
    family2: 85,
    family3: 88,
    family4: 90,
  },
  { 
    metric: "Alignment",
    family1: 78,
    family2: 88,
    family3: 72,
    family4: 85,
  },
  { 
    metric: "Margin",
    family1: 65,
    family2: 72,
    family3: 68,
    family4: 70,
  },
]

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
  return (
    <div className="border border-gray-200 bg-white">
      {/* Header matching dashboard style */}
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[14px] font-semibold capitalize text-gray-900 tracking-tight flex items-center gap-1.5">
            <RadarIcon className="w-4 h-4 shrink-0" />
            Cost Per Family Analysis
          </span>
          <span className="text-[10px] font-mono text-gray-400 border border-gray-200 px-1.5 py-0.5">
            MULTI-FAMILY
          </span>
        </div>
        <p className="text-[11px] text-gray-500 tracking-tight">
          Comparative metrics across 7 key dimensions
        </p>
      </div>

      {/* Chart Content */}
      <div className="px-5 py-6">
        <div className="w-full h-[400px] relative">
          <RadarChart 
            width={600} 
            height={400} 
            data={chartData}
            className="mx-auto"
          >
            <PolarGrid 
              stroke="#e5e5e5" 
              strokeDasharray="2 2"
            />
            <PolarAngleAxis 
              dataKey="metric"
              tick={{ 
                fill: '#6b7280', 
                fontSize: 11,
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
                fontSize: '11px',
                fontFamily: 'ui-sans-serif, system-ui'
              }}
            />
          </RadarChart>
        </div>

        {/* Family Legend with Stats - Dashboard Style */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            {families.map((family) => (
              <div 
                key={family.id}
                className="flex items-center gap-2 p-2.5 border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-colors"
              >
                <div 
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: family.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-gray-900 truncate">
                    {family.name}
                  </div>
                  <div className="text-[9px] font-mono text-gray-400">
                    {family.members} members
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric Definitions */}
        <details className="mt-4 group">
          <summary className="cursor-pointer text-[10px] font-bold uppercase text-gray-400 hover:text-black flex items-center gap-1 select-none transition-colors list-none">
            <span className="text-[12px]">▸</span>
            <span className="group-open:hidden">Show Metric Definitions</span>
            <span className="hidden group-open:inline">Hide Metric Definitions</span>
          </summary>
          <div className="mt-3 bg-gray-50/50 border border-gray-100 p-3">
            <div className="space-y-1.5 font-mono text-[9px] text-gray-600 leading-relaxed">
              <div><span className="text-gray-900 font-bold">Total Cost:</span> Normalized cost index (0-250)</div>
              <div><span className="text-gray-900 font-bold">Transport %:</span> Transportation cost as % of total</div>
              <div><span className="text-gray-900 font-bold">Satisfaction:</span> Aggregate satisfaction score (0-100)</div>
              <div><span className="text-gray-900 font-bold">Value/₹:</span> Satisfaction per rupee spent</div>
              <div><span className="text-gray-900 font-bold">POIs:</span> Points of interest coverage score</div>
              <div><span className="text-gray-900 font-bold">Alignment:</span> Preference alignment percentage</div>
              <div><span className="text-gray-900 font-bold">Margin:</span> Contribution margin percentage</div>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
