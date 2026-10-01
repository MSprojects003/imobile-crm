"use client"

import { useEffect, useRef, useState } from "react"

import { SubtitleWithBack } from "@/components/custom/subtitle-with-back"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

const RESEND_DELAY_SECONDS = 120

type OtpUiProps = {
  onChangePhoneNumber: () => void
  onComplete?: (code: string) => Promise<void>
  onResend?: () => Promise<void>
  title: string
  subtitle: string
}

export function OtpUi({ onChangePhoneNumber, onComplete, onResend, title, subtitle }: OtpUiProps) {
  const [otp, setOtp] = useState("")
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_DELAY_SECONDS)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const verificationInFlight = useRef(false)

  useEffect(() => {
    if (secondsRemaining === 0) {
      return
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((currentSeconds) => Math.max(currentSeconds - 1, 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [secondsRemaining])

  async function handleResend() {
    if (!onResend) return
    setError("")
    try {
      await onResend()
      setOtp("")
      setSecondsRemaining(RESEND_DELAY_SECONDS)
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Unable to resend the code.")
    }
  }

  function handleOtpChange(value: string) {
    setOtp(value)
    setError("")
    if (value.length === 6) void verifyCode(value)
  }

  async function verifyCode(code: string) {
    if (code.length !== 6 || !onComplete || verificationInFlight.current) return
    verificationInFlight.current = true
    setIsSubmitting(true)
    setError("")
    try {
      await onComplete(code)
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Unable to verify the code.")
      setOtp("")
    } finally {
      verificationInFlight.current = false
      setIsSubmitting(false)
    }
  }

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  return (
    <section className="flex items-center px-7 py-10 sm:px-10 sm:py-12 lg:px-12 xl:px-16">
      <div className="mx-auto w-full max-w-[330px]">
        <div className="mb-7">
          <SubtitleWithBack backLabel="Change phone number" onBack={onChangePhoneNumber} subtitle="Verification" />
          <h1 className="text-[1.7rem] font-bold tracking-[-0.045em] text-[#14161a] sm:text-[1.95rem]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#717781] sm:text-[15px]">{subtitle}</p>
        </div>

        <div className="rounded-[10px] border border-[#e4e6e9] bg-white p-5 shadow-[0_8px_24px_rgba(16,24,40,0.05)] sm:p-6">
          <label className="block">
            <span className="mb-3 block text-[13px] font-semibold text-[#505762]">Enter verification code</span>
            <InputOTP
              aria-label="Verification code"
              autoFocus
              disabled={isSubmitting}
              maxLength={6}
              onChange={handleOtpChange}
              value={otp}
            >
              <InputOTPGroup className="w-full justify-between gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot
                    className="size-11 rounded-[7px] border-[#dfe2e6] bg-[#fafafa] text-base font-semibold text-[#14161a] first:border-l last:rounded-[7px] first:rounded-[7px] focus-within:border-[#ed1c2e] data-[active=true]:border-[#ed1c2e] data-[active=true]:ring-[#ed1c2e]/20 sm:size-12"
                    index={index}
                    key={index}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </label>

          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
          {isSubmitting && <p className="mt-3 text-center text-sm text-[#717781]" role="status">Verifying code...</p>}

          <div className="mt-5 flex items-center justify-center border-t border-[#eef0f2] pt-4 text-sm">
            {secondsRemaining > 0 || !onResend ? (
              <span className="text-[#8a919a]">Resend code in {formattedTime}</span>
            ) : (
              <button
                className="font-semibold text-[#ed1c2e] transition-colors hover:text-[#c91526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30 focus-visible:ring-offset-2"
                disabled={isSubmitting}
                onClick={handleResend}
                type="button"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
