"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePaginationFooter } from "@/components/custom/dashboard/table-pagination-footer"

type OrdersPage = "orders" | "shops"

type OrderRecord = {
  id: string
  customer: string
  shop: string
  date: string
  amount: number
  status: "Completed" | "Processing" | "Cancelled"
}

type ShopRecord = {
  name: string
  location: string
  manager: string
  phone: string
  orders: number
  status: "Open" | "Needs review"
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

const sampleShops: ShopRecord[] = [
  { name: "Colombo City Store", location: "Colombo 03", manager: "Kasun Perera", phone: "+94 77 *** 2418", orders: 186, status: "Open" },
  { name: "Kandy Central Store", location: "Kandy", manager: "Nadeesha Silva", phone: "+94 71 *** 9032", orders: 142, status: "Open" },
  { name: "Galle Fort Store", location: "Galle", manager: "Ravindu Fernando", phone: "+94 76 *** 1854", orders: 98, status: "Open" },
  { name: "Negombo Main Store", location: "Negombo", manager: "Isuru Jayasinghe", phone: "+94 75 *** 6720", orders: 76, status: "Needs review" },
  { name: "Jaffna Town Store", location: "Jaffna", manager: "Amaya Dias", phone: "+94 78 *** 4156", orders: 61, status: "Open" },
  { name: "Matara Market Store", location: "Matara", manager: "Dinuka Perera", phone: "+94 72 *** 3081", orders: 54, status: "Open" },
  { name: "Kurunegala Point", location: "Kurunegala", manager: "Sachini Silva", phone: "+94 70 *** 6625", orders: 43, status: "Needs review" },
]

const pageSize = 6
const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
})

function badgeClass(status: string) {
  if (status === "Completed" || status === "Open") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "Processing") return "border-sky-200 bg-sky-50 text-sky-700"
  if (status === "Cancelled") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-amber-200 bg-amber-50 text-amber-700"
}

export function OperationsWorkspace({ page }: { page: OrdersPage }) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const isOrders = page === "orders"
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return isOrders ? sampleOrders : sampleShops

    return isOrders
      ? sampleOrders.filter((order) => [order.id, order.customer, order.shop, order.status].some((value) => value.toLowerCase().includes(query)))
      : sampleShops.filter((shop) => [shop.name, shop.location, shop.manager, shop.phone, shop.status].some((value) => value.toLowerCase().includes(query)))
  }, [isOrders, search])
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const title = isOrders ? "Orders" : "Shops"

  return (
    <section className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5">
      <p className="text-xs font-semibold uppercase text-slate-500">iMobile workspace</p>
      <label className="relative block w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          aria-label={`Search ${title.toLowerCase()}`}
          className="h-10 rounded-sm border-slate-200 bg-white pl-9 text-sm"
          onChange={(event) => {
            setSearch(event.target.value)
            setCurrentPage(1)
          }}
          placeholder={isOrders ? "Search order, customer, or shop" : "Search shop, manager, or location"}
          value={search}
        />
      </label>

      <section aria-label={title} className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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
                  <TableHead className="min-w-48 pl-5">Shop</TableHead>
                  <TableHead className="min-w-32">Location</TableHead>
                  <TableHead className="min-w-40">Manager</TableHead>
                  <TableHead className="min-w-36">Phone</TableHead>
                  <TableHead className="min-w-24 text-right">Orders</TableHead>
                  <TableHead className="min-w-36">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(visibleRows as ShopRecord[]).map((shop) => (
                  <TableRow key={shop.name}>
                    <TableCell className="pl-5 font-medium text-slate-800">{shop.name}</TableCell>
                    <TableCell className="text-slate-600">{shop.location}</TableCell>
                    <TableCell className="text-slate-600">{shop.manager}</TableCell>
                    <TableCell className="tabular-nums text-slate-500">{shop.phone}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-700">{shop.orders}</TableCell>
                    <TableCell><Badge variant="outline" className={badgeClass(shop.status)}>{shop.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
          {visibleRows.length === 0 && (
            <TableBody>
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">No {title.toLowerCase()} match your search.</TableCell></TableRow>
            </TableBody>
          )}
        </Table>
      </section>

      <TablePaginationFooter
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={rows.length}
        itemLabel={title.toLowerCase()}
        onPageChange={setCurrentPage}
      />
    </section>
  )
}
