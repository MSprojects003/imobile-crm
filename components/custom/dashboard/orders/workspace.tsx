"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useCanPerform } from "@/components/custom/dashboard/current-user"
import { OrdersFilterSection } from "@/components/custom/dashboard/orders/filterSection"
import { OrderToast } from "@/components/custom/dashboard/orders/order-toast"
import type {
  OrderFilterOption,
  OrdersFilterState,
  OrderStatusFilter,
} from "@/components/custom/dashboard/orders/filterSection"
import { OrdersTable } from "@/components/custom/dashboard/orders/table"
import { DownloadData } from "@/components/custom/dashboard/download/download"
import { PageHeading } from "@/components/custom/dashboard/page-heading"
import { TablePaginationFooter } from "@/components/custom/dashboard/table-pagination-footer"
import {
  fetchOrders,
  updateOrderParcelsDelivered,
  updateOrderStatus,
  type OrderRecord,
  type OrderStatus,
} from "@/lib/orders"

const pageSize = 10
const amountFormatter = new Intl.NumberFormat("en-LK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const defaultFilters: OrdersFilterState = {
  startDate: "",
  endDate: "",
  status: "all",
  staff: "all",
  shop: "all",
}

function getColomboDate(timestamp: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp))
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  return `${year}-${month}-${day}`
}

function matchesStatus(status: string, filter: OrderStatusFilter) {
  if (filter === "all") return true
  const normalized = status.toLowerCase()
  if (filter === "processing")
    return normalized === "processing" || normalized === "progressing"
  if (filter === "packed")
    return normalized === "packed" || normalized === "packing"
  return normalized === filter
}

function getStatusLabel(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "packing") return "Packing"
  if (normalized === "progressing") return "Processing"
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function uniqueOptions(
  entries: Array<{ value: string; label: string }>
): OrderFilterOption[] {
  const byValue = new Map<string, OrderFilterOption>()
  for (const entry of entries) {
    if (entry.value && !byValue.has(entry.value)) {
      byValue.set(entry.value, entry)
    }
  }
  return [...byValue.values()].sort((first, second) =>
    first.label.localeCompare(second.label)
  )
}

export function OrdersWorkspace() {
  const queryClient = useQueryClient()
  const canUpdateStatus = useCanPerform("updateOrders")
  const [filters, setFilters] = useState(defaultFilters)
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState<{
    message: string
    tone: "success" | "error"
  }>({ message: "", tone: "success" })
  useEffect(() => {
    if (!toast.message) return
    const timer = window.setTimeout(
      () => setToast((current) => ({ ...current, message: "" })),
      3500
    )
    return () => window.clearTimeout(timer)
  }, [toast.message])
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  })
  const statusMutation = useMutation({
    mutationFn: (input: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(input),
    onSuccess: async (order) => {
      setToast({
        message: `Order status updated to ${getStatusLabel(order.status)}.`,
        tone: "success",
      })
      await queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (error) =>
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Could not update order status.",
        tone: "error",
      }),
  })
  const parcelsMutation = useMutation({
    mutationFn: (input: { orderId: string; parcelsDelivered: number }) =>
      updateOrderParcelsDelivered(input),
    onSuccess: async (order) => {
      setToast({
        message: `Delivered parcel count updated to ${order.parcelsDelivered}.`,
        tone: "success",
      })
      await queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (error) =>
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Could not update delivered parcels.",
        tone: "error",
      }),
  })
  const orders = ordersQuery.data ?? []

  const staffOptions = useMemo(
    () =>
      uniqueOptions(
        orders.map((order) => ({
          value: order.staffRecordId,
          label: order.staffCode
            ? `${order.staffName} (${order.staffCode})`
            : order.staffName,
        }))
      ),
    [orders]
  )
  const shopOptions = useMemo(
    () =>
      uniqueOptions(
        orders.map((order) => ({
          value: order.shopId,
          label: order.shopName,
        }))
      ),
    [orders]
  )
  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const date = getColomboDate(order.createdAt)
        return (
          (!filters.startDate || date >= filters.startDate) &&
          (!filters.endDate || date <= filters.endDate) &&
          matchesStatus(order.status, filters.status) &&
          (filters.staff === "all" || order.staffRecordId === filters.staff) &&
          (filters.shop === "all" || order.shopId === filters.shop)
        )
      }),
    [filters, orders]
  )
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const page = Math.min(currentPage, pageCount)
  const visibleOrders = filteredOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  )
  const downloadAction = (
    <DownloadData<OrderRecord>
      data={filteredOrders}
      filename="orders"
      label="Download orders"
      itemLabel="order"
      sheetName="Orders"
      columns={[
        { header: "Order ID", value: (order) => order.orderId },
        { header: "Date", value: (order) => order.createdAt },
        { header: "Shop", value: (order) => order.shopName },
        { header: "Staff", value: (order) => order.staffName },
        { header: "Staff ID", value: (order) => order.staffCode },
        {
          header: "Estimated total (LKR)",
          value: (order) => amountFormatter.format(order.estimatedTotal),
        },
        {
          header: "Full total (LKR)",
          value: (order) => amountFormatter.format(order.fullTotal),
        },
        {
          header: "Parcels delivered",
          value: (order) => order.parcelsDelivered,
        },
        { header: "Status", value: (order) => getStatusLabel(order.status) },
      ]}
    />
  )

  function updateFilters(nextFilters: OrdersFilterState) {
    setFilters(nextFilters)
    setCurrentPage(1)
  }

  return (
    <section className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5">
      <PageHeading
        title="Orders"
        description="Review order totals, fulfillment progress, shops, and staff."
      />
      <OrdersFilterSection
        value={filters}
        staffOptions={staffOptions}
        shopOptions={shopOptions}
        onChange={updateFilters}
        onClear={() => updateFilters(defaultFilters)}
        downloadAction={downloadAction}
      />
      <OrdersTable
        orders={visibleOrders}
        isLoading={ordersQuery.isPending}
        canUpdateStatus={canUpdateStatus}
        updatingOrderId={
          statusMutation.isPending
            ? (statusMutation.variables?.orderId ?? null)
            : null
        }
        updatingParcelOrderId={
          parcelsMutation.isPending
            ? (parcelsMutation.variables?.orderId ?? null)
            : null
        }
        onStatusChange={(order, status) =>
          statusMutation.mutate({ orderId: order.id, status })
        }
        onParcelsDeliveredChange={(order, parcelsDelivered) =>
          parcelsMutation.mutateAsync({
            orderId: order.id,
            parcelsDelivered,
          })
        }
        error={
          ordersQuery.error instanceof Error
            ? ordersQuery.error.message
            : ordersQuery.isError
              ? "Could not load orders."
              : ""
        }
      />
      <TablePaginationFooter
        currentPage={page}
        pageSize={pageSize}
        totalItems={filteredOrders.length}
        itemLabel="orders"
        onPageChange={setCurrentPage}
      />
      <OrderToast message={toast.message} tone={toast.tone} />
    </section>
  )
}
