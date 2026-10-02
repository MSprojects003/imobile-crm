"use client"

import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Product } from "@/components/custom/product/product-data"

type AddDiscountSheetProps = {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (product: Product, discountPercent: number) => void
}

export function AddDiscountSheet({ product, open, onOpenChange, onApply }: AddDiscountSheetProps) {
  const [discountInput, setDiscountInput] = useState("")

  useEffect(() => {
    setDiscountInput(product?.discountPercent?.toString() ?? "")
  }, [product])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const discountPercent = Number(discountInput)
    if (!product || discountPercent < 1 || discountPercent > 90) return
    onApply(product, discountPercent)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <SheetTitle>Add discount</SheetTitle>
          <SheetDescription>{product?.name}</SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-3 px-5 py-6 sm:px-6">
            <label htmlFor="product-discount" className="text-[13px] font-medium text-slate-800">Discount percentage</label>
            <div className="relative">
              <Input
                id="product-discount"
                type="number"
                min="1"
                max="90"
                step="1"
                required
                value={discountInput}
                onChange={(event) => setDiscountInput(event.target.value)}
                placeholder="10"
                className="h-10 rounded-md border-slate-200 pr-10 text-[13px]"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-slate-500">%</span>
            </div>
            <p className="text-xs leading-5 text-slate-500">Enter a value from 1% to 90%. The product price updates in this sample view.</p>
          </div>
          <SheetFooter className="flex-row justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#ed1c2e] text-white hover:bg-[#d91829]">Apply discount</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}