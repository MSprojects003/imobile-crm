"use client"

import { OtpUi } from "@/components/custom/login-ui/otp-ui"

type OtpVerificationProps = {
  onBack: () => void
  onComplete?: (code: string) => Promise<void>
  onResend?: () => Promise<void>
  phoneNumber?: string
  purpose: "login" | "password-reset"
}

export function OtpVerification({ onBack, onComplete, onResend, phoneNumber, purpose }: OtpVerificationProps) {
  const isLoginVerification = purpose === "login"
  const subtitle = isLoginVerification
    ? phoneNumber
      ? `Enter the six-digit code sent to ${phoneNumber} to finish signing in.`
      : "Enter the six-digit code sent to your registered phone number to finish signing in."
    : phoneNumber
      ? `Enter the six-digit code sent to ${phoneNumber}.`
      : "Enter the six-digit code sent to the phone number linked to your account."

  return (
    <OtpUi
      onChangePhoneNumber={onBack}
      onComplete={onComplete}
      onResend={onResend}
      subtitle={subtitle}
      title={isLoginVerification ? "Secure your sign-in" : "Verify your phone number"}
    />
  )
}
