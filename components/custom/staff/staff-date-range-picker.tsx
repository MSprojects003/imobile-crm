"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CalendarDays, ChevronDown } from "lucide-react"
import { addMonths, format, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

function parseDate(value: string) {
  return value ? parseISO(value) : undefined
}

function formatDate(value: string) {
  return value ? format(parseISO(value), "MMM d") : ""
}

export function StaffDateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [panelPosition, setPanelPosition] = useState<{ left: number; top: number } | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const startDate = parseDate(from)
  const endDate = parseDate(to)
  const buttonLabel = from || to
    ? `${from ? formatDate(from) : "Start date"} - ${to ? formatDate(to) : "End date"}`
    : "Joined date"

  useEffect(() => {
    if (!open) return

    function updatePanelPosition() {
      const anchor = pickerRef.current?.getBoundingClientRect()
      const panel = panelRef.current?.getBoundingClientRect()
      if (!anchor || !panel) return

      const margin = 12
      const viewportWidth = window.innerWidth
      const panelWidth = Math.min(panel.width, viewportWidth - margin * 2)
      const left = viewportWidth < 640
        ? margin
        : Math.max(margin, Math.min(anchor.right - panelWidth, viewportWidth - panelWidth - margin))
      let top = anchor.bottom + 8
      if (top + panel.height > window.innerHeight - margin) {
        top = Math.max(margin, anchor.top - panel.height - 8)
      }

      setPanelPosition({ left, top })
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!pickerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", updatePanelPosition)
    window.addEventListener("scroll", updatePanelPosition, true)
    updatePanelPosition()
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", updatePanelPosition)
      window.removeEventListener("scroll", updatePanelPosition, true)
    }
  }, [open])

  function togglePicker() {
    setPanelPosition(null)
    setOpen((current) => !current)
  }

  return (
    <div ref={pickerRef} className="relative w-full sm:w-auto">
      <Button
        type="button"
        variant="outline"
        aria-label="Filter by joined date range"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={togglePicker}
        className="h-9 w-full justify-between gap-2 border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 sm:min-w-44 sm:w-auto"
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="truncate">{buttonLabel}</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </Button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Filter by joined date range"
          style={{ left: panelPosition?.left ?? 0, top: panelPosition?.top ?? 0, visibility: panelPosition ? "visible" : "hidden" }}
          className="fixed z-9999 max-h-[calc(100svh-1.5rem)] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-md border border-slate-200 bg-white p-4 shadow-xl sm:w-fit sm:max-w-[calc(100vw-1.5rem)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <section aria-label="Start date" className="min-w-0">
              <h3 className="mb-2 px-2 text-sm font-semibold text-slate-800">Start date</h3>
              <Calendar
                mode="single"
                selected={startDate}
                defaultMonth={startDate ?? new Date()}
                disabled={endDate ? { after: endDate } : undefined}
                onSelect={(date) => {
                  if (!date) return
                  onFromChange(format(date, "yyyy-MM-dd"))
                  if (to) setOpen(false)
                }}
                className="mx-auto"
              />
            </section>
            <section aria-label="End date" className="min-w-0 border-t border-slate-100 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-5">
              <h3 className="mb-2 px-2 text-sm font-semibold text-slate-800">End date</h3>
              <Calendar
                mode="single"
                selected={endDate}
                defaultMonth={endDate ?? addMonths(startDate ?? new Date(), 1)}
                disabled={startDate ? { before: startDate } : undefined}
                onSelect={(date) => {
                  if (!date) return
                  onToChange(format(date, "yyyy-MM-dd"))
                  if (from) setOpen(false)
                }}
                className="mx-auto"
              />
            </section>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}