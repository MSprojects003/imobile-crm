"use client"

import { useEffect, useState, type KeyboardEvent } from "react"

import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Product } from "@/components/custom/product/product-data"

type ViewProductSheetProps = {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (productId: Product["id"], updates: Partial<Product>) => void
}

type EditableField = "sku" | "name" | "category" | "brand" | "price" | "stock" | "imageName" | "description"

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
})

export function ViewProductSheet({ product, open, onOpenChange, onUpdate }: ViewProductSheetProps) {
  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [draft, setDraft] = useState("")

  useEffect(() => {
    setEditingField(null)
    setDraft("")
  }, [product?.id, open])

  function beginEdit(field: EditableField, value: string | number) {
    setEditingField(field)
    setDraft(String(value))
  }

  function cancelEdit() {
    setEditingField(null)
    setDraft("")
  }

  function saveEdit() {
    if (!product || !editingField) return
    const numericField = editingField === "price" || editingField === "stock"
    const parsedValue = numericField ? Number(draft) : draft.trim()
    if ((numericField && !Number.isFinite(parsedValue)) || (!numericField && !parsedValue)) {
      cancelEdit()
      return
    }

    onUpdate(product.id, { [editingField]: parsedValue } as Partial<Product>)
    cancelEdit()
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      cancelEdit()
    } else if (event.key === "Enter" && (event.currentTarget.tagName !== "TEXTAREA" || event.ctrlKey)) {
      event.preventDefault()
      saveEdit()
    }
  }

  function renderValue(field: EditableField, label: string, value: string | number, displayValue = String(value)) {
    const isEditing = editingField === field
    const isDescription = field === "description"

    return (
      <div key={field} className="grid grid-cols-[minmax(88px,0.8fr)_minmax(0,1.2fr)] items-start gap-4 border-b border-slate-100 py-1.5 last:border-b-0 sm:gap-6">
        <dt className="pt-1.5 text-xs font-semibold leading-5 text-slate-500">{label}</dt>
        <dd className="min-w-0 text-right">
          {isEditing ? (
            isDescription ? (
              <textarea
                autoFocus
                aria-label={`Edit ${label.toLowerCase()}`}
                className="min-h-20 w-full resize-y rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-right text-sm leading-5 text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
                onBlur={saveEdit}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                value={draft}
              />
            ) : (
              <Input
                autoFocus
                aria-label={`Edit ${label.toLowerCase()}`}
                className="h-8 rounded-sm border-slate-300 px-2 text-right text-sm leading-5 focus-visible:ring-[#ed1c2e]/30"
                min={field === "price" || field === "stock" ? 0 : undefined}
                onBlur={saveEdit}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                step={field === "price" ? "0.01" : undefined}
                type={field === "price" || field === "stock" ? "number" : "text"}
                value={draft}
              />
            )
          ) : (
            <button
              type="button"
              onClick={() => beginEdit(field, value)}
              className={`min-h-8 w-full rounded-sm px-2 py-1 text-right text-sm leading-5 text-slate-800 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30 ${isDescription ? "break-words whitespace-pre-wrap" : "truncate"}`}
              title="Click to edit"
            >
              {displayValue}
            </button>
          )}
        </dd>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="gap-1 border-b border-slate-200 px-5 py-5 pr-12 sm:px-6 sm:pr-14">
          <SheetTitle className="line-clamp-2 text-lg font-semibold leading-6 text-slate-900">
            {product?.name ?? "Product details"}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs leading-5">
            <span className="font-medium uppercase text-slate-500">SKU</span>
            <span className="font-mono tabular-nums text-slate-700">{product?.sku}</span>
            <span className="ml-1 text-slate-500">Click a value to edit.</span>
          </SheetDescription>
        </SheetHeader>
        {product && (
          <dl className="divide-y divide-slate-100 overflow-y-auto px-5 py-2 sm:px-6">
            {renderValue("sku", "SKU", product.sku)}
            {renderValue("name", "Product", product.name)}
            {renderValue("category", "Category", product.category)}
            {renderValue("brand", "Brand", product.brand)}
            {renderValue("price", "Price", product.price, currencyFormatter.format(product.price))}
            {renderValue("stock", "Stock", product.stock)}
            {renderValue("imageName", "Image", product.imageName)}
            {renderValue("description", "Description", product.description)}
          </dl>
        )}
      </SheetContent>
    </Sheet>
  )
}