"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Menu } from "@base-ui/react/menu"
import { Ellipsis, Eye, Phone, Search, Store } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TablePaginationFooter } from "@/components/custom/dashboard/table-pagination-footer"
import { ListPageSkeleton } from "@/components/custom/dashboard/list-page-skeleton"
import { PageHeading } from "@/components/custom/dashboard/page-heading"
import { fetchShops, updateShopStatus, type ShopRecord } from "@/lib/shops"

type OrdersPage = "orders" | "shops"

type OrderRecord = {
  id: string
  customer: string
  shop: string
  date: string
  amount: number
  status: "Completed" | "Processing" | "Cancelled"
}

const sampleOrders: OrderRecord[] = [
  { id: "ORD-1048", customer: "Amaya Perera", shop: "Colombo City Store", date: "Sep 30, 2026", amount: 389900, status: "Completed" },
  { id: "ORD-1047", customer: "Kasun Silva", shop: "Kandy Central Store", date: "Sep 30, 2026", amount: 24750, status: "Processing" },
  { id: "ORD-1046", customer: "Nadeesha Fernando", shop: "Galle Fort Store", date: "Sep 29, 2026", amount: 354500, status: "Completed" },
  { id: "ORD-1045", customer: "Ravindu Jayasinghe", shop: "Negombo Main Store", date: "Sep 29, 2026", amount: 16900, status: "Cancelled" },
  { id: "ORD-1044", customer: "Isuru Dias", shop: "Colombo City Store", date: "Sep 28, 2026", amount: 112900, status: "Processing" },
  { id: "ORD-1043", customer: "Dinuka Perera", shop: "Kandy Central Store", date: "Sep 28, 2026", amount: 18500, status: "Completed" },
  { id: "ORD-1042", customer: "Sachini Silva", shop: "Galle Fort Store", date: "Sep 27, 2026", amount: 12900, status: "Completed" },
  { id: "ORD-1041", customer: "Tharindu De Silva", shop: "Negombo Main Store", date: "Sep 27, 2026", amount: 74200, status: "Processing" },
  { id: "ORD-1040", customer: "Mihiri Perera", shop: "Colombo City Store", date: "Sep 26, 2026", amount: 4900, status: "Completed" },
]

const pageSize = 6
const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
})

function TruncatedShopValue({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-400">—</span>

  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" className="block max-w-full truncate text-left" />}>
        {value}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm break-words">{value}</TooltipContent>
    </Tooltip>
  )
}

function getDialablePhone(phone: string | null) {
  if (!phone) return null
  const dialable = phone.replace(/[^\d+]/g, "")
  return /^\+[1-9]\d{7,14}$/.test(dialable) ? dialable : null
}

function ShopStatusSelect({
  shop,
  disabled,
  onChange,
}: {
  shop: ShopRecord
  disabled: boolean
  onChange: (id: string, isActive: boolean) => void
}) {
  return (
    <Select
      value={shop.isActive ? "true" : "false"}
      onValueChange={(value: string | null) => {
        if (value === "true" || value === "false") onChange(shop.id, value === "true")
      }}
    >
      <SelectTrigger
        aria-label={`${shop.name} status`}
        disabled={disabled}
        className={`h-8 min-w-24 px-2 text-xs ${shop.isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600"}`}
      >
        <SelectValue>{(value) => value === "true" ? "Active" : "Deactive"}</SelectValue>
      </SelectTrigger>
      <SelectContent className="text-xs">
        <SelectItem value="true" className="text-xs">Active</SelectItem>
        <SelectItem value="false" className="text-xs">Deactive</SelectItem>
      </SelectContent>
    </Select>
  )
}

function ShopActionsMenu({
  shop,
  onView,
}: {
  shop: ShopRecord
  onView: (shop: ShopRecord) => void
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Actions for ${shop.name}`}
        className="inline-grid size-8 shrink-0 place-items-center rounded-md border border-transparent text-slate-500 outline-none hover:border-slate-200 hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
      >
        <Ellipsis className="size-4" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-[120]">
          <Menu.Popup className="min-w-40 rounded-md border border-slate-200 bg-white p-1 text-slate-800 shadow-lg outline-none">
            <Menu.Item
              onClick={() => onView(shop)}
              className="flex h-9 cursor-default items-center gap-2 rounded-sm px-2.5 text-xs outline-none hover:bg-slate-100 data-highlighted:bg-slate-100"
            >
              <Eye className="size-4 text-slate-500" aria-hidden="true" />
              View details
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

function badgeClass(status: string) {
  if (status === "Completed" || status === "Open") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "Processing") return "border-sky-200 bg-sky-50 text-sky-700"
  if (status === "Cancelled") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-amber-200 bg-amber-50 text-amber-700"
}

export function OperationsWorkspace({ page }: { page: OrdersPage }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedShop, setSelectedShop] = useState<ShopRecord | null>(null)
  const isOrders = page === "orders"
  const shopsQuery = useQuery({
    queryKey: ["shops"],
    queryFn: fetchShops,
    enabled: !isOrders,
  })
  const shopStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateShopStatus(id, isActive),
    onSuccess: async (_result, { id, isActive }) => {
      queryClient.setQueryData<ShopRecord[]>(["shops"], (current) =>
        current?.map((shop) => shop.id === id ? { ...shop, isActive } : shop)
      )
      setSelectedShop((current) => current?.id === id ? { ...current, isActive } : current)
      await queryClient.invalidateQueries({ queryKey: ["shops"] })
    },
  })
  const staffOptions = useMemo(
    () => Array.from(new Set((shopsQuery.data ?? [])
      .map((shop) => shop.staffName.trim())
      .filter(Boolean)))
      .sort((first, second) => first.localeCompare(second)),
    [shopsQuery.data],
  )
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const shops = shopsQuery.data ?? []
    if (isOrders) {
      if (!query) return sampleOrders
      return sampleOrders.filter((order) => [order.id, order.customer, order.shop, order.status].some((value) => value.toLowerCase().includes(query)))
    }

    return shops.filter((shop) =>
      (selectedStaff === null || shop.staffName === selectedStaff) &&
      (!query || [
        shop.shopId ?? "",
        shop.name,
        shop.owner,
        shop.staffName,
        shop.staffPhone ?? "",
        shop.isActive ? "active" : "deactive",
      ].some((value) => value.toLowerCase().includes(query)))
    )
  }, [isOrders, search, selectedStaff, shopsQuery.data])
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const title = isOrders ? "Orders" : "Shops"

  return (
    <section className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5">
      <PageHeading
        title={title}
        description={
          isOrders
            ? "Review order activity, customers, and fulfillment status."
            : "View shop owners, assigned staff, and current status."
        }
      />
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        {!isOrders && (
          <Select
            value={selectedStaff ?? "All staff"}
            onValueChange={(value) => {
              setSelectedStaff(value === "All staff" ? null : value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger aria-label="Filter shops by staff" className="h-9 w-full rounded-sm border-slate-200 bg-white text-xs sm:w-52">
              <SelectValue placeholder="Filter by staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All staff" className="text-xs">All staff</SelectItem>
              {staffOptions.map((staffName) => (
                <SelectItem key={staffName} value={staffName} className="text-xs">{staffName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <label className="relative block w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            aria-label={`Search ${title.toLowerCase()}`}
            className="h-9 rounded-sm border-slate-200 bg-white pl-9 text-xs"
            onChange={(event) => {
              setSearch(event.target.value)
              setCurrentPage(1)
            }}
            placeholder={isOrders ? "Search order, customer, or shop" : "Search shop, manager, or location"}
            value={search}
          />
        </label>
      </div>

      <section aria-label={title} className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {!isOrders && shopsQuery.isPending ? (
          <ListPageSkeleton page="shops" contentOnly />
        ) : (
          <>
            {!isOrders && (
              <div className="divide-y divide-slate-100 md:hidden">
                {shopsQuery.isError ? (
                  <p role="alert" className="px-4 py-8 text-center text-xs text-rose-700">
                    {shopsQuery.error instanceof Error ? shopsQuery.error.message : "Could not load shops."}
                  </p>
                ) : (visibleRows as ShopRecord[]).map((shop) => {
                  const dialablePhone = getDialablePhone(shop.phone)
                  return (
                    <article key={shop.id} className="p-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#c82432] ring-1 ring-rose-100"
                        >
                          <Store className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h2 className="truncate text-sm font-semibold text-slate-900">
                                {shop.name}
                              </h2>
                              {shop.shopId && (
                                <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                                  {shop.shopId}
                                </p>
                              )}
                            </div>
                            <ShopActionsMenu shop={shop} onView={setSelectedShop} />
                          </div>
                          <dl className="mt-2 space-y-1">
                            <div className="flex min-w-0 items-baseline gap-1.5 text-xs">
                              <dt className="shrink-0 text-slate-500">Owner</dt>
                              <dd className="truncate font-medium text-slate-700">{shop.owner || "—"}</dd>
                            </div>
                            <div className="flex min-w-0 items-baseline gap-1.5 text-xs">
                              <dt className="shrink-0 text-slate-500">Staff</dt>
                              <dd className="truncate font-medium text-slate-700">{shop.staffName || "—"}</dd>
                            </div>
                            <div className="flex min-w-0 items-baseline gap-1.5 text-xs">
                              <dt className="shrink-0 text-slate-500">Phone</dt>
                              <dd className="truncate tabular-nums text-slate-700">
                                {dialablePhone ? (
                                  <a className="hover:text-emerald-700" href={`tel:${dialablePhone}`}>
                                    {shop.phone}
                                  </a>
                                ) : shop.phone || "—"}
                              </dd>
                            </div>
                          </dl>
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <span className="text-[11px] font-medium text-slate-500">Shop status</span>
                            <ShopStatusSelect
                              shop={shop}
                              disabled={shopStatusMutation.isPending && shopStatusMutation.variables?.id === shop.id}
                              onChange={(id, isActive) => shopStatusMutation.mutate({ id, isActive })}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
                {!shopsQuery.isError && visibleRows.length === 0 && (
                  <p className="px-4 py-10 text-center text-xs text-slate-500">
                    No shops match your search.
                  </p>
                )}
              </div>
            )}
            <div className={isOrders ? "" : "hidden md:block"}>
              <Table>
          {isOrders ? (
            <>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-28 pl-5">Order</TableHead>
                  <TableHead className="min-w-40">Customer</TableHead>
                  <TableHead className="min-w-44">Shop</TableHead>
                  <TableHead className="min-w-32">Date</TableHead>
                  <TableHead className="min-w-32 text-right">Amount</TableHead>
                  <TableHead className="min-w-32">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(visibleRows as OrderRecord[]).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="pl-5 font-medium tabular-nums text-slate-800">{order.id}</TableCell>
                    <TableCell className="text-slate-700">{order.customer}</TableCell>
                    <TableCell className="text-slate-600">{order.shop}</TableCell>
                    <TableCell className="text-slate-500">{order.date}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-slate-800">{currencyFormatter.format(order.amount)}</TableCell>
                    <TableCell><Badge variant="outline" className={badgeClass(order.status)}>{order.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : (
            <>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-32 pl-5">Shop ID</TableHead>
                  <TableHead className="min-w-40">Name</TableHead>
                  <TableHead className="min-w-36">Owner</TableHead>
                  <TableHead className="min-w-36">Staff name</TableHead>
                  <TableHead className="min-w-36">Phone</TableHead>
                  <TableHead className="min-w-28">Status</TableHead>
                  <TableHead className="min-w-32 pr-5">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shopsQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-rose-700">
                      {shopsQuery.error instanceof Error ? shopsQuery.error.message : "Could not load shops."}
                    </TableCell>
                  </TableRow>
                ) : (visibleRows as ShopRecord[]).map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="max-w-36 pl-5 font-mono text-xs text-slate-700">
                      <TruncatedShopValue value={shop.shopId} />
                    </TableCell>
                    <TableCell className="max-w-48 font-medium text-slate-800">
                      <TruncatedShopValue value={shop.name} />
                    </TableCell>
                    <TableCell className="max-w-40 text-slate-600">
                      <TruncatedShopValue value={shop.owner} />
                    </TableCell>
                    <TableCell className="max-w-40 text-slate-600">
                      <TruncatedShopValue value={shop.staffName} />
                    </TableCell>
                    <TableCell className="max-w-40 text-slate-500">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className="min-w-0 flex-1 tabular-nums">
                          <TruncatedShopValue value={shop.staffPhone} />
                        </div>
                        {getDialablePhone(shop.staffPhone) && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <a
                                  href={`tel:${getDialablePhone(shop.staffPhone)}`}
                                  aria-label={`Call ${shop.staffName || "staff member"}`}
                                  className="grid size-7 shrink-0 place-items-center rounded-sm text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-[#ed1c2e]"
                                />
                              }
                            >
                              <Phone className="size-3.5" aria-hidden="true" />
                            </TooltipTrigger>
                            <TooltipContent>Call {shop.staffName || shop.staffPhone}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ShopStatusSelect
                        shop={shop}
                        disabled={shopStatusMutation.isPending && shopStatusMutation.variables?.id === shop.id}
                        onChange={(id, isActive) => shopStatusMutation.mutate({ id, isActive })}
                      />
                    </TableCell>
                    <TableCell className="pr-5">
                      <ShopActionsMenu shop={shop} onView={setSelectedShop} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
          {visibleRows.length === 0 && (isOrders || !shopsQuery.isError) && (
            <TableBody>
              <TableRow><TableCell colSpan={isOrders ? 6 : 7} className="h-24 text-center text-xs text-slate-500">No {title.toLowerCase()} match your search.</TableCell></TableRow>
            </TableBody>
          )}
              </Table>
            </div>
          </>
        )}
      </section>
      {shopStatusMutation.isError && !isOrders && (
        <p role="alert" className="text-xs text-rose-700">
          {shopStatusMutation.error instanceof Error ? shopStatusMutation.error.message : "Could not update shop status."}
        </p>
      )}

      <TablePaginationFooter
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={rows.length}
        itemLabel={title.toLowerCase()}
        onPageChange={setCurrentPage}
      />
      <Sheet open={Boolean(selectedShop)} onOpenChange={(open) => {
        if (!open) setSelectedShop(null)
      }}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b border-slate-200 px-5 py-5">
            <SheetTitle className="text-sm">Shop details</SheetTitle>
            <SheetDescription className="text-xs">
              Shop and assigned staff information.
            </SheetDescription>
          </SheetHeader>
          {selectedShop && (
            <dl className="divide-y divide-slate-100 px-5">
              {[
                ["Shop ID", selectedShop.shopId],
                ["Name", selectedShop.name],
                ["Owner", selectedShop.owner],
                ["Staff name", selectedShop.staffName],
                ["Staff phone", selectedShop.staffPhone],
                ["Status", selectedShop.isActive ? "Active" : "Deactive"],
                ["Address", selectedShop.address],
                ["Area", selectedShop.area],
                ["Shop phone", selectedShop.phone],
                ["Email", selectedShop.email],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="max-w-[65%] break-words text-right text-xs font-medium text-slate-900">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}
