"use client"

import Image from "next/image"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  MapPin,
  Package,
  Store,
  UserRound,
} from "lucide-react"

import { DownloadData } from "@/components/custom/dashboard/download/download"
import { OrderToast } from "@/components/custom/dashboard/orders/order-toast"
import { ParcelCountInput } from "@/components/custom/dashboard/orders/parcel-count-input"
import { PageHeading } from "@/components/custom/dashboard/page-heading"
import { OrderStatusSelect } from "@/components/custom/dashboard/orders/order-status-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  fetchOrderDetails,
  updateOrderParcelsDelivered,
  updateOrderStatus,
  updateOrderSubItemStatus,
  type OrderFulfillmentStatus,
  type OrderItemDetails,
  type OrderStatus,
} from "@/lib/orders"
import { useCanPerform } from "@/components/custom/dashboard/current-user"

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-LK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
})

function statusClass(status: string) {
  const value = status.toLowerCase()
  if (value === "delivered" || value === "processing") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
  if (value === "accepted" || value === "packing" || value === "packed") {
    return "border-blue-200 bg-blue-50 text-blue-700"
  }
  if (value === "rejected" || value === "no_items") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }
  return "border-amber-200 bg-amber-50 text-amber-700"
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={statusClass(status)}>
      {statusLabel(status)}
    </Badge>
  )
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "packing") return "Packing"
  if (normalized === "no_items") return "No items"
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-t border-slate-100 py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium break-words text-slate-900">
        {value || "—"}
      </dd>
    </div>
  )
}

function MobileInfoPanel({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
            {icon}
          </span>
          <span className="truncate text-xs font-semibold text-slate-800">
            {title}
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-slate-100 px-3 py-3">{children}</div>
    </details>
  )
}

type OrderExportRow = {
  orderId: string
  date: string
  orderStatus: string
  shop: string
  shopId: string
  shopOwner: string
  shopArea: string
  shopAddress: string
  shopPhone: string
  staff: string
  staffId: string
  staffPhone: string
  estimatedTotal: number
  fullTotal: number
  refundAmount: number
  deductedAmount: number
  product: string
  productId: string
  itemQuantity: number
  itemStatus: string
  models: string
  colors: string
  subOrderQuantity: number
  unitPrice: number
  subOrderSubtotal: number
  subOrderStatus: string
}

function createOrderExportRows(order: NonNullable<OrderDetailsQueryData>) {
  const rows = order.items.flatMap((item) => {
    const subItems = item.subItems.length > 0 ? item.subItems : [null]
    return subItems.map((subItem) => ({
      orderId: order.orderId,
      date: order.createdAt,
      orderStatus: statusLabel(order.status),
      shop: order.shop?.name ?? "",
      shopId: order.shop?.shopId ?? "",
      shopOwner: order.shop?.owner ?? "",
      shopArea: order.shop?.area ?? "",
      shopAddress: order.shop?.address ?? "",
      shopPhone: order.shop?.phone ?? "",
      staff: order.staff.fullName,
      staffId: order.staff.staffCode,
      staffPhone: order.staff.phone,
      estimatedTotal: order.estimatedTotal,
      fullTotal: order.fullTotal,
      refundAmount: order.refundAmount,
      deductedAmount: order.deductedAmount,
      product: item.name,
      productId: item.productId,
      itemQuantity: item.quantity,
      itemStatus: statusLabel(item.status),
      models: subItem?.models.join(", ") ?? "",
      colors: subItem?.colors.join(", ") ?? "",
      subOrderQuantity: subItem?.quantity ?? 0,
      unitPrice: subItem?.unitPrice ?? 0,
      subOrderSubtotal: subItem?.subtotal ?? item.subtotal,
      subOrderStatus: subItem ? statusLabel(subItem.status) : "",
    }))
  })
  if (rows.length > 0) return rows

  return [
    {
      orderId: order.orderId,
      date: order.createdAt,
      orderStatus: statusLabel(order.status),
      shop: order.shop?.name ?? "",
      shopId: order.shop?.shopId ?? "",
      shopOwner: order.shop?.owner ?? "",
      shopArea: order.shop?.area ?? "",
      shopAddress: order.shop?.address ?? "",
      shopPhone: order.shop?.phone ?? "",
      staff: order.staff.fullName,
      staffId: order.staff.staffCode,
      staffPhone: order.staff.phone,
      estimatedTotal: order.estimatedTotal,
      fullTotal: order.fullTotal,
      refundAmount: order.refundAmount,
      deductedAmount: order.deductedAmount,
      product: "",
      productId: "",
      itemQuantity: 0,
      itemStatus: "",
      models: "",
      colors: "",
      subOrderQuantity: 0,
      unitPrice: 0,
      subOrderSubtotal: 0,
      subOrderStatus: "",
    },
  ]
}

type OrderDetailsQueryData = Awaited<ReturnType<typeof fetchOrderDetails>>

const fulfillmentStatuses: OrderFulfillmentStatus[] = [
  "packing",
  "packed",
  "delivered",
  "no_items",
]

function isFulfillmentStatus(value: unknown): value is OrderFulfillmentStatus {
  return (
    typeof value === "string" &&
    fulfillmentStatuses.includes(value as OrderFulfillmentStatus)
  )
}

function canUpdateFulfillmentStatus(orderStatus: string) {
  return ["accepted", "processing", "packed", "packing"].includes(
    orderStatus.toLowerCase()
  )
}

function ProductItem({
  item,
  showStatusSelect,
  isUpdating,
  canUpdateStatus,
  onSubItemStatusChange,
}: {
  item: OrderItemDetails
  showStatusSelect: boolean
  isUpdating: boolean
  canUpdateStatus: boolean
  onSubItemStatusChange: (
    subOrderItemId: string,
    status: OrderFulfillmentStatus
  ) => void
}) {
  const product = item.product
  const specifications =
    product?.specifications &&
    typeof product.specifications === "object" &&
    !Array.isArray(product.specifications)
      ? Object.entries(product.specifications as Record<string, unknown>)
      : []

  return (
    <article className="border border-slate-200 bg-white">
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-50 text-slate-400">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              unoptimized
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <Package className="size-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-slate-900">
                {item.name}
              </h3>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {product?.sku
                  ? `SKU ${product.sku}`
                  : `Product ${item.productId}`}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600">
            <span>Qty: {item.quantity}</span>
            {product?.brand && <span>Brand: {product.brand}</span>}
            {product?.category && <span>Category: {product.category}</span>}
            {(product?.modelNumber || product?.model) && (
              <span>Model: {product.modelNumber || product.model}</span>
            )}
            {product?.manufacturedYear && (
              <span>Year: {product.manufacturedYear}</span>
            )}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-900 tabular-nums">
            Subtotal: {currencyFormatter.format(item.subtotal)}
          </p>
        </div>
      </div>

      {product?.description && (
        <p className="border-t border-slate-100 px-3 py-2 text-[11px] leading-5 text-slate-600 sm:px-4">
          {product.description}
        </p>
      )}

      {(item.subItems.length > 0 ||
        item.product?.colors.length ||
        specifications.length > 0) && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 p-3 sm:px-4">
          {product?.colors && product.colors.length > 0 && (
            <p className="text-[10px] text-slate-600">
              Available colors: {product.colors.join(", ")}
            </p>
          )}
          {specifications.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
              {specifications.map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="truncate text-[9px] text-slate-500">{key}</dt>
                  <dd className="truncate text-[10px] font-medium text-slate-800">
                    {typeof value === "string" ||
                    typeof value === "number" ||
                    typeof value === "boolean"
                      ? String(value)
                      : JSON.stringify(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {item.subItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-700">
                Models, colors &amp; quantities
              </p>
              {item.subItems.map((subItem) => (
                <div
                  key={subItem.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white px-2.5 py-2"
                >
                  <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600">
                    {subItem.models.length > 0 && (
                      <span>Model: {subItem.models.join(", ")}</span>
                    )}
                    {subItem.colors.length > 0 && (
                      <span>Color: {subItem.colors.join(", ")}</span>
                    )}
                    <span>Qty: {subItem.quantity}</span>
                    <span>
                      Unit price: {currencyFormatter.format(subItem.unitPrice)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {showStatusSelect ? (
                      <Select
                        value={subItem.status}
                        onValueChange={(value) => {
                          if (
                            isFulfillmentStatus(value) &&
                            value !== subItem.status
                          ) {
                            onSubItemStatusChange(subItem.id, value)
                          }
                        }}
                        disabled={isUpdating || !canUpdateStatus}
                      >
                        <SelectTrigger
                          aria-label={`Update status for ${item.name}, quantity ${subItem.quantity}`}
                          className="h-8 min-w-32 px-2 text-[10px]"
                        >
                          <SelectValue>
                            {(value) => statusLabel(String(value))}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {fulfillmentStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {statusLabel(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge status={subItem.status} />
                    )}
                    <span className="text-[10px] font-semibold text-slate-800 tabular-nums">
                      {currencyFormatter.format(subItem.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export function OrderDetails({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient()
  const canUpdateStatus = useCanPerform("updateOrders")
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
  const orderQuery = useQuery({
    queryKey: ["orders", "details", orderId],
    queryFn: () => fetchOrderDetails(orderId),
  })
  const mainStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus({ orderId, status }),
    onSuccess: async (updatedOrder) => {
      setToast({
        message: `Order status updated to ${statusLabel(updatedOrder.status)}.`,
        tone: "success",
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["orders", "details", orderId],
        }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
      ])
    },
    onError: (error) =>
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Could not update the order status.",
        tone: "error",
      }),
  })
  const statusMutation = useMutation({
    mutationFn: (input: {
      subOrderItemId: string
      status: OrderFulfillmentStatus
    }) =>
      updateOrderSubItemStatus({
        orderId,
        subOrderItemId: input.subOrderItemId,
        status: input.status,
      }),
    onSuccess: async (updatedStatus) => {
      setToast({
        message: `Sub-order status updated to ${statusLabel(updatedStatus.subOrderItemStatus)}.`,
        tone: "success",
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["orders", "details", orderId],
        }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
      ])
    },
    onError: (error) =>
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Could not update the sub-order status.",
        tone: "error",
      }),
  })
  const parcelsMutation = useMutation({
    mutationFn: (parcelsDelivered: number) =>
      updateOrderParcelsDelivered({ orderId, parcelsDelivered }),
    onSuccess: async (updatedOrder) => {
      setToast({
        message: `Delivered parcel count updated to ${updatedOrder.parcelsDelivered}.`,
        tone: "success",
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["orders", "details", orderId],
        }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
      ])
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
  const order = orderQuery.data
  const exportRows = order ? createOrderExportRows(order) : []

  const exportColumns = [
    { header: "Order ID", value: (row: OrderExportRow) => row.orderId },
    { header: "Date", value: (row: OrderExportRow) => row.date },
    { header: "Order status", value: (row: OrderExportRow) => row.orderStatus },
    { header: "Shop", value: (row: OrderExportRow) => row.shop },
    { header: "Shop ID", value: (row: OrderExportRow) => row.shopId },
    { header: "Shop owner", value: (row: OrderExportRow) => row.shopOwner },
    { header: "Shop area", value: (row: OrderExportRow) => row.shopArea },
    { header: "Shop address", value: (row: OrderExportRow) => row.shopAddress },
    { header: "Shop phone", value: (row: OrderExportRow) => row.shopPhone },
    { header: "Staff", value: (row: OrderExportRow) => row.staff },
    { header: "Staff ID", value: (row: OrderExportRow) => row.staffId },
    { header: "Staff phone", value: (row: OrderExportRow) => row.staffPhone },
    {
      header: "Estimated total (LKR)",
      value: (row: OrderExportRow) => row.estimatedTotal,
    },
    {
      header: "Full total (LKR)",
      value: (row: OrderExportRow) => row.fullTotal,
    },
    {
      header: "Refund amount (LKR)",
      value: (row: OrderExportRow) => row.refundAmount,
    },
    {
      header: "Deducted amount (LKR)",
      value: (row: OrderExportRow) => row.deductedAmount,
    },
    { header: "Product", value: (row: OrderExportRow) => row.product },
    { header: "Product ID", value: (row: OrderExportRow) => row.productId },
    {
      header: "Product quantity",
      value: (row: OrderExportRow) => row.itemQuantity,
    },
    {
      header: "Product status",
      value: (row: OrderExportRow) => row.itemStatus,
    },
    { header: "Models", value: (row: OrderExportRow) => row.models },
    { header: "Colors", value: (row: OrderExportRow) => row.colors },
    {
      header: "Sub-order quantity",
      value: (row: OrderExportRow) => row.subOrderQuantity,
    },
    {
      header: "Unit price (LKR)",
      value: (row: OrderExportRow) => row.unitPrice,
    },
    {
      header: "Sub-order subtotal (LKR)",
      value: (row: OrderExportRow) => row.subOrderSubtotal,
    },
    {
      header: "Sub-order status",
      value: (row: OrderExportRow) => row.subOrderStatus,
    },
  ] as const

  return (
    <section className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/dashboard/orders"
            className="mb-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:outline-none"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to orders
          </Link>
          <PageHeading
            title={order ? `Order ${order.orderId}` : "Order details"}
            description="Complete order, product, and fulfillment information."
          />
        </div>
        {order && (
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-xs font-medium text-slate-500">
                Order status
              </span>
              <OrderStatusSelect
                status={order.status}
                label={`Update status for order ${order.orderId}`}
                disabled={!canUpdateStatus || mainStatusMutation.isPending}
                onChange={(status) => mainStatusMutation.mutate(status)}
              />
            </div>
            <DownloadData<OrderExportRow>
              data={exportRows}
              columns={exportColumns}
              filename={`order-${order.orderId}`}
              label="Download order details"
              itemLabel="order detail"
              sheetName="Order details"
            />
          </div>
        )}
      </div>

      {orderQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-sm" />
          <Skeleton className="h-40 w-full rounded-sm" />
          <Skeleton className="h-52 w-full rounded-sm" />
        </div>
      ) : orderQuery.isError ? (
        <div className="border border-rose-200 bg-rose-50 p-4">
          <p role="alert" className="text-xs text-rose-700">
            {orderQuery.error instanceof Error
              ? orderQuery.error.message
              : "Could not load this order."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void orderQuery.refetch()}
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      ) : order ? (
        <>
          <section className="space-y-2 md:hidden">
            <MobileInfoPanel
              title="Order summary"
              icon={<CalendarDays className="size-4" aria-hidden="true" />}
            >
              <dl>
                <DetailField label="Order ID" value={order.orderId} />
                <DetailField
                  label="Created"
                  value={dateTimeFormatter.format(new Date(order.createdAt))}
                />
                <div className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-100 py-2.5">
                  <dt className="shrink-0 text-xs text-slate-500">Status</dt>
                  <dd>
                    <OrderStatusSelect
                      status={order.status}
                      label={`Update status for order ${order.orderId}`}
                      disabled={
                        !canUpdateStatus || mainStatusMutation.isPending
                      }
                      onChange={(status) => mainStatusMutation.mutate(status)}
                    />
                  </dd>
                </div>
                <DetailField
                  label="Parcels delivered"
                  value={
                    <ParcelCountInput
                      value={order.parcelsDelivered}
                      label={`Delivered parcels for order ${order.orderId}`}
                      disabled={!canUpdateStatus || parcelsMutation.isPending}
                      onSave={(value) => parcelsMutation.mutateAsync(value)}
                    />
                  }
                />
                <DetailField
                  label="Products count"
                  value={String(order.productsCount)}
                />
              </dl>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["Estimated total", order.estimatedTotal],
                  ["Full total", order.fullTotal],
                  ["Refund amount", order.refundAmount],
                  ["Negotiable (deducted)", order.deductedAmount],
                ].map(([label, amount]) => (
                  <div
                    key={String(label)}
                    className="rounded-md border border-slate-100 bg-slate-50/70 p-2"
                  >
                    <p className="text-[10px] text-slate-500">
                      {String(label)}
                    </p>
                    <p
                      className={`mt-1 text-xs font-semibold tabular-nums ${
                        label === "Negotiable (deducted)"
                          ? "text-rose-700"
                          : "text-slate-900"
                      }`}
                    >
                      {label === "Negotiable (deducted)"
                        ? `(${currencyFormatter.format(Number(amount))})`
                        : currencyFormatter.format(Number(amount))}
                    </p>
                  </div>
                ))}
              </div>
            </MobileInfoPanel>

            <MobileInfoPanel
              title="Shop details"
              icon={<Store className="size-4" aria-hidden="true" />}
            >
              <dl>
                <DetailField label="Shop name" value={order.shop?.name ?? ""} />
                <DetailField label="Shop ID" value={order.shop?.shopId ?? ""} />
                <DetailField label="Owner" value={order.shop?.owner ?? ""} />
                <DetailField label="Area" value={order.shop?.area ?? ""} />
                <DetailField
                  label="Address"
                  value={order.shop?.address ?? ""}
                />
                <DetailField label="Phone" value={order.shop?.phone ?? ""} />
              </dl>
            </MobileInfoPanel>

            <MobileInfoPanel
              title="Staff details"
              icon={<UserRound className="size-4" aria-hidden="true" />}
            >
              <dl>
                <DetailField label="Name" value={order.staff.fullName} />
                <DetailField label="Staff ID" value={order.staff.staffCode} />
                <DetailField label="Phone" value={order.staff.phone} />
              </dl>
            </MobileInfoPanel>
          </section>

          <section className="hidden gap-3 md:grid md:grid-cols-3">
            <div className="border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                <h2 className="text-[10px] font-semibold tracking-wide uppercase">
                  Order summary
                </h2>
              </div>
              <dl>
                <DetailField label="Order ID" value={order.orderId} />
                <DetailField
                  label="Created"
                  value={dateTimeFormatter.format(new Date(order.createdAt))}
                />
                <DetailField
                  label="Parcels delivered"
                  value={
                    <ParcelCountInput
                      value={order.parcelsDelivered}
                      label={`Delivered parcels for order ${order.orderId}`}
                      disabled={!canUpdateStatus || parcelsMutation.isPending}
                      onSave={(value) => parcelsMutation.mutateAsync(value)}
                    />
                  }
                />
                <DetailField
                  label="Products count"
                  value={String(order.productsCount)}
                />
              </dl>
            </div>

            <div className="border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <Store className="size-3.5" aria-hidden="true" />
                <h2 className="text-[10px] font-semibold tracking-wide uppercase">
                  Shop
                </h2>
              </div>
              <dl>
                <DetailField label="Shop name" value={order.shop?.name ?? ""} />
                <DetailField label="Shop ID" value={order.shop?.shopId ?? ""} />
                <DetailField label="Owner" value={order.shop?.owner ?? ""} />
                <DetailField label="Area" value={order.shop?.area ?? ""} />
                <DetailField
                  label="Address"
                  value={order.shop?.address ?? ""}
                />
                <DetailField label="Phone" value={order.shop?.phone ?? ""} />
              </dl>
              {order.shop?.address && (
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-slate-500">
                  <MapPin
                    className="mt-0.5 size-3 shrink-0"
                    aria-hidden="true"
                  />
                  {order.shop.address}
                </p>
              )}
            </div>

            <div className="border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <UserRound className="size-3.5" aria-hidden="true" />
                <h2 className="text-[10px] font-semibold tracking-wide uppercase">
                  Staff
                </h2>
              </div>
              <dl>
                <DetailField label="Name" value={order.staff.fullName} />
                <DetailField label="Staff ID" value={order.staff.staffCode} />
                <DetailField label="Phone" value={order.staff.phone} />
              </dl>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Estimated total", order.estimatedTotal],
              ["Full total", order.fullTotal],
              ["Refund amount", order.refundAmount],
              ["Negotiable (deducted amount)", order.deductedAmount],
            ].map(([label, amount]) => (
              <div
                key={String(label)}
                className="border border-slate-200 bg-white px-3 py-2.5"
              >
                <p className="text-[10px] text-slate-500">{label}</p>
                <p
                  className={`mt-1 text-sm font-semibold tabular-nums ${
                    label === "Negotiable (deducted amount)"
                      ? "text-rose-700"
                      : "text-slate-900"
                  }`}
                >
                  {label === "Negotiable (deducted amount)"
                    ? `(${currencyFormatter.format(Number(amount))})`
                    : currencyFormatter.format(Number(amount))}
                </p>
              </div>
            ))}
          </section>

          {order.isNegotiablePrice && (
            <section className="border border-amber-200 bg-amber-50 p-3">
              <h2 className="text-xs font-semibold text-amber-900">
                Negotiable price
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">
                {order.negotiableReason || "A negotiable price was requested."}
              </p>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Ordered products
              </h2>
              <span className="text-[10px] text-slate-500">
                {order.items.length}{" "}
                {order.items.length === 1 ? "product" : "products"}
              </span>
            </div>
            {order.items.length === 0 ? (
              <div className="border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                No product items were recorded for this order.
              </div>
            ) : (
              order.items.map((item) => (
                <ProductItem
                  key={item.id}
                  item={item}
                  showStatusSelect={canUpdateFulfillmentStatus(order.status)}
                  isUpdating={statusMutation.isPending}
                  canUpdateStatus={canUpdateStatus}
                  onSubItemStatusChange={(subOrderItemId, status) =>
                    statusMutation.mutate({ subOrderItemId, status })
                  }
                />
              ))
            )}
            {!canUpdateStatus && order.items.length > 0 && (
              <p className="text-[10px] text-slate-500">
                Order status changes are available to admins only.
              </p>
            )}
          </section>
        </>
      ) : null}
      <OrderToast message={toast.message} tone={toast.tone} />
    </section>
  )
}
