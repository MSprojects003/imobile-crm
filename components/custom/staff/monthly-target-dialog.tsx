"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Target } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  fetchMonthlyTarget,
  saveMonthlyTarget,
  type MonthlyTargetSaveResult,
  type MonthlyTargetSummary,
} from "@/lib/monthly-targets"

const monthlyTargetQueryKey = ["monthly-target"]
const amountFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export type MonthlyTargetStaff = {
  userId: string
  fullName: string
  staffId: string
}

export function MonthlyTargetDialog({
  staff,
  open,
  mode,
  onOpenChange,
  onSaved,
}: {
  staff: MonthlyTargetStaff | null
  open: boolean
  mode: "add" | "view"
  onOpenChange: (open: boolean) => void
  onSaved?: (result: MonthlyTargetSaveResult) => void
}) {
  const queryClient = useQueryClient()
  const now = useMemo(() => new Date(), [])
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthName = now.toLocaleDateString("en-LK", { month: "long" })
  const [targetAmount, setTargetAmount] = useState("")
  const targetQueryKey = [...monthlyTargetQueryKey, staff?.userId, year, month]

  const targetQuery = useQuery({
    queryKey: targetQueryKey,
    queryFn: () => fetchMonthlyTarget(staff!.userId, month, year),
    enabled: open && Boolean(staff?.userId),
  })

  const saveMutation = useMutation({
    mutationFn: (amount: number) =>
      saveMonthlyTarget({
        staffUserId: staff!.userId,
        month,
        year,
        targetAmount: amount,
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData<MonthlyTargetSummary>(targetQueryKey, data)
      await queryClient.invalidateQueries({ queryKey: monthlyTargetQueryKey })
      onSaved?.(data)
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open || !targetQuery.data) return
    const existingMonthlyAmount = targetQuery.data.currentTarget
      ? Math.max(
          0,
          targetQuery.data.currentTarget.targetAmount -
            targetQuery.data.previousBalance
        )
      : 0
    setTargetAmount(
      existingMonthlyAmount > 0 ? String(existingMonthlyAmount) : ""
    )
  }, [open, staff?.userId, targetQuery.data])

  const parsedAmount = Number(targetAmount)
  const hasValidAmount =
    targetAmount.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= 999999999999.99
  const previousBalance = targetQuery.data?.previousBalance ?? 0
  const totalTarget = hasValidAmount
    ? parsedAmount + previousBalance
    : previousBalance
  const error =
    targetQuery.error instanceof Error
      ? targetQuery.error.message
      : saveMutation.error instanceof Error
        ? saveMutation.error.message
        : ""

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          saveMutation.reset()
          onOpenChange(false)
        }
      }}
    >
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-4 text-slate-600" aria-hidden="true" />
            {mode === "view" ? "Target details" : "Monthly target"}
          </DialogTitle>
          <DialogDescription>
            {mode === "view"
              ? "Monthly target details for "
              : "Set this month’s goal for "}
            {staff?.fullName || "the selected staff member"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Target period</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {monthName} {year}
            </p>
          </div>

          {targetQuery.isPending ? (
            <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading previous target balance…
            </div>
          ) : (
            <>
              <div className="border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-800">
                  Outstanding target from previous months
                </p>
                <p className="mt-1 text-lg font-semibold text-amber-950 tabular-nums">
                  {amountFormatter.format(previousBalance)}
                </p>
              </div>

              {mode === "view" ? (
                targetQuery.data?.currentTarget ? (
                  <div className="space-y-3 border-t border-slate-200 pt-3">
                    <TargetDetail
                      label="Current month target"
                      amount={targetQuery.data.currentTarget.targetAmount}
                    />
                    <TargetDetail
                      label="Achieved this month"
                      amount={targetQuery.data.currentTarget.achievedAmount}
                    />
                    <TargetDetail
                      label="Remaining this month"
                      amount={Math.max(
                        0,
                        targetQuery.data.currentTarget.targetAmount -
                          targetQuery.data.currentTarget.achievedAmount
                      )}
                      emphasize
                    />
                  </div>
                ) : (
                  <p className="border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    No target has been set for {monthName} {year}.
                  </p>
                )
              ) : (
                <>
                  {targetQuery.data?.currentTarget && (
                    <p className="text-xs text-slate-500">
                      Achieved this month:{" "}
                      {amountFormatter.format(
                        targetQuery.data.currentTarget.achievedAmount
                      )}
                    </p>
                  )}

                  <label
                    htmlFor="monthly-target-amount"
                    className="block space-y-1.5"
                  >
                    <span className="text-xs font-medium text-slate-700">
                      New target for {monthName}
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-500">
                        LKR
                      </span>
                      <Input
                        id="monthly-target-amount"
                        type="number"
                        min="0.01"
                        max="999999999999.99"
                        step="0.01"
                        inputMode="decimal"
                        value={targetAmount}
                        onChange={(event) => {
                          setTargetAmount(event.target.value)
                          saveMutation.reset()
                        }}
                        placeholder="Enter target amount"
                        disabled={targetQuery.isPending || targetQuery.isError}
                        className="h-10 border-slate-200 pl-12 text-sm tabular-nums"
                      />
                    </div>
                  </label>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-xs font-medium text-slate-600">
                      Total target including balance
                    </span>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">
                      {amountFormatter.format(totalTarget)}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="text-xs text-rose-700">
            {error}
          </p>
        )}

        <DialogFooter className="flex-row justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {mode === "add" && (
            <Button
              type="button"
              onClick={() => {
                if (hasValidAmount) saveMutation.mutate(parsedAmount)
              }}
              disabled={
                !hasValidAmount ||
                targetQuery.isPending ||
                targetQuery.isError ||
                Boolean(targetQuery.data?.currentTarget) ||
                saveMutation.isPending
              }
              className="gap-2"
            >
              {saveMutation.isPending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {saveMutation.isPending ? "Saving…" : "Save target"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TargetDetail({
  label,
  amount,
  emphasize = false,
}: {
  label: string
  amount: number
  emphasize?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          emphasize ? "text-amber-800" : "text-slate-900"
        }`}
      >
        {amountFormatter.format(amount)}
      </span>
    </div>
  )
}
