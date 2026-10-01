"use client"

import { FormEvent, useState } from "react"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"

import { SubtitleWithBack } from "@/components/custom/subtitle-with-back"

type ForgotPasswordFormProps = {
  onBackToLogin: () => void
  onPhoneSubmitted: (phoneNumber: string) => Promise<string>
}

export function ForgotPasswordForm({ onBackToLogin, onPhoneSubmitted }: ForgotPasswordFormProps) {
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!phoneNumber) return

    setIsSubmitting(true)
    setError("")
    try {
      await onPhoneSubmitted(phoneNumber)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send the verification code.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex items-center px-7 py-10 sm:px-10 sm:py-12 lg:px-12 xl:px-16">
      <div className="mx-auto w-full max-w-[330px]">
        <div className="mb-6">
          <SubtitleWithBack backLabel="Back to login" onBack={onBackToLogin} subtitle="Account recovery" />
          <h1 className="text-[1.7rem] font-bold tracking-[-0.045em] text-[#14161a] sm:text-[1.95rem]">Forgot your password?</h1>
          <p className="mt-2 text-sm leading-6 text-[#717781] sm:text-[15px]">
            Enter the phone number linked to your account and we&apos;ll send you a verification code.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-[#505762]">Phone number</span>
            <PhoneInput
              aria-label="Phone number"
              autoComplete="tel"
              className="phone-input flex h-[52px] items-center rounded-[8px] border border-[#dfe2e6] bg-white px-3.5 shadow-[0_3px_10px_rgba(16,24,40,0.04)] transition-shadow focus-within:border-[#ed1c2e] focus-within:shadow-[0_0_0_4px_rgba(237,28,46,0.12)] sm:h-[54px]"
              country="LK"
              countrySelectProps={{ disabled: true, tabIndex: -1, "aria-hidden": true }}
              defaultCountry="LK"
              international
              name="phone"
              onChange={setPhoneNumber}
              placeholder="77 123 4567"
              required
              value={phoneNumber}
            />
          </label>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <button
            className="h-[52px] w-full rounded-[8px] bg-[#ed1c2e] text-[15px] font-semibold text-white shadow-[0_8px_18px_rgba(237,28,46,0.28)] transition-colors hover:bg-[#d5192a] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ed1c2e]/30 focus-visible:ring-offset-2 sm:h-[54px]"
            disabled={isSubmitting || !phoneNumber}
            type="submit"
          >
            {isSubmitting ? "Sending code..." : "Send verification code"}
          </button>
        </form>
      </div>
    </section>
  )
}