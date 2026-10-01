"use client"

import { useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ChartPeriod = "today" | "month" | "quarter" | "year"

const sampleData: Record<ChartPeriod, { label: string; sales: number }[]> = {
  today: [
    { label: "8 AM", sales: 12 },
    { label: "10 AM", sales: 19 },
    { label: "12 PM", sales: 15 },
    { label: "2 PM", sales: 27 },
    { label: "4 PM", sales: 22 },
    { label: "6 PM", sales: 34 },
    { label: "8 PM", sales: 29 },
  ],
  month: Array.from({ length: 30 }, (_, index) => ({
    label: String(index + 1),
    sales: 38 + ((index * 17 + 11) % 42),
  })),
  quarter: [
    { label: "Wk 1", sales: 118 },
    { label: "Wk 2", sales: 132 },
    { label: "Wk 3", sales: 124 },
    { label: "Wk 4", sales: 151 },
    { label: "Wk 5", sales: 139 },
    { label: "Wk 6", sales: 167 },
    { label: "Wk 7", sales: 158 },
    { label: "Wk 8", sales: 181 },
    { label: "Wk 9", sales: 173 },
    { label: "Wk 10", sales: 202 },
    { label: "Wk 11", sales: 194 },
    { label: "Wk 12", sales: 221 },
    { label: "Wk 13", sales: 236 },
  ],
  year: [
  { month: "Jan", sales: 128 },
  { month: "Feb", sales: 156 },
  { month: "Mar", sales: 143 },
  { month: "Apr", sales: 189 },
  { month: "May", sales: 172 },
  { month: "Jun", sales: 218 },
  { month: "Jul", sales: 204 },
  { month: "Aug", sales: 246 },
  { month: "Sep", sales: 231 },
  { month: "Oct", sales: 278 },
  { month: "Nov", sales: 264 },
  { month: "Dec", sales: 312 },
  ].map(({ month, sales }) => ({ label: month, sales })),
}

const periodOptions: { value: ChartPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "Last 3 months" },
  { value: "year", label: "This year" },
]

const chartConfig = {
  sales: {
    label: "Sales",
    color: "#ed1c2e",
  },
} satisfies ChartConfig

export function SalesTrendChart() {
  const [period, setPeriod] = useState<ChartPeriod>("year")

  return (
    <section className="w-full min-w-0" aria-labelledby="sales-trend-title">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sales-trend-title" className="text-base font-semibold text-slate-900">
              Sales overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Monthly sales activity · Sample data
            </p>
          </div>
          <Select
            value={period}
            onValueChange={(value: ChartPeriod | null) => {
              if (value) setPeriod(value as ChartPeriod)
            }}
          >
            <SelectTrigger aria-label="Select sales chart period">
              <SelectValue>
                {(value) => periodOptions.find((option) => option.value === value)?.label ?? "Select period"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ChartContainer
          config={chartConfig}
          className="h-[240px] w-full aspect-auto sm:h-[300px]"
        >
          <LineChart
            accessibilityLayer
            data={sampleData[period]}
            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={20}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={36}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="sales"
              type="monotone"
              stroke="var(--color-sales)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "var(--color-sales)" }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </section>
  )
}