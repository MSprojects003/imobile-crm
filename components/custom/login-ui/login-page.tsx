"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { BrandPanel } from "@/components/custom/login-ui/brand-panel"
import { ForgotPasswordForm } from "@/components/custom/login-ui/forgot-password-form"
import { LoginForm } from "@/components/custom/login-ui/login-form"
import { OtpVerification } from "@/components/custom/login-ui/otp-verification"
import { ResetPasswordForm } from "@/components/custom/login-ui/reset-password-form"
import { supabase } from "@/lib/supabase"

async function callAuthApi(payload: Record<string, string>) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? "Authentication failed.")
  return result
}

export function LoginPage() {
  const router = useRouter()
  const [screen, setScreen] = useState<"login" | "login-otp" | "forgot-password" | "otp" | "reset-password">("login")
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>()
  const [accountName, setAccountName] = useState("")

  async function startLogin(credentials: { username: string; password: string }) {
    const result = await callAuthApi({ action: "start", ...credentials })
    if (!result.requiresOtp) {
      const { error } = await supabase.auth.setSession(result.session)
      if (error) throw new Error("Signed in, but the session could not be started. Please try again.")
      router.replace("/dashboard")
      return
    }
    setPhoneNumber(result.phone)
    setScreen("login-otp")
  }

  async function verifyLogin(code: string) {
    const result = await callAuthApi({ action: "verify", code })
    const { error } = await supabase.auth.setSession(result.session)
    if (error) throw new Error("Code verified, but the session could not be started. Please sign in again.")
    router.replace("/dashboard")
  }

  async function resendLoginOtp() {
    await callAuthApi({ action: "resend" })
  }

  async function cancelLogin() {
    await callAuthApi({ action: "cancel" })
    setScreen("login")
  }

  async function startPasswordReset(phone: string) {
    const result = await callAuthApi({ action: "reset-start", phone })
    setPhoneNumber(result.phone)
    setAccountName(result.name)
    setScreen("otp")
    return result.phone as string
  }

  async function verifyPasswordResetOtp(code: string) {
    await callAuthApi({ action: "verify", code })
    setScreen("reset-password")
  }

  async function resendPasswordResetOtp() {
    await callAuthApi({ action: "resend" })
  }

  async function cancelPasswordReset(returnTo: "forgot-password" | "login") {
    try {
      await callAuthApi({ action: "cancel" })
    } finally {
      setScreen(returnTo)
    }
  }

  async function updatePassword(values: { phoneNumber?: string; newPassword: string }) {
    await callAuthApi({ action: "reset-complete", newPassword: values.newPassword })
  }

  return (
    <main className="flex min-h-svh items-center bg-[#f4f5f7] p-0 text-[#17191d] sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto grid w-full max-w-[920px] overflow-hidden bg-white shadow-[0_20px_70px_rgba(19,24,34,0.1)] sm:rounded-xl">
        <div className="grid min-h-[540px] lg:grid-cols-[minmax(290px,0.94fr)_minmax(360px,1.06fr)]">
          <BrandPanel />
          {screen === "login" && (
            <LoginForm
              onForgotPassword={() => setScreen("forgot-password")}
              onLogin={startLogin}
            />
          )}
          {screen === "login-otp" && (
            <OtpVerification onBack={cancelLogin} onComplete={verifyLogin} onResend={resendLoginOtp} phoneNumber={phoneNumber} purpose="login" />
          )}
          {screen === "forgot-password" && (
            <ForgotPasswordForm
              onBackToLogin={() => setScreen("login")}
              onPhoneSubmitted={startPasswordReset}
            />
          )}
          {screen === "otp" && (
            <OtpVerification
              onBack={() => cancelPasswordReset("forgot-password")}
              onComplete={verifyPasswordResetOtp}
              onResend={resendPasswordResetOtp}
              phoneNumber={phoneNumber}
              purpose="password-reset"
            />
          )}
          {screen === "reset-password" && (
            <ResetPasswordForm name={accountName} onBack={() => cancelPasswordReset("login")} onSubmit={updatePassword} phoneNumber={phoneNumber} />
          )}
        </div>
      </div>
    </main>
  )
}