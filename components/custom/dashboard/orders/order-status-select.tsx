"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OrderStatus } from "@/lib/orders"

export const orderStatuses: OrderStatus[] = [
  "pending",
  "accepted",
  "processing",
  "packing",
  "packed",
  "delivered",
  "rejected",
]

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" && orderStatuses.includes(value as OrderStatus)
  )
}

export function orderStatusLabel(status: string) {
  if (status === "packing") return "Packing"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function OrderStatusSelect({
  status,
  label,
  disabled,
  onChange,
}: {
  status: string
  label: string
  disabled: boolean
  onChange: (status: OrderStatus) => void
}) {
  return (
    <Select
      value={isOrderStatus(status) ? status : "pending"}
      disabled={disabled}
      onValueChange={(value) => {
        if (isOrderStatus(value) && value !== status) onChange(value)
      }}
    >
      <SelectTrigger
        aria-label={label}
        className="h-8 min-w-32 px-2 text-[10px]"
      >
        <SelectValue>{(value) => orderStatusLabel(String(value))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {orderStatuses.map((value) => (
          <SelectItem key={value} value={value}>
            {orderStatusLabel(value)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
