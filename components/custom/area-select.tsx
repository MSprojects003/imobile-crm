"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { sriLankaAreas } from "@/lib/api/arealist"

export function AreaSelect({
  id,
  value,
  onValueChange,
  ariaLabel,
  searchLabel = ariaLabel.toLowerCase(),
  placeholder = "Select an area",
  areas = sriLankaAreas,
  allowClear = false,
  clearLabel = "Clear selected area",
  required = false,
  invalid = false,
  disabled = false,
  className = "",
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  ariaLabel: string
  searchLabel?: string
  placeholder?: string
  areas?: readonly string[]
  allowClear?: boolean
  clearLabel?: string
  required?: boolean
  invalid?: boolean
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const filteredAreas = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query
      ? areas.filter((area) => area.toLowerCase().includes(query))
      : areas
  }, [areas, search])

  function close() {
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch("")
      }}
    >
      <PopoverTrigger
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-required={required}
        aria-invalid={invalid}
        disabled={disabled}
        className={`flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-left text-xs text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          invalid ? "border-rose-500" : "border-slate-200"
        } ${className}`}
      >
        <span className={value ? "" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronsUpDown
          className="size-4 shrink-0 text-slate-500"
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--anchor-width)] gap-2 rounded-md border border-slate-200 bg-white p-2"
      >
        <Input
          autoFocus
          aria-label={`Search ${searchLabel}`}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${searchLabel}...`}
          value={search}
          className="h-9 rounded-md text-xs"
        />
        <div className="max-h-56 overflow-y-auto" role="listbox" aria-label={ariaLabel}>
          {allowClear && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onValueChange("")
                close()
              }}
              className="flex h-9 w-full items-center rounded-sm px-2 text-left text-xs text-slate-500 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
            >
              {clearLabel}
            </button>
          )}
          {filteredAreas.length ? (
            filteredAreas.map((area) => (
              <button
                key={area}
                type="button"
                role="option"
                aria-selected={value === area}
                onClick={() => {
                  onValueChange(area)
                  close()
                }}
                className="flex h-9 w-full items-center justify-between rounded-sm px-2 text-left text-xs text-slate-800 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
              >
                {area}
                {value === area && (
                  <Check className="size-4" aria-hidden="true" />
                )}
              </button>
            ))
          ) : (
            <p className="px-2 py-3 text-center text-xs text-slate-500">
              No matching areas.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
