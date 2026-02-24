"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartData = [
  { date: "2024-04-01", revenue: 222, bookings: 150 },
  { date: "2024-04-02", revenue: 97, bookings: 180 },
  { date: "2024-04-03", revenue: 167, bookings: 120 },
  { date: "2024-04-04", revenue: 242, bookings: 260 },
  { date: "2024-04-05", revenue: 373, bookings: 290 },
  { date: "2024-04-06", revenue: 301, bookings: 340 },
  { date: "2024-04-07", revenue: 245, bookings: 180 },
  { date: "2024-04-08", revenue: 409, bookings: 320 },
  { date: "2024-04-09", revenue: 59, bookings: 110 },
  { date: "2024-04-10", revenue: 261, bookings: 190 },
  { date: "2024-04-11", revenue: 327, bookings: 350 },
  { date: "2024-04-12", revenue: 292, bookings: 210 },
  { date: "2024-04-13", revenue: 342, bookings: 380 },
  { date: "2024-04-14", revenue: 137, bookings: 220 },
  { date: "2024-04-15", revenue: 120, bookings: 170 },
  { date: "2024-04-16", revenue: 138, bookings: 190 },
  { date: "2024-04-17", revenue: 446, bookings: 360 },
  { date: "2024-04-18", revenue: 364, bookings: 410 },
  { date: "2024-04-19", revenue: 243, bookings: 180 },
  { date: "2024-04-20", revenue: 89, bookings: 150 },
  { date: "2024-04-21", revenue: 137, bookings: 200 },
  { date: "2024-04-22", revenue: 224, bookings: 170 },
  { date: "2024-04-23", revenue: 138, bookings: 230 },
  { date: "2024-04-24", revenue: 387, bookings: 290 },
  { date: "2024-04-25", revenue: 215, bookings: 250 },
  { date: "2024-04-26", revenue: 75, bookings: 130 },
  { date: "2024-04-27", revenue: 383, bookings: 420 },
  { date: "2024-04-28", revenue: 122, bookings: 180 },
  { date: "2024-04-29", revenue: 315, bookings: 240 },
  { date: "2024-04-30", revenue: 454, bookings: 380 },
  { date: "2024-05-01", revenue: 165, bookings: 220 },
  { date: "2024-05-02", revenue: 293, bookings: 310 },
  { date: "2024-05-03", revenue: 247, bookings: 190 },
  { date: "2024-05-04", revenue: 385, bookings: 420 },
  { date: "2024-05-05", revenue: 481, bookings: 390 },
  { date: "2024-05-06", revenue: 498, bookings: 520 },
  { date: "2024-05-07", revenue: 388, bookings: 300 },
  { date: "2024-05-08", revenue: 149, bookings: 210 },
  { date: "2024-05-09", revenue: 227, bookings: 180 },
  { date: "2024-05-10", revenue: 293, bookings: 330 },
  { date: "2024-05-11", revenue: 335, bookings: 270 },
  { date: "2024-05-12", revenue: 197, bookings: 240 },
  { date: "2024-05-13", revenue: 197, bookings: 160 },
  { date: "2024-05-14", revenue: 448, bookings: 490 },
  { date: "2024-05-15", revenue: 473, bookings: 380 },
  { date: "2024-05-16", revenue: 338, bookings: 400 },
  { date: "2024-05-17", revenue: 499, bookings: 420 },
  { date: "2024-05-18", revenue: 315, bookings: 350 },
  { date: "2024-05-19", revenue: 235, bookings: 180 },
  { date: "2024-05-20", revenue: 177, bookings: 230 },
  { date: "2024-05-21", revenue: 82, bookings: 140 },
  { date: "2024-05-22", revenue: 81, bookings: 120 },
  { date: "2024-05-23", revenue: 252, bookings: 290 },
  { date: "2024-05-24", revenue: 294, bookings: 220 },
  { date: "2024-05-25", revenue: 201, bookings: 250 },
  { date: "2024-05-26", revenue: 213, bookings: 170 },
  { date: "2024-05-27", revenue: 420, bookings: 460 },
  { date: "2024-05-28", revenue: 233, bookings: 190 },
  { date: "2024-05-29", revenue: 78, bookings: 130 },
  { date: "2024-05-30", revenue: 340, bookings: 280 },
  { date: "2024-05-31", revenue: 178, bookings: 230 },
  { date: "2024-06-01", revenue: 178, bookings: 200 },
  { date: "2024-06-02", revenue: 470, bookings: 410 },
  { date: "2024-06-03", revenue: 103, bookings: 160 },
  { date: "2024-06-04", revenue: 439, bookings: 380 },
  { date: "2024-06-05", revenue: 88, bookings: 140 },
  { date: "2024-06-06", revenue: 294, bookings: 250 },
  { date: "2024-06-07", revenue: 323, bookings: 370 },
  { date: "2024-06-08", revenue: 385, bookings: 320 },
  { date: "2024-06-09", revenue: 438, bookings: 480 },
  { date: "2024-06-10", revenue: 155, bookings: 200 },
  { date: "2024-06-11", revenue: 92, bookings: 150 },
  { date: "2024-06-12", revenue: 492, bookings: 420 },
  { date: "2024-06-13", revenue: 81, bookings: 130 },
  { date: "2024-06-14", revenue: 426, bookings: 380 },
  { date: "2024-06-15", revenue: 307, bookings: 350 },
  { date: "2024-06-16", revenue: 371, bookings: 310 },
  { date: "2024-06-17", revenue: 475, bookings: 520 },
  { date: "2024-06-18", revenue: 107, bookings: 170 },
  { date: "2024-06-19", revenue: 341, bookings: 290 },
  { date: "2024-06-20", revenue: 408, bookings: 450 },
  { date: "2024-06-21", revenue: 169, bookings: 210 },
  { date: "2024-06-22", revenue: 317, bookings: 270 },
  { date: "2024-06-23", revenue: 480, bookings: 530 },
  { date: "2024-06-24", revenue: 132, bookings: 180 },
  { date: "2024-06-25", revenue: 141, bookings: 190 },
  { date: "2024-06-26", revenue: 434, bookings: 380 },
  { date: "2024-06-27", revenue: 448, bookings: 490 },
  { date: "2024-06-28", revenue: 149, bookings: 200 },
  { date: "2024-06-29", revenue: 103, bookings: 160 },
  { date: "2024-06-30", revenue: 446, bookings: 400 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#D4AF37",
  },
  bookings: {
    label: "Bookings",
    color: "#FFFFFF",
  },
} satisfies ChartConfig

export function AreaChartInteractive() {
  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    const daysToSubtract = 90
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: '220px', minHeight: '220px' }}
    >
      <AreaChart data={filteredData}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="#D4AF37"
              stopOpacity={0.9}
            />
            <stop
              offset="95%"
              stopColor="#D4AF37"
              stopOpacity={0.2}
            />
          </linearGradient>
          <linearGradient id="fillBookings" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="#FFFFFF"
              stopOpacity={0.7}
            />
            <stop
              offset="95%"
              stopColor="#FFFFFF"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <CartesianGrid 
          vertical={false} 
          stroke="#FFFFFF" 
          strokeOpacity={0.2}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={{ stroke: '#FFFFFF', strokeOpacity: 0.5, strokeWidth: 1.5 }}
          tickMargin={8}
          minTickGap={32}
          tick={{ fill: '#FFFFFF', opacity: 0.8, fontSize: 12, fontWeight: 300 }}
          tickFormatter={(value: string) => {
            const date = new Date(value)
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={{ stroke: '#FFFFFF', strokeOpacity: 0.5, strokeWidth: 1.5 }}
          tickMargin={8}
          tick={{ fill: '#FFFFFF', opacity: 0.8, fontSize: 12, fontWeight: 300 }}
          tickFormatter={(value: number) => `${value}`}
        />
        <ChartTooltip
          cursor={{ stroke: '#D4AF37', strokeWidth: 1, strokeOpacity: 0.3 }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                return new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              }}
              indicator="dot"
            />
          }
        />
        <Area
          dataKey="bookings"
          type="natural"
          fill="url(#fillBookings)"
          stroke="#FFFFFF"
          strokeWidth={2.5}
          stackId="a"
        />
        <Area
          dataKey="revenue"
          type="natural"
          fill="url(#fillRevenue)"
          stroke="#D4AF37"
          strokeWidth={2.5}
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  )
}
