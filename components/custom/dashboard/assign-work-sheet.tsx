"use client"

import { useState, type FormEvent } from "react"
import { ClipboardList, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const reps = ["Kasun Perera", "Nadeesha Silva", "Ravindu Fernando", "Isuru Jayasinghe"]
const workDetails = ["Shop visit", "Product audit", "Stock check", "Order delivery", "Other"]
const shops = ["Colombo City Store", "Kandy Central Store", "Galle Fort Store", "Negombo Main Store"]

export function AssignWorkSheet() {
  const [open, setOpen] = useState(false)
  const [rep, setRep] = useState("")
  const [work, setWork] = useState("")
  const [customWork, setCustomWork] = useState("")
  const [shop, setShop] = useState("")
  const [message, setMessage] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rep || !work || !shop || (work === "Other" && !customWork.trim())) {
      setMessage("Complete the representative, work details, and shop fields to continue.")
      return
    }

    setMessage("Preview ready. This sample assignment has not been saved.")
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) setMessage("")
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-9 gap-2 border-slate-200 px-3 text-slate-700 hover:bg-slate-50"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="size-4" aria-hidden="true" />
        <span>Assign</span>
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="mb-2 flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-rose-50 text-[#c82432]">
                <ClipboardList className="size-5" aria-hidden="true" />
              </span>
              <SheetTitle className="text-lg font-semibold">Assign work</SheetTitle>
            </div>
            <SheetDescription>
              Select a representative, task, and shop for this assignment.
            </SheetDescription>
          </SheetHeader>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="assign-rep">
                  Representative
                </label>
                <Select
                  value={rep || null}
                  onValueChange={(value: string | null) => {
                    setRep(value ?? "")
                    setMessage("")
                  }}
                >
                  <SelectTrigger id="assign-rep" className="w-full">
                    <SelectValue placeholder="Select a representative" />
                  </SelectTrigger>
                  <SelectContent>
                    {reps.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="assign-work">
                  Work details
                </label>
                <Select
                  value={work || null}
                  onValueChange={(value: string | null) => {
                    setWork(value ?? "")
                    setMessage("")
                  }}
                >
                  <SelectTrigger id="assign-work" className="w-full">
                    <SelectValue placeholder="Select work details" />
                  </SelectTrigger>
                  <SelectContent>
                    {workDetails.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {work === "Other" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800" htmlFor="assign-custom-work">
                    Custom work details
                  </label>
                  <textarea
                    id="assign-custom-work"
                    className="min-h-28 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
                    onChange={(event) => {
                      setCustomWork(event.target.value)
                      setMessage("")
                    }}
                    placeholder="Describe the work to be completed"
                    required
                    value={customWork}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="assign-shop">
                  Shop
                </label>
                <Select
                  value={shop || null}
                  onValueChange={(value: string | null) => {
                    setShop(value ?? "")
                    setMessage("")
                  }}
                >
                  <SelectTrigger id="assign-shop" className="w-full">
                    <SelectValue placeholder="Select a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {message && (
                <p
                  className={`rounded-md px-3 py-2 text-sm ${rep && work && shop ? "bg-slate-50 text-slate-600" : "bg-rose-50 text-rose-700"}`}
                  role={rep && work && shop ? "status" : "alert"}
                >
                  {message}
                </p>
              )}
            </div>

            <SheetFooter className="flex-row justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#ed1c2e] text-white hover:bg-[#d91829]">
                Assign work
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}