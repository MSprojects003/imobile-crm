"use client"

import { useEffect, useState, type FormEvent } from "react"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CreateStaffInput } from "@/lib/staff"

type StaffAccountType = CreateStaffInput["accountType"]

export function AddStaffSheet({
  open,
  onOpenChange,
  nextStaffId,
  isSubmitting,
  error,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  nextStaffId: string
  isSubmitting: boolean
  error: string
  onSubmit: (input: CreateStaffInput) => Promise<void>
}) {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState<string>()
  const [nic, setNic] = useState("")
  const [address, setAddress] = useState("")
  const [role, setRole] = useState("")
  const [accountType, setAccountType] = useState<StaffAccountType>("staff")

  useEffect(() => {
    if (!open) return
    setFullName("")
    setPhone(undefined)
    setNic("")
    setAddress("")
    setRole("")
    setAccountType("staff")
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!phone) return
    await onSubmit({ fullName, phone, nic, address, role, accountType })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <p className="text-xs font-semibold uppercase text-slate-500">Staff directory</p>
          <SheetTitle className="text-sm text-slate-900">Add staff member</SheetTitle>
          <SheetDescription className="text-xs">Enter staff details. The staff ID is generated automatically.</SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
            {error && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700" role="alert">
                {error}
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="staff-full-name" className="text-xs font-medium text-slate-800">Staff name</label>
                <Input
                  id="staff-full-name"
                  autoComplete="name"
                  autoFocus
                  maxLength={255}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter full name"
                  required
                  value={fullName}
                  className="h-10 rounded-md border-slate-200 px-3 text-xs md:text-xs focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="staff-phone" className="text-xs font-medium text-slate-800">Phone number</label>
                <PhoneInput
                  id="staff-phone"
                  aria-label="Phone number"
                  international
                  defaultCountry="LK"
                  value={phone}
                  onChange={setPhone}
                  className="phone-input flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs focus-within:border-[#ed1c2e] focus-within:ring-2 focus-within:ring-[#ed1c2e]/20"
                  numberInputProps={{
                    autoComplete: "tel",
                    className: "PhoneInputInput h-full min-w-0",
                    style: { fontSize: "12px" },
                    placeholder: "+94 77 123 4567",
                    required: true,
                  }}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="staff-nic" className="text-xs font-medium text-slate-800">
                  NIC <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <Input
                  id="staff-nic"
                  autoComplete="off"
                  maxLength={32}
                  onChange={(event) => setNic(event.target.value)}
                  placeholder="Enter NIC number"
                  value={nic}
                  className="h-10 rounded-md border-slate-200 px-3 text-xs md:text-xs focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="staff-id" className="text-xs font-medium text-slate-800">Staff ID</label>
                <Input
                  id="staff-id"
                  readOnly
                  value={nextStaffId}
                  className="h-10 rounded-md border-slate-200 bg-slate-50 px-3 font-mono text-xs md:text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="staff-role" className="text-xs font-medium text-slate-800">Role</label>
                <Input
                  id="staff-role"
                  maxLength={80}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="e.g. Sales representative"
                  required
                  value={role}
                  className="h-10 rounded-md border-slate-200 px-3 text-xs md:text-xs focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="staff-account-type" className="text-xs font-medium text-slate-800">Account type</label>
                <Select value={accountType} onValueChange={(value: string | null) => {
                  if (value === "staff" || value === "sub_admin") setAccountType(value)
                }}>
                  <SelectTrigger id="staff-account-type" className="h-10 w-full min-w-0 rounded-md border-slate-200 px-3 text-xs">
                    <SelectValue>{(value) => value === "sub_admin" ? "Sub Admin" : "Staff"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff" className="text-xs">Staff</SelectItem>
                    <SelectItem value="sub_admin" className="text-xs">Sub Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="staff-address" className="text-xs font-medium text-slate-800">
                  Address <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="staff-address"
                  autoComplete="street-address"
                  maxLength={500}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Enter residential address"
                  rows={3}
                  value={address}
                  className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !phone} className="min-w-32 bg-[#ed1c2e] text-white hover:bg-[#d91829]">
              {isSubmitting ? "Adding..." : "Add staff"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}