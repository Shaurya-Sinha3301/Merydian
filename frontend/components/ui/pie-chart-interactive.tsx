"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import { type PieSectorDataItem } from "recharts/types/polar/Pie"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const desktopData = [
  { month: "january", desktop: 186, fill: "#D4AF37" },
  { month: "february", desktop: 305, fill: "#C4A137" },
  { month: "march", desktop: 237, fill: "#B49337" },
  { month: "april", desktop: 173, fill: "#A48537" },
  { month: "may", desktop: 209, fill: "#947737" },
]

const chartConfig = {
  desktop: {
    label: "Bookings",
  },
  january: {
    label: "January",
    color: "#D4AF37",
  },
  february: {
    label: "February",
    color: "#C4A137",
  },
  march: {
    label: "March",
    color: "#B49337",
  },
  april: {
    label: "April",
    color: "#A48537",
  },
  may: {
    label: "May",
    color: "#947737",
  },
} satisfies ChartConfig

export function PieChartInteractive() {
  const id = "pie-interactive"
  const [activeMonth, setActiveMonth] = React.useState(desktopData[0].month)

  const activeIndex = React.useMemo(
    () => desktopData.findIndex((item) => item.month === activeMonth),
    [activeMonth]
  )

  return (
    <ChartContainer
      id={id}
      config={chartConfig}
      className="mx-auto aspect-square w-full max-w-[200px]"
    >
      <PieChart>
        <ChartTooltip 
          cursor={false} 
          content={<ChartTooltipContent hideLabel />} 
        />
        <Pie
          data={desktopData}
          dataKey="desktop"
          nameKey="month"
          innerRadius={50}
          outerRadius={80}
          strokeWidth={5}
          activeShape={({
            outerRadius = 0,
            ...props
          }: PieSectorDataItem) => (
            <g>
              <Sector {...props} outerRadius={outerRadius + 8} />
              <Sector
                {...props}
                outerRadius={outerRadius + 20}
                innerRadius={outerRadius + 10}
              />
            </g>
          )}
        >
          <Label
            content={({ viewBox }) => {
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
                      y={viewBox.cy}
                      className="fill-white text-2xl font-serif"
                    >
                      {desktopData[activeIndex].desktop.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 20}
                      className="fill-white/60 text-xs font-light"
                    >
                      Bookings
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
