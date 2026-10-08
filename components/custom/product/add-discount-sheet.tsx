"use client"

import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Product } from "@/components/custom/product/product-data"

type AddDiscountSheetProps = {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (product: Product, discountPercent: number) => Promise<void>
}

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
})

function discountedPrice(price: number, discount: number) {
  return Math.round(price * (1 - discount / 100) * 100) / 100
}

export function AddDiscountSheet({
  product,
  open,
  onOpenChange,
  onApply,
}: AddDiscountSheetProps) {
  const [discountInput, setDiscountInput] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setDiscountInput(product?.discountPercent?.toString() ?? "0")
    setError("")
  }, [product, open])

  const discountPercent = Number(discountInput)
  const isValidDiscount =
    discountInput.trim() !== "" &&
    Number.isFinite(discountPercent) &&
    discountPercent >= 0 &&
    discountPercent <= 90
  const originalTiers =
    product?.discountPercent && product.oldPriceTiers?.length
      ? product.oldPriceTiers
      : product?.priceTiers ?? []
  const originalFixedPrice =
    product?.discountPercent && product.oldPrice != null && product.oldPrice > 0
      ? product.oldPrice
      : product?.price ?? 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!product || !isValidDiscount || isSaving) return

    setIsSaving(true)
    setError("")
    try {
      await onApply(product, Math.round(discountPercent * 100) / 100)
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the discount.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,42rem)] overflow-y-auto p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Product discount</DialogTitle>
          <DialogDescription className="truncate pr-8">
            {product?.name ?? "Choose a product to update its discount."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="product-discount" className="text-xs font-medium text-slate-800">
              Discount percentage
            </label>
            <div className="relative">
              <Input
                id="product-discount"
                type="number"
                min="0"
                max="90"
                step="0.01"
                required
                value={discountInput}
                onChange={(event) => {
                  setDiscountInput(event.target.value)
                  setError("")
                }}
                placeholder="10"
                className="h-10 rounded-md border-slate-200 pr-10 text-sm"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-slate-500">%</span>
            </div>
            <p className="text-[11px] leading-4 text-slate-500">
              Choose 0% to restore the saved original price. Maximum discount is 90%.
            </p>
          </div>

          {product && isValidDiscount && (
            <section aria-label="Discount price preview" className="overflow-hidden rounded-md border border-slate-200">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <h3 className="text-xs font-semibold text-slate-800">Price preview</h3>
                <span className="text-[10px] font-medium text-slate-500">{discountPercent}% discount</span>
              </div>
              {product.pricingType === "bulk" ? (
                <div className="divide-y divide-slate-100">
                  {originalTiers.map((tier, index) => (
                    <div key={`${tier.startQty}-${tier.endQty}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2.5">
                      <span className="truncate text-[11px] text-slate-600">
                        {tier.startQty}–{tier.endQty ?? "No limit"} units
                      </span>
                      <span className="text-right text-[11px] text-slate-400 line-through">
                        {currencyFormatter.format(tier.price)}
                      </span>
                      <span className="text-right text-xs font-semibold tabular-nums text-slate-900">
                        {currencyFormatter.format(discountedPrice(tier.price, discountPercent))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 px-3 py-3">
                  <span className="text-xs text-slate-600">Product price</span>
                  <div className="text-right">
                    <span className="mr-2 text-[11px] text-slate-400 line-through">
                      {currencyFormatter.format(originalFixedPrice)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {currencyFormatter.format(discountedPrice(originalFixedPrice, discountPercent))}
                    </span>
                  </div>
                </div>
              )}
              {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            </section>
          )}
          {error && (!product || !isValidDiscount) && (
            <p role="alert" className="text-xs text-rose-700">{error}</p>
          )}

          <DialogFooter className="flex-row justify-end">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!product || !isValidDiscount || isSaving}
              className="bg-[#ed1c2e] text-white hover:bg-[#d91829]"
            >
              {isSaving ? "Saving..." : discountPercent === 0 ? "Restore original price" : "Apply discount"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
