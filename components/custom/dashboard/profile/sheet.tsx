"use client"

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
} from "react"
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input"
import "react-phone-number-input/style.css"
import {
  AtSign,
  BadgeCheck,
  Cake,
  CalendarDays,
  Camera,
  Check,
  Fingerprint,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { readNicFromImage } from "@/lib/nic-ocr"
import { supabase } from "@/lib/supabase"

type Profile = {
  fullName: string | null
  username: string | null
  phone: string | null
  imageUrl: string | null
  isAdmin: boolean
  isSubAdmin: boolean
  joinedDate: string | null
  nic: string | null
  dob: string | null
  address: string | null
  role: string | null
}

type EditableField = "fullName" | "username" | "nic" | "dob" | "address"
type ProfileDraft = Record<EditableField, string> & { phone: string }

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/
const PHONE_OTP_RESEND_SECONDS = 120
const PHONE_OTP_SEND_DELAY_MS = 800

function toE164(phone: string | null | undefined) {
  const value = (phone ?? "").replace(/[\s-]/g, "")
  if (!value) return ""
  if (value.startsWith("+")) return value
  if (value.startsWith("00")) return `+${value.slice(2)}`
  if (value.startsWith("94")) return `+${value}`
  if (value.startsWith("0")) return `+94${value.slice(1)}`
  return `+94${value}`
}

function formatDate(value: string | null) {
  if (!value) return "Not added"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not added"
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

function toDraft(profile: Profile): ProfileDraft {
  return {
    fullName: profile.fullName ?? "",
    username: profile.username ?? "",
    phone: toE164(profile.phone),
    nic: profile.nic ?? "",
    dob: profile.dob?.slice(0, 10) ?? "",
    address: profile.address ?? "",
  }
}

function FieldShell({
  icon: Icon,
  label,
  hint,
  saving,
  children,
}: {
  icon: LucideIcon
  label: string
  hint?: string
  saving: boolean
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-4">
      <span className="mt-6 grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
            {label}
          </span>
          {saving && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Saving
            </span>
          )}
        </div>
        {children}
        {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}

function EditableDetail({
  icon,
  label,
  value,
  type = "text",
  placeholder,
  hint,
  multiline = false,
  saving = false,
  max,
  footer,
  onChange,
  onBlur,
}: {
  icon: LucideIcon
  label: string
  value: string
  type?: string
  placeholder: string
  hint?: string
  multiline?: boolean
  saving?: boolean
  max?: string
  footer?: ReactNode
  onChange: (value: string) => void
  onBlur: (value: string) => void
}) {
  const controlProps = {
    value,
    placeholder,
    disabled: saving,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onBlur(event.currentTarget.value),
  }

  return (
    <FieldShell icon={icon} label={label} hint={hint} saving={saving}>
      {multiline ? (
        <Textarea
          {...controlProps}
          className="min-h-16 resize-y border-slate-200 bg-white text-xs font-medium text-slate-900 shadow-none"
        />
      ) : (
        <Input
          {...controlProps}
          type={type}
          max={max}
          className="h-9 border-slate-200 bg-white text-xs font-medium text-slate-900 shadow-none"
        />
      )}
      {footer}
    </FieldShell>
  )
}

function PhoneDetail({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <FieldShell
      icon={Phone}
      label="Phone number"
      hint="Include your country code. Changing it requires a verification code."
      saving={false}
    >
      <PhoneInput
        international
        defaultCountry="LK"
        countryCallingCodeEditable={false}
        value={value || undefined}
        disabled={disabled}
        placeholder="Add your phone number"
        onChange={(phone) => onChange(phone ?? "")}
        className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 [&_.PhoneInputCountry]:mr-0 [&_.PhoneInputCountrySelect]:h-7 [&_.PhoneInputCountrySelect]:rounded-none [&_.PhoneInputCountrySelect]:border-0 [&_.PhoneInputInput]:h-7 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:text-xs [&_.PhoneInputInput]:outline-none"
      />
    </FieldShell>
  )
}

export function ProfileSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [draft, setDraft] = useState<ProfileDraft>({
    fullName: "",
    username: "",
    phone: "",
    nic: "",
    dob: "",
    address: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [savedNotice, setSavedNotice] = useState(false)
  const [savingFields, setSavingFields] = useState<Set<EditableField>>(
    new Set()
  )
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false)
  const [isVerifyingPhoneCode, setIsVerifyingPhoneCode] = useState(false)
  const [isPhoneCodeSent, setIsPhoneCodeSent] = useState(false)
  const [phoneCode, setPhoneCode] = useState("")
  const [phoneCodeError, setPhoneCodeError] = useState("")
  const [pendingPhone, setPendingPhone] = useState("")
  const [phoneResendSeconds, setPhoneResendSeconds] = useState(0)
  const [isScanningNic, setIsScanningNic] = useState(false)
  const [nicScanProgress, setNicScanProgress] = useState(0)
  const [reloadCount, setReloadCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nicImageInputRef = useRef<HTMLInputElement>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phoneRequestRef = useRef<string | null>(null)
  const sentPhoneRef = useRef<string | null>(null)
  const activePhoneRef = useRef<string | null>(null)

  // The saved (verified) number, and whether the field now holds a new, complete one.
  const actualPhone = toE164(profile?.phone)
  const isNewPhone =
    !!draft.phone &&
    draft.phone !== actualPhone &&
    isValidPhoneNumber(draft.phone)

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (phoneResendSeconds <= 0) return
    const timer = window.setInterval(() => {
      setPhoneResendSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phoneResendSeconds])

  // Send the code only when a complete, new number has been entered.
  useEffect(() => {
    if (!isNewPhone) {
      activePhoneRef.current = null
      sentPhoneRef.current = null
      phoneRequestRef.current = null
      setIsSendingPhoneCode(false)
      setIsPhoneCodeSent(false)
      setPhoneCode("")
      setPhoneCodeError("")
      setPhoneResendSeconds(0)
      return
    }

    const phone = draft.phone
    activePhoneRef.current = phone

    if (sentPhoneRef.current !== phone) {
      setIsPhoneCodeSent(false)
      setPhoneCode("")
      setPhoneCodeError("")
      setPhoneResendSeconds(0)
    }

    const timer = window.setTimeout(() => {
      void startPhoneVerification(phone)
    }, PHONE_OTP_SEND_DELAY_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewPhone, draft.phone])

  useEffect(() => {
    if (!open) return

    let isActive = true
    async function loadProfile() {
      setIsLoading(true)
      setLoadError("")
      setSaveError("")

      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!data.session)
          throw new Error("Sign in is required to view your profile.")

        const response = await fetch("/api/account", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store",
        })
        const result = (await response.json()) as {
          profile?: Profile
          error?: string
        }
        if (!response.ok || !result.profile) {
          throw new Error(result.error ?? "Could not load your profile.")
        }

        if (isActive) {
          setProfile(result.profile)
          setDraft(toDraft(result.profile))
        }
      } catch (error) {
        console.error("Profile details could not be loaded", error)
        if (isActive) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load your profile."
          )
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadProfile()
    return () => {
      isActive = false
    }
  }, [open, reloadCount])

  function flashSaved() {
    setSavedNotice(true)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setSavedNotice(false), 2000)
  }

  async function startPhoneVerification(phone: string) {
    if (!profile || isVerifyingPhoneCode) return
    if (sentPhoneRef.current === phone || phoneRequestRef.current === phone) {
      return
    }

    phoneRequestRef.current = phone
    setIsSendingPhoneCode(true)
    setPhoneCodeError("")
    setPhoneCode("")
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session) {
        throw new Error("Sign in is required to change your phone number.")
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ action: "send", phone }),
      })
      const result = (await response.json()) as {
        error?: string
        maskedPhone?: string
        resendAfter?: number
      }
      if (!response.ok) {
        throw new Error(result.error ?? "Could not send the verification code.")
      }

      // The user edited the number while this request was in flight.
      if (activePhoneRef.current !== phone) return

      sentPhoneRef.current = phone
      setPendingPhone(result.maskedPhone ?? `***${phone.slice(-4)}`)
      setIsPhoneCodeSent(true)
      setPhoneResendSeconds(
        result.resendAfter
          ? Math.max(0, Math.ceil((result.resendAfter - Date.now()) / 1000))
          : PHONE_OTP_RESEND_SECONDS
      )
    } catch (error) {
      console.error("Phone verification code could not be sent", error)
      if (activePhoneRef.current !== phone) return
      setPhoneCodeError(
        error instanceof Error
          ? error.message
          : "Could not send the verification code."
      )
      setIsPhoneCodeSent(false)
    } finally {
      if (phoneRequestRef.current === phone) {
        phoneRequestRef.current = null
        setIsSendingPhoneCode(false)
      }
    }
  }

  async function resendPhoneVerification() {
    if (phoneResendSeconds > 0 || isSendingPhoneCode) return

    setIsSendingPhoneCode(true)
    setPhoneCodeError("")
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session) {
        throw new Error("Sign in is required to change your phone number.")
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ action: "resend" }),
      })
      const result = (await response.json()) as {
        error?: string
        resendAfter?: number
        restartRequired?: boolean
      }
      if (!response.ok) {
        if (result.restartRequired) {
          sentPhoneRef.current = null
          setIsPhoneCodeSent(false)
        }
        throw new Error(
          result.error ?? "Could not resend the verification code."
        )
      }

      setPhoneCode("")
      setPhoneResendSeconds(
        result.resendAfter
          ? Math.max(0, Math.ceil((result.resendAfter - Date.now()) / 1000))
          : PHONE_OTP_RESEND_SECONDS
      )
    } catch (error) {
      console.error("Phone verification code could not be resent", error)
      setPhoneCodeError(
        error instanceof Error
          ? error.message
          : "Could not resend the verification code."
      )
    } finally {
      setIsSendingPhoneCode(false)
    }
  }

  async function verifyPhoneChange(code: string) {
    if (!isPhoneCodeSent || isVerifyingPhoneCode || code.length !== 6) return

    setIsVerifyingPhoneCode(true)
    setPhoneCodeError("")
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session) {
        throw new Error("Sign in is required to change your phone number.")
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ action: "verify", code }),
      })
      const result = (await response.json()) as {
        error?: string
        phone?: string
        restartRequired?: boolean
      }
      if (!response.ok || !result.phone) {
        if (result.restartRequired) {
          sentPhoneRef.current = null
          setIsPhoneCodeSent(false)
        }
        throw new Error(result.error ?? "Could not verify the phone number.")
      }

      // Updating both makes the field equal the saved number, which hides the OTP UI.
      setProfile((current) =>
        current ? { ...current, phone: result.phone ?? null } : current
      )
      setDraft((current) => ({ ...current, phone: toE164(result.phone) }))
      flashSaved()
    } catch (error) {
      console.error("Phone number verification failed", error)
      setPhoneCodeError(
        error instanceof Error
          ? error.message
          : "Could not verify the phone number."
      )
      setPhoneCode("")
    } finally {
      setIsVerifyingPhoneCode(false)
    }
  }

  async function saveField(
    field: EditableField,
    rawValue: string
  ): Promise<boolean> {
    if (!profile || savingFields.has(field)) return false

    let value = rawValue.trim()
    if (field === "username") value = value.toLowerCase()

    const storedValue = profile[field] ?? ""
    const currentValue =
      field === "dob" ? storedValue.slice(0, 10) : storedValue

    if (field === "fullName" && !value) {
      setSaveError("Full name cannot be empty.")
      setDraft((current) => ({ ...current, [field]: currentValue }))
      return false
    }
    if (field === "username") {
      if (!value) {
        setSaveError("Username cannot be empty.")
        setDraft((current) => ({ ...current, [field]: currentValue }))
        return false
      }
      if (!USERNAME_REGEX.test(value)) {
        setSaveError(
          "Username must be 3–30 characters: letters, numbers, dots or underscores."
        )
        setDraft((current) => ({ ...current, [field]: currentValue }))
        return false
      }
    }
    if (value === currentValue) {
      if (draft[field] !== value) {
        setDraft((current) => ({ ...current, [field]: value }))
      }
      return true
    }

    setSaveError("")
    setSavingFields((current) => new Set(current).add(field))
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session) {
        throw new Error("Sign in is required to update your profile.")
      }

      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ [field]: value }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error ?? "Could not save this profile detail.")
      }

      setProfile((current) =>
        current ? { ...current, [field]: value } : current
      )
      setDraft((current) => ({ ...current, [field]: value }))
      flashSaved()
      return true
    } catch (error) {
      console.error("Profile detail could not be saved", error)
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save this profile detail."
      )
      setDraft((current) => ({ ...current, [field]: currentValue }))
      return false
    } finally {
      setSavingFields((current) => {
        const next = new Set(current)
        next.delete(field)
        return next
      })
    }
  }

  async function scanNicImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0]
    event.target.value = ""
    if (!image) return

    if (!image.type.startsWith("image/")) {
      setSaveError("Choose an image of the front of your NIC.")
      return
    }
    if (image.size > 10 * 1024 * 1024) {
      setSaveError("The NIC image must be 10 MB or smaller.")
      return
    }

    setIsScanningNic(true)
    setNicScanProgress(0)
    setSaveError("")
    try {
      const nic = await readNicFromImage(image, setNicScanProgress)
      updateDraft("nic", nic)
      const saved = await saveField("nic", nic)
      if (!saved) {
        throw new Error(
          "The NIC was read but could not be saved. Please try again."
        )
      }
    } catch (error) {
      console.error("NIC image scan failed", error)
      setSaveError(
        error instanceof Error ? error.message : "Could not read the NIC image."
      )
    } finally {
      setIsScanningNic(false)
      setNicScanProgress(0)
    }
  }

  async function uploadProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0]
    event.target.value = ""
    if (!image) return

    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(image.type)) {
      setSaveError("Profile image must be JPG, PNG, or WEBP.")
      return
    }
    if (image.size > 5 * 1024 * 1024) {
      setSaveError("Profile image must be 5 MB or smaller.")
      return
    }

    setIsUploadingImage(true)
    setSaveError("")
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session) {
        throw new Error("Sign in is required to update your profile image.")
      }

      const formData = new FormData()
      formData.append("image", image)
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        body: formData,
      })
      const result = (await response.json()) as {
        imageUrl?: string
        error?: string
      }
      if (!response.ok || !result.imageUrl) {
        throw new Error(result.error ?? "Could not upload your profile image.")
      }

      setProfile((current) =>
        current ? { ...current, imageUrl: result.imageUrl ?? null } : current
      )
      flashSaved()
    } catch (error) {
      console.error("Profile image could not be updated", error)
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not upload your profile image."
      )
    } finally {
      setIsUploadingImage(false)
    }
  }

  const displayName =
    profile?.fullName?.trim() || profile?.username?.trim() || "Your profile"
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()

  function updateDraft(field: keyof ProfileDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto bg-slate-50 p-0 data-[side=right]:w-[96vw] sm:max-w-md sm:data-[side=right]:w-full"
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-sm font-semibold text-slate-900">
                My profile
              </SheetTitle>
              <SheetDescription className="text-xs">
                Manage your account and personal details.
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {savedNotice && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  <Check className="size-3.5" aria-hidden="true" />
                  Saved
                </span>
              )}
              <SheetClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close profile"
                    className="shrink-0"
                  />
                }
              >
                <X className="size-4" aria-hidden="true" />
              </SheetClose>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 p-5 sm:p-6" aria-busy="true">
            <div className="overflow-hidden rounded-none border border-slate-200 bg-white">
              <Skeleton className="h-24 w-full rounded-none" />
              <div className="space-y-2 p-5">
                <Skeleton className="-mt-12 size-20 rounded-full border-4 border-white" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="space-y-5 rounded-none border border-slate-200 bg-white p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : loadError ? (
          <div className="m-5 rounded-none border border-rose-200 bg-white p-5 text-center sm:m-6">
            <p className="text-xs font-semibold text-slate-900">
              We couldn’t load your profile
            </p>
            <p role="alert" className="mt-1 text-xs text-slate-500">
              {loadError}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
          </div>
        ) : profile ? (
          <div className="space-y-4 p-5 sm:p-6">
            {saveError && (
              <p
                role="alert"
                className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
              >
                {saveError}
              </p>
            )}

            {/* Identity card */}
            <section className="overflow-hidden rounded-none border border-slate-200 bg-white">
              <div className="h-16 border-b border-slate-200 bg-slate-100" />
              <div className="px-5 pb-5">
                <div className="-mt-10 flex items-end justify-between gap-3">
                  <div className="relative">
                    <Avatar className="size-20 border-4 border-white bg-white">
                      {profile.imageUrl && (
                        <AvatarImage src={profile.imageUrl} alt={displayName} />
                      )}
                      <AvatarFallback className="bg-slate-100 text-xl font-semibold text-slate-700">
                        {initials || <UserRound className="size-7" />}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full border-2 border-white bg-slate-900 text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      aria-label="Change profile picture"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Camera className="size-3.5" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={uploadProfileImage}
                    />
                  </div>
                  <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    Active account
                  </span>
                </div>
                <h2 className="mt-3 truncate text-base font-semibold text-slate-900">
                  {displayName}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {profile.username
                    ? `@${profile.username}`
                    : "Username not added"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.role && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 capitalize">
                      {profile.role}
                    </span>
                  )}
                  {profile.isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      Admin
                    </span>
                  )}
                  {profile.isSubAdmin && !profile.isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      Sub admin
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Account */}
            <section className="rounded-none border border-slate-200 bg-white px-4 sm:px-5">
              <div className="border-b border-slate-100 py-3.5">
                <h3 className="text-xs font-semibold text-slate-900">
                  Account
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Changes save automatically when you leave a field.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                <EditableDetail
                  icon={UserRound}
                  label="Full name"
                  value={draft.fullName}
                  placeholder="Add your full name"
                  saving={savingFields.has("fullName")}
                  onChange={(value) => updateDraft("fullName", value)}
                  onBlur={(value) => void saveField("fullName", value)}
                />
                <EditableDetail
                  icon={AtSign}
                  label="Username"
                  value={draft.username}
                  placeholder="Choose a username"
                  hint="3–30 characters. Letters, numbers, dots and underscores."
                  saving={savingFields.has("username")}
                  onChange={(value) => updateDraft("username", value)}
                  onBlur={(value) => void saveField("username", value)}
                />
              </div>
            </section>

            {/* Contact */}
            <section className="rounded-none border border-slate-200 bg-white px-4 sm:px-5">
              <div className="border-b border-slate-100 py-3.5">
                <h3 className="text-xs font-semibold text-slate-900">
                  Contact
                </h3>
              </div>

              <PhoneDetail
                value={draft.phone}
                disabled={isVerifyingPhoneCode}
                onChange={(value) => updateDraft("phone", value)}
              />

              {/* OTP UI: only when a complete, new number is entered */}
              {isNewPhone && (
                <section
                  aria-label="Verify your new phone number"
                  aria-busy={isSendingPhoneCode || isVerifyingPhoneCode}
                  className="mb-4 animate-in rounded-none border border-slate-200 bg-slate-50 p-4 duration-300 slide-in-from-top-2"
                >
                  <h4 className="text-xs font-semibold text-slate-900">
                    Verify new phone number
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {isPhoneCodeSent
                      ? `Enter the 6-digit code we sent to ${pendingPhone}. The number is saved only after verification.`
                      : "We’ll send a verification code to this number before saving it."}
                  </p>

                  {isSendingPhoneCode && !isPhoneCodeSent && (
                    <p
                      role="status"
                      className="mt-3 flex items-center gap-2 text-xs text-slate-500"
                    >
                      <Loader2 className="size-3.5 animate-spin" />
                      Sending verification code…
                    </p>
                  )}

                  {isPhoneCodeSent && (
                    <div className="mt-4">
                      <InputOTP
                        aria-label="Phone verification code"
                        autoFocus
                        disabled={isVerifyingPhoneCode || isSendingPhoneCode}
                        maxLength={6}
                        value={phoneCode}
                        onChange={(value) => {
                          setPhoneCode(value)
                          setPhoneCodeError("")
                          if (value.length === 6) {
                            void verifyPhoneChange(value)
                          }
                        }}
                      >
                        <InputOTPGroup className="w-full justify-between gap-2">
                          {Array.from({ length: 6 }, (_, index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="size-10 rounded-none border-slate-200 bg-white text-sm font-semibold first:rounded-none first:border-l last:rounded-none sm:size-11"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                      <p className="mt-2 text-center text-[11px] text-slate-500">
                        {isVerifyingPhoneCode
                          ? "Verifying code…"
                          : "The number updates automatically once the code is verified."}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs">
                        {phoneResendSeconds > 0 ? (
                          <span className="text-slate-500">
                            Resend code in{" "}
                            {`${Math.floor(phoneResendSeconds / 60)}:${String(phoneResendSeconds % 60).padStart(2, "0")}`}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="font-semibold text-slate-700 underline-offset-4 hover:underline disabled:opacity-50"
                            onClick={() => void resendPhoneVerification()}
                            disabled={
                              isSendingPhoneCode || isVerifyingPhoneCode
                            }
                          >
                            Resend code
                          </button>
                        )}
                        {isSendingPhoneCode && (
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <Loader2 className="size-3.5 animate-spin" />
                            Sending
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {phoneCodeError && (
                    <p
                      role="alert"
                      className="mt-3 text-xs font-medium text-rose-700"
                    >
                      {phoneCodeError}
                    </p>
                  )}

                  {!isPhoneCodeSent &&
                    !isSendingPhoneCode &&
                    phoneCodeError && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => void startPhoneVerification(draft.phone)}
                      >
                        Retry sending code
                      </Button>
                    )}

                  <button
                    type="button"
                    className="mt-3 w-full text-center text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline disabled:opacity-50"
                    disabled={isVerifyingPhoneCode}
                    onClick={() => updateDraft("phone", actualPhone)}
                  >
                    Cancel and keep current number
                  </button>
                </section>
              )}
            </section>

            {/* Personal */}
            <section className="rounded-none border border-slate-200 bg-white px-4 sm:px-5">
              <div className="border-b border-slate-100 py-3.5">
                <h3 className="text-xs font-semibold text-slate-900">
                  Personal details
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                <EditableDetail
                  icon={Fingerprint}
                  label="NIC / ID number"
                  value={draft.nic}
                  placeholder="Add your NIC or ID number"
                  saving={savingFields.has("nic")}
                  footer={
                    <div className="mt-2">
                      <input
                        ref={nicImageInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={scanNicImage}
                        disabled={isScanningNic || savingFields.has("nic")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => nicImageInputRef.current?.click()}
                        disabled={isScanningNic || savingFields.has("nic")}
                      >
                        {isScanningNic ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ScanLine className="size-4" />
                        )}
                        {isScanningNic
                          ? `Reading NIC${nicScanProgress > 0 ? ` · ${nicScanProgress}%` : "…"}`
                          : "Scan NIC"}
                      </Button>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Take a clear photo or choose an image. The recognized
                        number is added and saved automatically.
                      </p>
                    </div>
                  }
                  onChange={(value) => updateDraft("nic", value)}
                  onBlur={(value) => void saveField("nic", value)}
                />
                <EditableDetail
                  icon={Cake}
                  label="Date of birth"
                  value={draft.dob}
                  type="date"
                  max={today}
                  placeholder="Add your date of birth"
                  saving={savingFields.has("dob")}
                  onChange={(value) => updateDraft("dob", value)}
                  onBlur={(value) => void saveField("dob", value)}
                />
                <EditableDetail
                  icon={MapPin}
                  label="Address"
                  value={draft.address}
                  placeholder="Add your address"
                  multiline
                  saving={savingFields.has("address")}
                  onChange={(value) => updateDraft("address", value)}
                  onBlur={(value) => void saveField("address", value)}
                />
              </div>
            </section>

            {/* Membership */}
            <section className="flex items-center gap-3 rounded-none border border-slate-200 bg-white p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                <CalendarDays className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Member since
                </h3>
                <p className="mt-0.5 text-xs font-medium text-slate-900">
                  {formatDate(profile.joinedDate)}
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
