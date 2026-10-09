"use client"

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import { differenceInYears, format } from "date-fns"
import PhoneInput, {
  formatPhoneNumberIntl,
  isValidPhoneNumber,
} from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { Check, Loader2, Pencil, Upload, X } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { readNicFromImage } from "@/lib/nic-ocr"

export type AccountProfile = {
  userId: string
  fullName: string
  username: string
  phone: string
  imageUrl: string | null
  isAdmin: boolean
  isSubAdmin: boolean
  joinedDate: string | null
  nic: string | null
  dob: string | null
  address: string | null
  role: string
}

type EditableField = "fullName" | "phone" | "dob" | "address"

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

/** Converts stored Sri Lankan numbers (0771234567 / 94771234567) to E.164 for the phone input. */
function toE164(raw: string | null | undefined) {
  const value = (raw ?? "").replace(/[\s-]/g, "")
  if (!value) return ""
  if (value.startsWith("+")) return value
  if (value.startsWith("00")) return `+${value.slice(2)}`
  if (value.startsWith("94")) return `+${value}`
  if (value.startsWith("0")) return `+94${value.slice(1)}`
  return `+94${value}`
}

function FieldRow({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase sm:w-24 sm:shrink-0 sm:pt-1.5">
        {label}
      </div>
      <div className="min-w-0 flex-1">
        {children}
        {hint && <p className="mt-1 text-[10px] text-rose-600">{hint}</p>}
      </div>
    </div>
  )
}

export function AccountSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [fieldError, setFieldError] = useState("")

  const [editField, setEditField] = useState<EditableField | null>(null)
  const [draftValue, setDraftValue] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) loadProfile()
    else cancelEdit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function getToken() {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!data.session) throw new Error("Sign in is required.")
    return data.session.access_token
  }

  async function loadProfile() {
    setIsLoading(true)
    setError("")
    try {
      const token = await getToken()
      const response = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const result = await response.json()
      if (!response.ok || !result.profile) {
        throw new Error(result.error ?? "Failed to load profile")
      }
      setProfile(result.profile)
    } catch (err) {
      setError(errorMessage(err, "Failed to load profile"))
    } finally {
      setIsLoading(false)
    }
  }

  async function saveField(field: keyof AccountProfile, value: string) {
    if (!profile) return
    setIsSaving(true)
    setError("")
    try {
      const token = await getToken()
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Failed to save")
      setProfile({ ...profile, [field]: value })
      setEditField(null)
    } catch (err) {
      setError(errorMessage(err, "Failed to save"))
    } finally {
      setIsSaving(false)
    }
  }

  function startEdit(field: EditableField) {
    if (!profile || isSaving) return
    setError("")
    setFieldError("")
    setEditField(field)
    if (field === "phone") setDraftValue(toE164(profile.phone))
    else setDraftValue((profile[field] as string | null) ?? "")
  }

  function cancelEdit() {
    setEditField(null)
    setDraftValue("")
    setFieldError("")
  }

  async function commitEdit() {
    if (!profile || !editField) return
    const value = draftValue.trim()

    if (editField === "fullName" && !value) {
      setFieldError("Name can't be empty.")
      return
    }
    if (editField === "phone" && value && !isValidPhoneNumber(value)) {
      setFieldError("Enter a valid phone number.")
      return
    }

    const current =
      editField === "phone"
        ? toE164(profile.phone)
        : ((profile[editField] as string | null) ?? "")
    if (current === value) {
      cancelEdit()
      return
    }

    setFieldError("")
    await saveField(editField, value)
  }

  async function simulateNicScan(file: File) {
    if (!profile) return
    if (!file.type.startsWith("image/")) {
      setError("Choose an image of the front of your NIC.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("The NIC image must be 10 MB or smaller.")
      return
    }

    setIsSaving(true)
    setError("")
    try {
      const scannedNic = await readNicFromImage(file)
      await saveField("nic", scannedNic)
    } catch (err) {
      setError("Failed to scan NIC: " + errorMessage(err, "Unknown error"))
    } finally {
      setIsSaving(false)
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) simulateNicScan(file)
    e.target.value = ""
  }

  function EditActions() {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon"
          className="size-7 bg-[#ed1c2e] text-white hover:bg-[#d91829]"
          onClick={commitEdit}
          disabled={isSaving}
          aria-label="Save"
        >
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7"
          onClick={cancelEdit}
          disabled={isSaving}
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  function ValueDisplay({
    field,
    text,
    placeholder = "Add",
  }: {
    field?: EditableField
    text: string
    placeholder?: string
  }) {
    return (
      <div className="flex min-h-8 items-center justify-between gap-3">
        <span
          className={`text-xs break-words ${text ? "text-slate-800" : "text-slate-400 italic"}`}
        >
          {text || (field ? placeholder : "—")}
        </span>
        {field && (
          <button
            type="button"
            onClick={() => startEdit(field)}
            disabled={isSaving}
            aria-label={`Edit ${field}`}
            className="grid size-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
    )
  }

  function renderTextField(
    label: string,
    field: "fullName" | "address" | "dob",
    placeholder: string
  ) {
    const isEditing = editField === field
    const raw = (profile?.[field] as string | null) ?? ""
    const display =
      field === "dob" && raw
        ? `${format(new Date(raw), "PP")} · ${differenceInYears(new Date(), new Date(raw))} yrs`
        : raw

    return (
      <FieldRow label={label} hint={isEditing ? fieldError : undefined}>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              type={field === "dob" ? "date" : "text"}
              className="h-8 text-xs"
              value={draftValue}
              placeholder={placeholder}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit()
                if (e.key === "Escape") cancelEdit()
              }}
              disabled={isSaving}
            />
            <EditActions />
          </div>
        ) : (
          <ValueDisplay field={field} text={display} />
        )}
      </FieldRow>
    )
  }

  const initial = (profile?.fullName || profile?.username || "?")
    .charAt(0)
    .toUpperCase()
  const phoneE164 = toE164(profile?.phone)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto bg-slate-50 p-0 sm:max-w-md"
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur sm:px-6">
          <SheetTitle className="text-sm font-semibold">Account</SheetTitle>
          <SheetDescription className="text-[11px]">
            Manage your personal information.
          </SheetDescription>
        </SheetHeader>

        {error && (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 sm:mx-6"
          >
            {error}
          </div>
        )}

        {isLoading || !profile ? (
          <div className="flex flex-col gap-5 p-4 sm:p-6" aria-busy="true">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-3 w-16 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {/* Identity */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Avatar className="size-14 shrink-0 ring-1 ring-slate-200">
                <AvatarImage src={profile.imageUrl || undefined} />
                <AvatarFallback className="bg-rose-50 text-base font-semibold text-[#c82432]">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900">
                  {profile.fullName || profile.username}
                </h2>
                <p className="truncate text-[11px] text-slate-500">
                  @{profile.username}
                </p>
                {profile.role && (
                  <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                    {profile.role}
                  </span>
                )}
              </div>
            </div>

            {/* Personal information */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <h3 className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Personal information
              </h3>
              <div className="px-4">
                {renderTextField("Full name", "fullName", "Your full name")}

                <FieldRow label="Username">
                  <ValueDisplay text={profile.username} />
                </FieldRow>

                <FieldRow
                  label="Phone"
                  hint={editField === "phone" ? fieldError : undefined}
                >
                  {editField === "phone" ? (
                    <div className="flex items-center gap-2">
                      <PhoneInput
                        international
                        defaultCountry="LK"
                        countryCallingCodeEditable={false}
                        value={draftValue || undefined}
                        onChange={(value) => setDraftValue(value ?? "")}
                        disabled={isSaving}
                        placeholder="Enter phone number"
                        numberInputProps={{
                          autoFocus: true,
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              commitEdit()
                            }
                            if (e.key === "Escape") cancelEdit()
                          },
                        }}
                        className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs shadow-xs focus-within:ring-2 focus-within:ring-slate-300 [&_.PhoneInputCountry]:mr-0 [&_.PhoneInputInput]:h-full [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:text-xs [&_.PhoneInputInput]:outline-none"
                      />
                      <EditActions />
                    </div>
                  ) : (
                    <ValueDisplay
                      field="phone"
                      text={
                        phoneE164
                          ? formatPhoneNumberIntl(phoneE164) || profile.phone
                          : ""
                      }
                    />
                  )}
                </FieldRow>

                <FieldRow label="NIC">
                  <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
                    <span
                      className={`text-xs ${profile.nic ? "text-slate-800" : "text-slate-400 italic"}`}
                    >
                      {profile.nic || "Not added"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 px-2.5 text-[11px]"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                    >
                      {isSaving && !editField ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Upload className="size-3" />
                      )}
                      {profile.nic ? "Rescan" : "Scan NIC"}
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </div>
                </FieldRow>

                {renderTextField("Birthday", "dob", "")}
              </div>
            </section>

            {/* Additional details */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <h3 className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Additional details
              </h3>
              <div className="px-4">
                {renderTextField("Address", "address", "Street, city")}
                <FieldRow label="Joined">
                  <ValueDisplay
                    text={
                      profile.joinedDate
                        ? format(new Date(profile.joinedDate), "PPP")
                        : ""
                    }
                  />
                </FieldRow>
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
