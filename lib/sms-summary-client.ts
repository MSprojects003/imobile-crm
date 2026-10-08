"use client"

import { supabase } from "@/lib/supabase"

export type SmsMonthlySummary = {
  fiscalYear: number
  currentYear: number
  currentMonth: number
  currentCount: number
  total: number
  months: { year: number; month: number; count: number }[]
}

export async function fetchSmsMonthlySummary(): Promise<SmsMonthlySummary> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error("Your session expired. Please sign in again.")
  }

  const response = await fetch("/api/dashboard/sms-summary", {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
  })
  const result = await response.json() as SmsMonthlySummary & { error?: string }
  if (!response.ok) {
    throw new Error(result.error ?? "Could not load SMS counts.")
  }
  return result
}
