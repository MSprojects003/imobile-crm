"use client"

import { BadgePercent, Ellipsis, ImagePlus, Package, Search } from "lucide-react"
import { Menu } from "@base-ui/react/menu"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Product } from "@/components/custom/product/product-data"

type ProductTableProps = {
  products: Product[]
  onViewDetails: (product: Product) => void
  onAddDiscount: (product: Product) => void
}

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
})

function getStockStatus(stock: number) {
  if (stock === 0) return { label: "Out of stock", classes: "border-rose-200 bg-rose-50 text-rose-700" }
  if (stock < 6) return { label: "Low stock", classes: "border-amber-200 bg-amber-50 text-amber-700" }
  return { label: "In stock", classes: "border-emerald-200 bg-emerald-50 text-emerald-700" }
}

export function ProductTable({ products, onViewDetails, onAddDiscount }: ProductTableProps) {
  return (
    <section aria-label="Products" className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <Table>
        <TableHeader className="bg-slate-50/95">
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-64 pl-5">Product</TableHead>
            <TableHead className="min-w-36">Category</TableHead>
            <TableHead className="min-w-28">Brand</TableHead>
            <TableHead className="min-w-28 text-right">Price</TableHead>
            <TableHead className="min-w-24 text-right">Stock</TableHead>
            <TableHead className="min-w-32">Status</TableHead>
            <TableHead className="w-12 pr-4 text-right"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-36 text-center text-sm text-slate-500">
                <Package className="mx-auto mb-2 size-5 text-slate-400" aria-hidden="true" />
                No products match these filters.
              </TableCell>
            </TableRow>
          ) : products.map((product) => {
            const stockStatus = getStockStatus(product.stock)
            const price = product.discountPercent
              ? product.price * (1 - product.discountPercent / 100)
              : product.price

            return (
              <TableRow key={product.id}>
                <TableCell className="pl-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                      <ImagePlus className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-64 truncate text-sm font-medium text-slate-800">{product.name}</span>
                      <span className="mt-0.5 block text-xs tabular-nums text-slate-500">{product.sku}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-600">{product.category}</TableCell>
                <TableCell className="text-slate-600">{product.brand}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-slate-800">
                  <span className="flex flex-col items-end gap-0.5">
                    {product.discountPercent && (
                      <span className="text-xs text-slate-400 line-through">{currencyFormatter.format(product.price)}</span>
                    )}
                    <span>{currencyFormatter.format(price)}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-slate-600">{product.stock}</TableCell>
                <TableCell><Badge variant="outline" className={stockStatus.classes}>{stockStatus.label}</Badge></TableCell>
                <TableCell className="pr-3 text-right">
                  <Menu.Root>
                    <Menu.Trigger
                      aria-label={`Actions for ${product.name}`}
                      className="inline-grid size-8 place-items-center rounded-sm text-slate-500 outline-none hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
                    >
                      <Ellipsis className="size-4" aria-hidden="true" />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-[120]">
                        <Menu.Popup className="min-w-44 rounded-md border border-slate-200 bg-white p-1 text-slate-800 shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
                          <Menu.Item
                            onClick={() => onViewDetails(product)}
                            className="flex h-9 cursor-default items-center gap-2.5 rounded-sm px-2.5 text-sm outline-none hover:bg-slate-100 data-highlighted:bg-slate-100"
                          >
                            <Search className="size-4 text-slate-500" aria-hidden="true" />
                            View details
                          </Menu.Item>
                          <Menu.Item
                            onClick={() => onAddDiscount(product)}
                            className="flex h-9 cursor-default items-center gap-2.5 rounded-sm px-2.5 text-sm outline-none hover:bg-slate-100 data-highlighted:bg-slate-100"
                          >
                            <BadgePercent className="size-4 text-slate-500" aria-hidden="true" />
                            Add discount
                          </Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}