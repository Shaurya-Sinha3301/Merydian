"use client"

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartData = [{ month: "january", revenue: 1260, satisfaction: 870 }]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#D4AF37",
  },
  satisfaction: {
    label: "Satisfaction",
    color: "#FFFFFF",
  },
} satisfies ChartConfig

export function RadialChartStacked() {
  const totalValue = chartData[0].revenue + chartData[0].satisfaction

  return (
    <ChartContainer
      id="radial-chart-landing"
      config={chartConfig}
      className="mx-auto w-full"
      style={{ aspectRatio: '1', maxWidth: '200px', minHeight: '200px' }}
    >
      <RadialBarChart
        data={chartData}
        endAngle={180}
        innerRadius={60}
        outerRadius={100}
      >
        <ChartTooltip 
          cursor={false} 
          content={<ChartTooltipContent hideLabel />} 
        />
        <PolarRadiusAxis 
          tick={false} 
          tickLine={false} 
          axisLine={false}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) - 12}
                      className="fill-white text-2xl font-serif"
                    >
                      {totalValue.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 8}
                      className="fill-white/60 text-xs font-light"
                    >
                      Total Score
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </PolarRadiusAxis>
        <RadialBar
          dataKey="revenue"
          stackId="a"
          cornerRadius={5}
          fill="#D4AF37"
          className="stroke-transparent stroke-2"
        />
        <RadialBar
          dataKey="satisfaction"
          fill="#FFFFFF"
          stackId="a"
          cornerRadius={5}
          className="stroke-transparent stroke-2"
        />
      </RadialBarChart>
    </ChartContainer>
  )
}
