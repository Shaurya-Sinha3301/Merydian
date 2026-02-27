"use client"

import React, { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from "recharts"
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react"

export const description = "Disruption Impact Simulator - Profit Recovery Line Chart"

// Mock timeline data to show disruption and recovery (Profit Margin %)
const chartData = [
    { time: "Day 1", planned: 68, optimized: 68 },
    { time: "Day 2", planned: 69, optimized: 69 },
    { time: "Day 3 (AM)", planned: 71, optimized: 71 },
    { time: "Day 3 (PM)", planned: 70, optimized: 45 }, // Disruption occurs here
    { time: "Day 4", planned: 72, optimized: 58 }, // Recovery begins
    { time: "Day 5", planned: 70, optimized: 65 }, // AI Optimization taking effect
    { time: "Day 6", planned: 71, optimized: 69 },
    { time: "Day 7", planned: 73, optimized: 72 }, // Near full recovery
]

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 shadow-lg p-3 rounded min-w-[150px]">
                <p className="text-[13px] font-semibold text-gray-900 mb-2 font-mono border-b border-gray-100 pb-1">
                    {label}
                </p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-sm"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-[12px] text-gray-600 capitalize">
                                    {entry.name}:
                                </span>
                            </div>
                            <span className="text-[12px] font-bold text-gray-900 font-mono">
                                {entry.value}%
                            </span>
                        </div>
                    ))}
                </div>
                {/* Detail difference if there is a gap */}
                {payload.length === 2 && payload[0].value !== payload[1].value && (
                    <div className="mt-2 pt-1.5 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[12px] text-gray-500 font-bold uppercase">Variance:</span>
                        <span className={`text-[12px] font-mono font-bold ${payload[1].value < payload[0].value ? 'text-red-500' : 'text-green-500'}`}>
                            {(payload[1].value - payload[0].value).toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>
        )
    }
    return null
}

export function DisruptionImpactChart() {
    // Always set to show the current disrupted state, static
    const currentPoint = chartData.find(d => d.time === "Day 3 (PM)") || chartData[3]

    return (
        <div className="border border-gray-200 bg-white shadow-sm">
            {/* Header matching dashboard style */}
            <div className="border-b border-gray-200 px-5 py-3 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span className="text-[16px] font-bold text-gray-900 tracking-tight">
                        Disruption Impact Simulator
                    </span>
                </div>
                <span className="text-[12px] font-mono text-gray-400 border border-gray-200 px-1.5 py-0.5 bg-white tracking-wider uppercase">
                    Live Recovery
                </span>
            </div>

            {/* Analytics Summary Banner */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="grid grid-cols-3 gap-6 w-full">
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Planned Yield</p>
                        <p className="text-[15px] font-mono font-bold text-gray-900">70.5%</p>
                    </div>
                    <div className="pl-4 border-l border-gray-200">
                        <p className="text-[11px] uppercase tracking-wider text-red-500 font-bold mb-0.5">Maximum Dip</p>
                        <div className="flex items-center gap-1.5">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            <p className="text-[15px] font-mono font-bold text-red-600">45.0%</p>
                        </div>
                    </div>
                    <div className="pl-4 border-l border-gray-200">
                        <p className="text-[11px] uppercase tracking-wider text-green-600 font-bold mb-0.5">Recovery Projection</p>
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <p className="text-[15px] font-mono font-bold text-gray-900">72.0%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Content */}
            <div className="px-5 py-6">
                <div className="w-full h-[240px] min-w-[200px] relative">

                    {/* Static Timeline Progress Indicator Label overlay */}
                    <div className="absolute top-0 right-0 flex items-center gap-2 bg-black text-white px-2 py-1 rounded text-[9px] font-mono shadow-md z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Disruption Point: {currentPoint.time}
                    </div>

                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f1f5f9"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="time"
                                tick={{
                                    fill: '#64748b',
                                    fontSize: 12,
                                    fontFamily: 'ui-monospace, monospace',
                                    fontWeight: 600
                                }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                domain={[30, 80]}
                                tick={{
                                    fill: '#94a3b8',
                                    fontSize: 12,
                                    fontFamily: 'ui-monospace, monospace'
                                }}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                                tickFormatter={(value) => `${value}%`}
                            />

                            <Tooltip content={<CustomTooltip />} />

                            <Legend
                                verticalAlign="top"
                                height={36}
                                iconType="plainline"
                                wrapperStyle={{
                                    fontSize: '13px',
                                    fontFamily: 'ui-sans-serif, system-ui',
                                    fontWeight: 600,
                                    color: '#475569',
                                    paddingBottom: '10px'
                                }}
                            />

                            {/* Planned Profit Line (Baseline) */}
                            <Line
                                type="monotone"
                                dataKey="planned"
                                name="Planned Profit"
                                stroke="#94a3b8"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }}
                                activeDot={{ r: 5 }}
                            />

                            {/* Optimized Profit Line (Actual with disruption) */}
                            <Line
                                type="monotone"
                                dataKey="optimized"
                                name="Optimized Profit"
                                stroke="#111827"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#111827', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6, fill: '#111827', strokeWidth: 0 }}
                            />

                            {/* Static dot on the disrupted state */}
                            <ReferenceDot
                                x={currentPoint.time}
                                y={currentPoint.optimized}
                                r={6}
                                fill="#ef4444"
                                stroke="#fff"
                                strokeWidth={2}
                                className="shadow-lg"
                            />
                            <ReferenceDot
                                x={currentPoint.time}
                                y={currentPoint.optimized}
                                r={4}
                                fill="#fff"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Footer Insight */}
            <div className="bg-red-50/50 border-t border-red-100 px-5 py-3">
                <div className="flex items-start gap-3">
                    <TrendingDown className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-gray-700 leading-relaxed">
                        <strong className="text-gray-900 font-bold uppercase tracking-wider text-[12px] mr-1">Anomaly Alert:</strong>
                        A major transportation strike occurred on Day 3 (PM), causing margins to plummet to 45% due to emergency cab surges. By using Voyageur AI's automated restructuring logic, alternative group transport scaled recovery back to 72% by Day 7.
                    </p>
                </div>
            </div>
        </div>
    )
}
