"use client"

import { FormEvent, useState } from "react"
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type LoginFormProps = {
  onForgotPassword: () => void
  onLogin: (credentials: { username: string; password: string }) => Promise<void>
}

export function LoginForm({ onForgotPassword, onLogin }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")
    const formData = new FormData(event.currentTarget)

    try {
      await onLogin({
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? ""),
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex items-center px-7 py-10 sm:px-10 sm:py-12 lg:px-12 xl:px-16">
      <div className="mx-auto w-full max-w-[330px]">
        <div className="mb-6 lg:mb-7">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#ed1c2e]">Admin portal</p>
          <h1 className="text-[1.7rem] font-bold tracking-[-0.045em] text-[#14161a] sm:text-[1.95rem]">Admin Login</h1>
          <p className="mt-1.5 text-sm text-[#717781] sm:text-[15px]">Enter your credentials to continue</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-[#505762]">Username</span>
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-[19px] -translate-y-1/2 text-[#737b85]" strokeWidth={1.8} />
              <Input
                aria-label="Username"
                autoComplete="username"
                className="h-[52px] rounded-[8px] border-[#dfe2e6] bg-white pl-11 text-sm font-medium shadow-[0_3px_10px_rgba(16,24,40,0.04)] placeholder:text-[#a3a8af] focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20 sm:h-[54px]"
                name="username"
                placeholder="Enter your username"
                required
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-[#505762]">Password</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-[19px] -translate-y-1/2 text-[#737b85]" strokeWidth={1.8} />
              <Input
                aria-label="Password"
                autoComplete="current-password"
                className="h-[52px] rounded-[8px] border-[#dfe2e6] bg-white px-11 text-sm font-medium shadow-[0_3px_10px_rgba(16,24,40,0.04)] placeholder:text-[#a3a8af] focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20 sm:h-[54px]"
                name="password"
                placeholder="Enter your password"
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-[#7d858f] transition-colors hover:bg-[#f3f4f5] hover:text-[#ed1c2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? <EyeOff className="size-[19px]" /> : <Eye className="size-[19px]" />}
              </button>
            </span>
          </label>

          <Button className="mt-1 h-12 w-full rounded-[8px] bg-[#ed1c2e] text-sm font-semibold text-white shadow-[0_8px_18px_rgba(237,28,46,0.2)] hover:bg-[#d91829]" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Login"}
          </Button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}

        <button className="mt-6 block w-full text-right text-sm font-medium text-[#ed1c2e] transition-colors hover:text-[#b91423] focus-visible:outline-none focus-visible:underline" onClick={onForgotPassword} type="button">
          Forgot Password?
        </button>
      </div>
    </section>
  )
}