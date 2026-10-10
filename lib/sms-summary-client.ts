"use client"

import { supabase } from "@/lib/supabase"
import { readDashboardApiResponse } from "@/lib/dashboard-api-response"

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
  return readDashboardApiResponse<SmsMonthlySummary>(
    response,
    "Could not load SMS counts.",
  )
}
