"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Medal, PhoneCall } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { fetchTopStaff } from "@/lib/top-staff-client"
import type { TopStaffPeriod } from "@/lib/api/top-staff"

const periodOptions: { value: TopStaffPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
]

const amountFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
})

export function TopReps() {
  const [period, setPeriod] = useState<TopStaffPeriod>("month")
  const staffQuery = useQuery({
    queryKey: ["dashboard", "top-staff", period],
    queryFn: () => fetchTopStaff(period),
    staleTime: 60_000,
  })

  return (
    <section aria-labelledby="top-reps-title" className="w-full min-w-0">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="flex flex-nowrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700">
              <Medal className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 id="top-reps-title" className="truncate text-sm font-semibold text-slate-900">
                Top 5 staff
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Ranked by order total</p>
            </div>
          </div>
          <Select
            value={period}
            onValueChange={(value: TopStaffPeriod | null) => {
              if (value) setPeriod(value)
            }}
          >
            <SelectTrigger
              aria-label="Filter top staff by period"
              className="h-8 w-[7.15rem] min-w-0 shrink-0 px-2 text-xs"
            >
              <SelectValue>
                {(value) => periodOptions.find((option) => option.value === value)?.label ?? "Period"}
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

        {staffQuery.isPending ? (
          <ol className="mt-4 divide-y divide-slate-100" aria-label="Loading top staff">
            {Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="flex min-h-[68px] items-center gap-3 py-3">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-8 flex-1 rounded-sm" />
                <Skeleton className="h-8 w-20 rounded-sm" />
              </li>
            ))}
          </ol>
        ) : staffQuery.isError ? (
          <p role="alert" className="mt-5 py-8 text-center text-xs text-rose-700">
            {staffQuery.error instanceof Error ? staffQuery.error.message : "Could not load top staff."}
          </p>
        ) : staffQuery.data.length === 0 ? (
          <p className="mt-5 py-8 text-center text-xs text-slate-500">
            No orders found for this period.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-slate-100">
            {staffQuery.data.map((staff, index) => {
              const dialablePhone = staff.phone.replace(/[^\d+]/g, "")
              const canCall = /^\+[1-9]\d{7,14}$/.test(dialablePhone)

              return (
                <li key={staff.id} className="flex min-h-[68px] items-center gap-2 py-3 sm:gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={<span className="block w-full truncate text-xs font-medium text-slate-800" />}
                      >
                        {staff.name}
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start">{staff.name}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={<span className="mt-0.5 block w-full truncate text-[11px] text-slate-500" />}
                      >
                        {staff.phone || staff.staffId}
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start">
                        {staff.phone || staff.staffId}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {canCall ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <a
                            href={`tel:${dialablePhone}`}
                            aria-label={`Call ${staff.name}`}
                            className="grid size-8 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                          />
                        }
                      >
                        <PhoneCall className="size-4" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>Call {staff.name}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center text-slate-300"
                    >
                      <PhoneCall className="size-4" />
                    </span>
                  )}
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold tabular-nums text-slate-900">
                      {amountFormatter.format(staff.amount)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {staff.orderCount.toLocaleString()} {staff.orderCount === 1 ? "order" : "orders"}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
