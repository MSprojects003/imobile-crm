"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchSalesTrend } from "@/lib/sales-trend-client"
import type { SalesTrendPeriod } from "@/lib/api/sales-trend"

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const periodOptions: { value: SalesTrendPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "Last 3 months" },
  { value: "year", label: "This year" },
]

const chartConfig = {
  sales: {
    label: "Order amount",
    color: "#ed1c2e",
  },
} satisfies ChartConfig

function formatCompactAmount(value: number) {
  if (value >= 100_000) {
    return `${(value / 100_000).toFixed(1).replace(/\.0$/, "")}L`
  }
  return new Intl.NumberFormat("en-LK", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function SalesTrendChart() {
  const [period, setPeriod] = useState<SalesTrendPeriod>("year")
  const trendQuery = useQuery({
    queryKey: ["dashboard", "sales-trend", period],
    queryFn: () => fetchSalesTrend(period),
    staleTime: 60_000,
  })
  const data = trendQuery.data ?? []
  const periodLabel = periodOptions.find((option) => option.value === period)?.label.toLowerCase()

  return (
    <section className="w-full min-w-0" aria-labelledby="sales-trend-title">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sales-trend-title" className="text-sm font-semibold text-slate-900">
              Sales overview
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Order full totals · {periodLabel}
            </p>
          </div>
          <Select
            value={period}
            onValueChange={(value: SalesTrendPeriod | null) => {
              if (value) setPeriod(value)
            }}
          >
            <SelectTrigger aria-label="Select sales chart period" className="h-8 min-w-0 px-2 text-xs">
              <SelectValue>
                {(value) => periodOptions.find((option) => option.value === value)?.label ?? "Select period"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {trendQuery.isPending ? (
          <Skeleton className="h-[240px] w-full rounded-md sm:h-[300px]" />
        ) : trendQuery.isError ? (
          <div role="alert" className="flex h-[240px] items-center justify-center text-sm text-rose-700 sm:h-[300px]">
            {trendQuery.error instanceof Error ? trendQuery.error.message : "Could not load order totals."}
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[240px] w-full aspect-auto sm:h-[300px]"
          >
            <LineChart
              accessibilityLayer
              data={data}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={20}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={56}
                tick={{ fontSize: 10 }}
                tickFormatter={(value: number) => formatCompactAmount(value)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                  />
                }
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
        )}
      </div>
    </section>
  )
}
