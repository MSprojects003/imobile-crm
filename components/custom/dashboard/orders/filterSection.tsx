"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, FilterX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type OrderStatusFilter =
  | "all"
  | "pending"
  | "accepted"
  | "processing"
  | "packed"
  | "delivered"
  | "rejected"

export type OrdersFilterState = {
  startDate: string
  endDate: string
  status: OrderStatusFilter
  staff: string
  shop: string
}

export type OrderFilterOption = {
  value: string
  label: string
}

export function OrdersFilterSection({
  value,
  staffOptions,
  shopOptions,
  onChange,
  onClear,
  downloadAction,
}: {
  value: OrdersFilterState
  staffOptions: OrderFilterOption[]
  shopOptions: OrderFilterOption[]
  onChange: (value: OrdersFilterState) => void
  onClear: () => void
  downloadAction: ReactNode
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const hasActiveFilters =
    value.startDate !== "" ||
    value.endDate !== "" ||
    value.status !== "all" ||
    value.staff !== "all" ||
    value.shop !== "all"

  return (
    <section className="overflow-hidden border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-3 py-2 lg:hidden">
        <Button
          type="button"
          variant="outline"
          aria-expanded={filtersOpen}
          aria-controls="orders-filter-panel"
          onClick={() => setFiltersOpen((open) => !open)}
          className="h-9 min-w-0 flex-1 justify-between gap-2 border-slate-200 px-3 text-xs"
        >
          <span className="truncate">
            Filters{hasActiveFilters ? " · Applied" : ""}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transition-transform duration-200 ${
              filtersOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </Button>
        {downloadAction}
      </div>

      <div
        id="orders-filter-panel"
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out lg:hidden ${
          filtersOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!filtersOpen}
        inert={!filtersOpen}
      >
        <div className="overflow-hidden">
          <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <DateFilter
                label="Start date"
                ariaLabel="Orders start date"
                value={value.startDate}
                max={value.endDate}
                onChange={(startDate) => onChange({ ...value, startDate })}
              />
              <DateFilter
                label="End date"
                ariaLabel="Orders end date"
                value={value.endDate}
                min={value.startDate}
                onChange={(endDate) => onChange({ ...value, endDate })}
              />
            </div>
            <FilterSelect
              label="Filter orders by status"
              value={value.status}
              placeholder="All statuses"
              options={[
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "accepted", label: "Accepted" },
                { value: "processing", label: "Processing" },
                { value: "packed", label: "Packed" },
                { value: "delivered", label: "Delivered" },
                { value: "rejected", label: "Rejected" },
              ]}
              onChange={(status) => {
                if (
                  status === "all" ||
                  status === "pending" ||
                  status === "accepted" ||
                  status === "processing" ||
                  status === "packed" ||
                  status === "delivered" ||
                  status === "rejected"
                ) {
                  onChange({ ...value, status })
                }
              }}
            />
            <FilterSelect
              label="Filter orders by staff"
              value={value.staff}
              placeholder="All staff"
              options={[{ value: "all", label: "All staff" }, ...staffOptions]}
              onChange={(staff) => onChange({ ...value, staff })}
            />
            <FilterSelect
              label="Filter orders by shop"
              value={value.shop}
              placeholder="All shops"
              options={[{ value: "all", label: "All shops" }, ...shopOptions]}
              onChange={(shop) => onChange({ ...value, shop })}
            />
            <Button
              type="button"
              variant="outline"
              onClick={onClear}
              className="h-9 gap-2 text-xs sm:col-span-2"
            >
              <FilterX className="size-3.5" aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden items-end gap-2 p-2 lg:flex">
        <div className="grid min-w-0 flex-[1.35] grid-cols-2 gap-2">
          <DateFilter
            label="Start date"
            ariaLabel="Orders start date"
            value={value.startDate}
            max={value.endDate}
            onChange={(startDate) => onChange({ ...value, startDate })}
          />
          <DateFilter
            label="End date"
            ariaLabel="Orders end date"
            value={value.endDate}
            min={value.startDate}
            onChange={(endDate) => onChange({ ...value, endDate })}
          />
        </div>
        <FilterSelect
          label="Filter orders by status"
          value={value.status}
          placeholder="All statuses"
          options={[
            { value: "all", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "accepted", label: "Accepted" },
            { value: "processing", label: "Processing" },
            { value: "packed", label: "Packed" },
            { value: "delivered", label: "Delivered" },
            { value: "rejected", label: "Rejected" },
          ]}
          onChange={(status) => {
            if (
              status === "all" ||
              status === "pending" ||
              status === "accepted" ||
              status === "processing" ||
              status === "packed" ||
              status === "delivered" ||
              status === "rejected"
            ) {
              onChange({ ...value, status })
            }
          }}
          className="min-w-28 flex-[0.8]"
        />
        <FilterSelect
          label="Filter orders by staff"
          value={value.staff}
          placeholder="All staff"
          options={[{ value: "all", label: "All staff" }, ...staffOptions]}
          onChange={(staff) => onChange({ ...value, staff })}
          className="min-w-32 flex-1"
        />
        <FilterSelect
          label="Filter orders by shop"
          value={value.shop}
          placeholder="All shops"
          options={[{ value: "all", label: "All shops" }, ...shopOptions]}
          onChange={(shop) => onChange({ ...value, shop })}
          className="min-w-32 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          className="h-9 shrink-0 gap-1.5 px-2 text-xs"
        >
          <FilterX className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
        {downloadAction}
      </div>
    </section>
  )
}

function DateFilter({
  label,
  ariaLabel,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  ariaLabel: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="min-w-0 space-y-1">
      <span className="block text-[10px] font-medium text-slate-500">
        {label}
      </span>
      <Input
        aria-label={ariaLabel}
        type="date"
        value={value}
        min={min || undefined}
        max={max || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-0 rounded-sm border-slate-200 bg-white px-2 text-xs"
      />
    </label>
  )
}

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  className,
}: {
  label: string
  value: string
  placeholder: string
  options: OrderFilterOption[]
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) onChange(nextValue)
      }}
    >
      <SelectTrigger
        aria-label={label}
        className={`h-9 w-full min-w-0 px-2 text-xs ${className ?? ""}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
