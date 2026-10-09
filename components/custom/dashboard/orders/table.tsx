"use client"

import { useRouter } from "next/navigation"
import { Menu } from "@base-ui/react/menu"
import { Ellipsis, Eye, ShoppingBag } from "lucide-react"

import { OrderStatusSelect } from "@/components/custom/dashboard/orders/order-status-select"
import { ParcelCountInput } from "@/components/custom/dashboard/orders/parcel-count-input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { OrderRecord, OrderStatus } from "@/lib/orders"

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  dateStyle: "medium",
  timeZone: "Asia/Colombo",
})

function ViewOrderMenu({
  order,
  onView,
}: {
  order: OrderRecord
  onView: (order: OrderRecord) => void
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Actions for order ${order.orderId}`}
        className="inline-grid size-8 place-items-center rounded-md border border-transparent text-slate-500 outline-none hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300"
      >
        <Ellipsis className="size-4" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-[120]"
        >
          <Menu.Popup className="min-w-36 rounded-md border border-slate-200 bg-white p-1 text-slate-800 shadow-lg outline-none">
            <Menu.Item
              onClick={() => onView(order)}
              className="flex h-9 cursor-default items-center gap-2 rounded-sm px-2.5 text-xs outline-none hover:bg-slate-100 data-highlighted:bg-slate-100"
            >
              <Eye className="size-3.5 text-slate-500" aria-hidden="true" />
              View details
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function OrdersTable({
  orders,
  isLoading,
  error,
  canUpdateStatus,
  updatingOrderId,
  updatingParcelOrderId,
  onStatusChange,
  onParcelsDeliveredChange,
}: {
  orders: OrderRecord[]
  isLoading: boolean
  error: string
  canUpdateStatus: boolean
  updatingOrderId: string | null
  updatingParcelOrderId: string | null
  onStatusChange: (order: OrderRecord, status: OrderStatus) => void
  onParcelsDeliveredChange: (
    order: OrderRecord,
    value: number
  ) => Promise<unknown>
}) {
  const router = useRouter()
  const viewOrder = (order: OrderRecord) => {
    router.push(`/dashboard/orders/${encodeURIComponent(order.id)}`)
  }

  return (
    <>
      <section
        aria-label="Orders"
        className="overflow-hidden rounded-sm border border-slate-200 bg-white"
      >
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-32 pl-5">Order ID</TableHead>
                <TableHead className="min-w-32">Date</TableHead>
                <TableHead className="min-w-40">Shop</TableHead>
                <TableHead className="min-w-40">Staff</TableHead>
                <TableHead className="min-w-48 text-right">Amount</TableHead>
                <TableHead className="min-w-28 text-center">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-block max-w-24 truncate align-bottom">
                          Parcels delivered
                        </span>
                      }
                    />
                    <TooltipContent>Parcels delivered</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="min-w-32">Status</TableHead>
                <TableHead className="w-16 pr-5 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-xs text-slate-500"
                  >
                    Loading orders…
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    role="alert"
                    className="h-24 text-center text-xs text-rose-700"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-xs text-slate-500"
                  >
                    No orders match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="pl-5 font-mono text-xs font-medium text-slate-800">
                      {order.orderId}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {dateFormatter.format(new Date(order.createdAt))}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-xs font-medium text-slate-800">
                      {order.shopName}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-xs text-slate-700">
                      <span>{order.staffName}</span>
                      {order.staffCode && (
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          {order.staffCode}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      <span className="text-slate-500">
                        {currencyFormatter.format(order.estimatedTotal)}
                      </span>
                      <span
                        className="mx-1.5 text-slate-300"
                        aria-hidden="true"
                      >
                        →
                      </span>
                      <span className="font-semibold text-slate-900">
                        {currencyFormatter.format(order.fullTotal)}
                      </span>
                      {order.refundAmount > 0 && (
                        <span className="mt-1 block text-[10px] font-medium text-rose-700">
                          Refund: {currencyFormatter.format(order.refundAmount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <ParcelCountInput
                        value={order.parcelsDelivered}
                        label={`Delivered parcels for order ${order.orderId}`}
                        disabled={
                          !canUpdateStatus || updatingParcelOrderId === order.id
                        }
                        onSave={(value) =>
                          onParcelsDeliveredChange(order, value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <OrderStatusSelect
                        status={order.status}
                        label={`Update status for order ${order.orderId}`}
                        disabled={
                          !canUpdateStatus || updatingOrderId === order.id
                        }
                        onChange={(status) => onStatusChange(order, status)}
                      />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <ViewOrderMenu order={order} onView={viewOrder} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-xs text-slate-500">
              Loading orders…
            </p>
          ) : error ? (
            <p
              role="alert"
              className="px-4 py-8 text-center text-xs text-rose-700"
            >
              {error}
            </p>
          ) : orders.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-slate-500">
              No orders match the selected filters.
            </p>
          ) : (
            orders.map((order) => (
              <article key={order.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                      <ShoppingBag className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-slate-900">
                        {order.orderId}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {dateFormatter.format(new Date(order.createdAt))}
                      </p>
                    </div>
                  </div>
                  <ViewOrderMenu order={order} onView={viewOrder} />
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="min-w-0">
                    <dt className="text-[10px] text-slate-500">Shop</dt>
                    <dd className="truncate font-medium text-slate-800">
                      {order.shopName}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] text-slate-500">Staff</dt>
                    <dd className="truncate font-medium text-slate-800">
                      {order.staffName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-500">Amount</dt>
                    <dd className="font-medium text-slate-900 tabular-nums">
                      {currencyFormatter.format(order.estimatedTotal)} →{" "}
                      {currencyFormatter.format(order.fullTotal)}
                      {order.refundAmount > 0 && (
                        <span className="mt-0.5 block text-[10px] text-rose-700">
                          Refund: {currencyFormatter.format(order.refundAmount)}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-500">
                      Parcels delivered
                    </dt>
                    <dd>
                      <ParcelCountInput
                        value={order.parcelsDelivered}
                        label={`Delivered parcels for order ${order.orderId}`}
                        disabled={
                          !canUpdateStatus || updatingParcelOrderId === order.id
                        }
                        onSave={(value) =>
                          onParcelsDeliveredChange(order, value)
                        }
                      />
                    </dd>
                  </div>
                </dl>
                <div className="border-t border-slate-100 pt-2">
                  <OrderStatusSelect
                    status={order.status}
                    label={`Update status for order ${order.orderId}`}
                    disabled={!canUpdateStatus || updatingOrderId === order.id}
                    onChange={(status) => onStatusChange(order, status)}
                  />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  )
}
