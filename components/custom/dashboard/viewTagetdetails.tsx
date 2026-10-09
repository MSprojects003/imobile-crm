"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, Loader2, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { MonthlyTargetStaff } from "@/components/custom/staff/monthly-target-dialog"
import { fetchMonthlyTargetHistory } from "@/lib/monthly-targets"

const amountFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function getColomboYear() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      year: "numeric",
    }).format(new Date())
  )
}

function TargetAmount({
  label,
  amount,
  highlight = false,
}: {
  label: string
  amount: number
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          highlight ? "text-amber-800" : "text-slate-900"
        }`}
      >
        {amountFormatter.format(amount)}
      </span>
    </div>
  )
}

export function ViewTargetDetails({
  staff,
  open,
  onOpenChange,
}: {
  staff: MonthlyTargetStaff | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const currentYear = getColomboYear()
  const currentMonth = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      month: "numeric",
    }).format(new Date())
  )
  const [selectedYear, setSelectedYear] = useState<number | "all">(currentYear)
  const yearOptions = Array.from(
    { length: 11 },
    (_, index) => currentYear - index
  )
  const historyQuery = useQuery({
    queryKey: ["monthly-target", "history", staff?.userId, selectedYear],
    queryFn: () => fetchMonthlyTargetHistory(staff!.userId, selectedYear),
    enabled: open && Boolean(staff?.userId),
  })
  const targets = historyQuery.data?.targets ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="h-full max-h-dvh w-full gap-0 overflow-hidden border-slate-200 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-slate-200 px-5 py-4 pr-14">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Target className="size-4 text-slate-600" aria-hidden="true" />
            Target details
          </SheetTitle>
          <SheetDescription>
            {staff?.fullName || "Staff member"}
            {staff?.staffId ? ` · ${staff.staffId}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <CalendarDays
                className="size-4 text-slate-500"
                aria-hidden="true"
              />
              Filter by year
            </div>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => {
                if (value === "all") {
                  setSelectedYear("all")
                } else if (value && /^\d{4}$/.test(value)) {
                  setSelectedYear(Number(value))
                }
              }}
            >
              <SelectTrigger
                aria-label="Filter target history by year"
                className="h-9 min-w-36"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {historyQuery.isPending ? (
              <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading target history…
              </div>
            ) : historyQuery.isError ? (
              <div className="space-y-3 border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm text-rose-700" role="alert">
                  {historyQuery.error instanceof Error
                    ? historyQuery.error.message
                    : "Could not load target history."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void historyQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : targets.length === 0 ? (
              <div className="border border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <Target
                  className="mx-auto size-5 text-slate-400"
                  aria-hidden="true"
                />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  No monthly targets found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedYear === "all"
                    ? "This staff member has no saved target history."
                    : `There are no saved targets for ${selectedYear}.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  {targets.length} {targets.length === 1 ? "month" : "months"}{" "}
                  of target history
                </p>
                {targets.map((target) => {
                  const monthName = new Intl.DateTimeFormat("en-LK", {
                    month: "long",
                    timeZone: "UTC",
                  }).format(
                    new Date(Date.UTC(target.year, target.month - 1, 1))
                  )
                  const remaining = Math.max(
                    0,
                    target.targetAmount - target.achievedAmount
                  )
                  const isCurrentMonth =
                    target.month === currentMonth && target.year === currentYear

                  return (
                    <section
                      key={target.id}
                      className="border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {monthName} {target.year}
                        </h3>
                        {isCurrentMonth && (
                          <span className="border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                            Current month
                          </span>
                        )}
                      </div>
                      <div>
                        <TargetAmount
                          label="Target amount"
                          amount={target.targetAmount}
                        />
                        <TargetAmount
                          label="Completed"
                          amount={target.achievedAmount}
                        />
                        <TargetAmount
                          label="Balance to complete"
                          amount={remaining}
                          highlight={remaining > 0}
                        />
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
