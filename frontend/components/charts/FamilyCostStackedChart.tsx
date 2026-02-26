"use client"

import React, { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, Tooltip, ResponsiveContainer } from "recharts"
import { Banknote, CreditCard, LayoutList, Layers } from "lucide-react"

export const description = "Family Cost Breakdown - Total vs Day-wise Stacked Chart"

// Mock data structure containing family names, distinct daily costs, and total cost
const chartData = [
    {
        family: "Kumar Fam",
        day1: 85000,
        day2: 62000,
        day3: 39000,
        total: 186000,
    },
    {
        family: "Sharma Fam",
        day1: 95000,
        day2: 70000,
        day3: 55000,
        total: 220000,
    },
    {
        family: "Patel Fam",
        day1: 72000,
        day2: 54000,
        day3: 39000,
        total: 165000,
    },
    {
        family: "Gupta Fam",
        day1: 82000,
        day2: 65000,
        day3: 48000,
        total: 195000,
    },
]

// Colors for the stacked bars mapping to days
const colors = {
    day1: "#8B7355", // Brown/Gold
    day2: "#6B8E7F", // Sage Green
    day3: "#7B8FA3", // Slate Blue
    total: "#111827", // Dark Gray (for total view)
}

// Custom Tooltip for the Day-wise View
const StackedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);

        return (
            <div className="bg-white border border-gray-200 shadow-lg p-3 rounded">
                <p className="text-[13px] font-semibold text-gray-900 mb-2 font-mono border-b border-gray-100 pb-1">
                    {label}
                </p>
                <div className="space-y-1.5 mb-2">
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
                                ₹{(entry.value / 1000).toFixed(1)}k
                            </span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center gap-4 pt-1.5 border-t border-gray-100">
                    <span className="text-[12px] font-bold text-gray-900">Total:</span>
                    <span className="text-[13px] font-extrabold text-gray-900 font-mono">
                        ₹{(total / 1000).toFixed(1)}k
                    </span>
                </div>
            </div>
        )
    }
    return null
}

// Custom Tooltip for the Total View
const TotalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 shadow-lg p-3 rounded">
                <p className="text-[13px] font-semibold text-gray-900 mb-2 font-mono">
                    {label}
                </p>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm bg-gray-900" />
                        <span className="text-[12px] text-gray-600">Total Cost:</span>
                    </div>
                    <span className="text-[13px] font-extrabold text-gray-900 font-mono">
                        ₹{(payload[0].value / 1000).toFixed(1)}k
                    </span>
                </div>
            </div>
        )
    }
    return null
}

export function FamilyCostStackedChart() {
    const [viewMode, setViewMode] = useState<"total" | "day-wise">("total")

    return (
        <div className="border border-gray-200 bg-white">
            {/* Header mapping to dashboard style */}
            <div className="border-b border-gray-200 px-5 py-3 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-gray-700 shrink-0" />
                    <span className="text-[16px] font-bold text-gray-900 tracking-tight">
                        Family Cost Overview
                    </span>
                </div>

                {/* View Toggle */}
                <div className="flex bg-gray-200/50 p-1 rounded-md border border-gray-200">
                    <button
                        onClick={() => setViewMode("total")}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[12px] font-bold rounded transition-all ${viewMode === "total"
                            ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <LayoutList className="w-4 h-4" />
                        TOTAL COST
                    </button>
                    <button
                        onClick={() => setViewMode("day-wise")}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[12px] font-bold rounded transition-all ${viewMode === "day-wise"
                            ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <Layers className="w-4 h-4" />
                        DAY-WISE
                    </button>
                </div>
            </div>

            {/* Analytics Summary Banner */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Avg Cost / Family</p>
                        <p className="text-[15px] font-mono font-bold text-gray-900">₹191.5k</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Highest Expense Day</p>
                        <p className="text-[15px] font-mono font-bold text-gray-900 capitalize">Day 1 (₹334k)</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[12px] text-gray-500 font-medium italic">
                        {viewMode === "total" ? "Showing aggregate trip cost per family." : "Showing trip cost broken down by itinerary days."}
                    </p>
                </div>
            </div>

            {/* Chart Content */}
            <div className="px-5 py-6">
                <div className="w-full h-[220px] min-w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f1f5f9"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="family"
                                tick={{
                                    fill: '#64748b',
                                    fontSize: 13,
                                    fontFamily: 'ui-monospace, monospace',
                                    fontWeight: 600
                                }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{
                                    fill: '#94a3b8',
                                    fontSize: 12,
                                    fontFamily: 'ui-monospace, monospace'
                                }}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                                tickFormatter={(value) => `₹${value / 1000}k`}
                            />

                            {viewMode === "total" ? (
                                <>
                                    <Tooltip content={<TotalTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Bar
                                        dataKey="total"
                                        name="Total Cost"
                                        fill={colors.total}
                                        radius={[4, 4, 0, 0]}
                                        barSize={45}
                                    />
                                </>
                            ) : (
                                <>
                                    <Tooltip content={<StackedTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Legend
                                        verticalAlign="top"
                                        height={36}
                                        iconType="circle"
                                        iconSize={10}
                                        wrapperStyle={{
                                            fontSize: '13px',
                                            fontFamily: 'ui-sans-serif, system-ui',
                                            fontWeight: 600,
                                            color: '#475569'
                                        }}
                                    />
                                    <Bar
                                        dataKey="day1"
                                        name="Day 1"
                                        stackId="a"
                                        fill={colors.day1}
                                        barSize={45}
                                    />
                                    <Bar
                                        dataKey="day2"
                                        name="Day 2"
                                        stackId="a"
                                        fill={colors.day2}
                                        barSize={45}
                                    />
                                    <Bar
                                        dataKey="day3"
                                        name="Day 3"
                                        stackId="a"
                                        fill={colors.day3}
                                        radius={[4, 4, 0, 0]}
                                        barSize={45}
                                    />
                                </>
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Footer Insight */}
            <div className="bg-gray-50/50 border-t border-gray-100 px-5 py-3">
                <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-gray-600 leading-relaxed">
                        <strong className="text-gray-900 font-bold uppercase tracking-wider text-[12px] mr-1">Cost Insight:</strong>
                        Day 1 consistently represents the highest cost burden across all families, primarily driven by initial arrival logistics and premium welcome dinner experiences. Consider bundling Transport & Stay logic for days 2 and 3 into Day 1 negotiations.
                    </p>
                </div>
            </div>
        </div>
    )
}
