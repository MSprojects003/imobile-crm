"use client"

import { CheckCircle2, XCircle } from "lucide-react"

export function OrderToast({
  message,
  tone,
}: {
  message: string
  tone: "success" | "error"
}) {
  if (!message) return null
  const isSuccess = tone === "success"
  const Icon = isSuccess ? CheckCircle2 : XCircle

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={`fixed right-4 bottom-4 z-[130] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border bg-white px-4 py-3 text-xs font-medium shadow-lg sm:right-8 sm:bottom-8 ${
        isSuccess
          ? "border-emerald-200 text-emerald-800"
          : "border-rose-200 text-rose-800"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
