"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
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
import {
  createAssignedWork,
  fetchAssignmentOptions,
} from "@/lib/assigned-works"

const workDetails = ["Shop visit", "Product audit", "Stock check", "Order delivery", "Other"]

export function AssignWorkSheet() {
  const [open, setOpen] = useState(false)
  const [staffId, setStaffId] = useState("")
  const [work, setWork] = useState("")
  const [customWork, setCustomWork] = useState("")
  const [shopId, setShopId] = useState("")
  const [formError, setFormError] = useState("")
  const [toastMessage, setToastMessage] = useState("")
  const optionsQuery = useQuery({
    queryKey: ["assigned-work-options"],
    queryFn: fetchAssignmentOptions,
    enabled: open,
    staleTime: 60_000,
  })
  const createMutation = useMutation({
    mutationFn: createAssignedWork,
    onSuccess: () => {
      setOpen(false)
      setToastMessage("Work assigned successfully.")
      setStaffId("")
      setWork("")
      setCustomWork("")
      setShopId("")
    },
  })

  useEffect(() => {
    if (!toastMessage) return
    const timeoutId = window.setTimeout(() => setToastMessage(""), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = work === "Other" ? customWork.trim() : work
    if (!staffId || !work || !shopId || !message) {
      setFormError("Complete the staff, work details, and shop fields to continue.")
      return
    }

    setFormError("")
    createMutation.mutate({ staffId, shopId, message })
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setFormError("")
      createMutation.reset()
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-label="Assign work"
        className="h-9 gap-2 border-[#ed1c2e] bg-[#ed1c2e] px-2 text-white hover:border-[#d91829] hover:bg-[#d91829] sm:border-slate-200 sm:bg-transparent sm:px-3 sm:text-slate-700 sm:hover:bg-slate-50"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Assign</span>
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
              <SheetTitle className="text-sm">Assign work</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              Select a representative, task, and shop for this assignment.
            </SheetDescription>
          </SheetHeader>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-6">
              {formError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
                  {formError}
                </p>
              )}
              {createMutation.isError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
                  {createMutation.error instanceof Error ? createMutation.error.message : "Could not assign work."}
                </p>
              )}
              {optionsQuery.isError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
                  {optionsQuery.error instanceof Error ? optionsQuery.error.message : "Could not load assignment options."}
                </p>
              )}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-800" htmlFor="assign-rep">
                  Staff
                </label>
                <Select
                  value={staffId || null}
                  onValueChange={(value: string | null) => {
                    setStaffId(value ?? "")
                    setFormError("")
                  }}
                >
                  <SelectTrigger id="assign-rep" className="h-9 w-full min-w-0 text-xs">
                    <SelectValue placeholder={optionsQuery.isPending ? "Loading staff..." : "Select staff"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(optionsQuery.data?.staff ?? []).map((member) => (
                      <SelectItem key={member.id} value={member.id} className="text-xs">
                        {member.fullName} ({member.staffId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-800" htmlFor="assign-work">
                  Work details
                </label>
                <Select
                  value={work || null}
                  onValueChange={(value: string | null) => {
                    setWork(value ?? "")
                    setFormError("")
                  }}
                >
                  <SelectTrigger id="assign-work" className="h-9 w-full min-w-0 text-xs">
                    <SelectValue placeholder="Select work details" />
                  </SelectTrigger>
                  <SelectContent>
                    {workDetails.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {work === "Other" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-800" htmlFor="assign-custom-work">
                    Custom work details
                  </label>
                  <textarea
                    id="assign-custom-work"
                    className="min-h-28 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
                    onChange={(event) => {
                      setCustomWork(event.target.value)
                      setFormError("")
                    }}
                    maxLength={2000}
                    placeholder="Describe the work to be completed"
                    required
                    value={customWork}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-800" htmlFor="assign-shop">
                  Shop
                </label>
                <Select
                  value={shopId || null}
                  onValueChange={(value: string | null) => {
                    setShopId(value ?? "")
                    setFormError("")
                  }}
                >
                  <SelectTrigger id="assign-shop" className="h-9 w-full min-w-0 text-xs">
                    <SelectValue placeholder={optionsQuery.isPending ? "Loading shops..." : "Select a shop"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(optionsQuery.data?.shops ?? []).map((shop) => (
                      <SelectItem key={shop.id} value={shop.id} className="text-xs">{shop.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SheetFooter className="flex-row justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
              <Button type="button" variant="outline" disabled={createMutation.isPending} onClick={() => handleOpenChange(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || optionsQuery.isLoading || !optionsQuery.data?.staff.length || !optionsQuery.data?.shops.length}
                className="bg-[#ed1c2e] text-xs text-white hover:bg-[#d91829]"
              >
                {createMutation.isPending ? "Assigning..." : "Assign work"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-[120] rounded-md border border-emerald-200 bg-white px-4 py-3 text-xs font-medium text-emerald-800 shadow-lg sm:right-8 sm:bottom-8">
          {toastMessage}
        </div>
      )}
    </>
  )
}