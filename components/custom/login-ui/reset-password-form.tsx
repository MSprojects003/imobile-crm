"use client"

import { FormEvent, useState } from "react"
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react"

import { SubtitleWithBack } from "@/components/custom/subtitle-with-back"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ResetPasswordFormProps = {
  name?: string
  phoneNumber?: string
  onBack: () => void
  onSubmit: (values: { phoneNumber?: string; newPassword: string }) => Promise<void>
}

export function ResetPasswordForm({ name = "", phoneNumber: initialPhoneNumber, onBack, onSubmit }: ResetPasswordFormProps) {
  const phoneNumber = initialPhoneNumber
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [didReset, setDidReset] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      setPasswordError("The passwords do not match.")
      return
    }

    setPasswordError("")
    setSubmitError("")
    setIsSubmitting(true)
    try {
      await onSubmit({ phoneNumber, newPassword })
      setDidReset(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not reset your password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex items-center px-7 py-8 sm:px-10 sm:py-10 lg:px-12 xl:px-16">
      <div className="mx-auto w-full max-w-[350px]">
        <div className="mb-6">
          <SubtitleWithBack backLabel="Back to login" onBack={onBack} subtitle="Account recovery" />
          <h1 className="text-[1.65rem] font-bold tracking-[-0.045em] text-[#14161a] sm:text-[1.85rem]">Reset your password</h1>
          <p className="mt-1.5 text-sm leading-5 text-[#717781]">
            Choose a new password to secure your account.
          </p>
        </div>

        {didReset ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-[#198754]" role="status">Your password has been reset. You can now sign in with your new password.</p>
            <Button className="h-10 w-full rounded-[7px] bg-[#ed1c2e] text-sm font-semibold text-white hover:bg-[#d91829]" onClick={onBack} type="button">
              Back to login
            </Button>
          </div>
        ) : (
        <form className="space-y-3.5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#505762]">Name</span>
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a919a]" strokeWidth={1.8} />
              <Input
                aria-label="Name"
                className="h-10 rounded-[7px] border-[#e2e5e9] bg-[#f6f7f8] pl-10 text-sm font-medium text-[#737b85] disabled:cursor-not-allowed disabled:opacity-100"
                disabled
                name="name"
                placeholder="Account name"
                value={name}
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#505762]">Phone number</span>
            <Input
              aria-label="Phone number"
              className="h-10 rounded-[7px] border-[#e2e5e9] bg-[#f6f7f8] text-sm font-medium text-[#737b85] disabled:cursor-not-allowed disabled:opacity-100"
              disabled
              name="phone"
              value={phoneNumber}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#505762]">New password</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a919a]" strokeWidth={1.8} />
              <Input
                autoComplete="new-password"
                className="h-10 rounded-[7px] border-[#dfe2e6] bg-white pl-10 pr-10 text-sm shadow-[0_2px_7px_rgba(16,24,40,0.035)] focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20"
                minLength={8}
                name="newPassword"
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
              />
              <button
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#7d858f] hover:text-[#ed1c2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
                onClick={() => setShowNewPassword((visible) => !visible)}
                type="button"
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#505762]">Confirm new password</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a919a]" strokeWidth={1.8} />
              <Input
                autoComplete="new-password"
                aria-invalid={Boolean(passwordError)}
                className="h-10 rounded-[7px] border-[#dfe2e6] bg-white pl-10 pr-10 text-sm shadow-[0_2px_7px_rgba(16,24,40,0.035)] focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20 aria-invalid:border-[#dc2626]"
                minLength={8}
                name="confirmPassword"
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setPasswordError("")
                }}
                placeholder="Re-enter your password"
                required
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
              />
              <button
                aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#7d858f] hover:text-[#ed1c2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                type="button"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
            {passwordError && <span className="mt-1 block text-xs text-[#dc2626]" role="alert">{passwordError}</span>}
          </label>

          {submitError && <p className="text-xs text-[#dc2626]" role="alert">{submitError}</p>}

          <Button className="mt-1 h-10 w-full rounded-[7px] bg-[#ed1c2e] text-sm font-semibold text-white shadow-[0_6px_14px_rgba(237,28,46,0.18)] hover:bg-[#d91829]" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Resetting password..." : "Reset password"}
          </Button>
        </form>
        )}
      </div>
    </section>
  )
}
