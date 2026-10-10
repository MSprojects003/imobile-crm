"use client"

import { supabase } from "@/lib/supabase"
import type { DashboardStats } from "@/lib/api/stat.card"
import { readDashboardApiResponse } from "@/lib/dashboard-api-response"

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error("Your session expired. Please sign in again.")
  }

  const response = await fetch("/api/dashboard/stats", {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
  })
  return readDashboardApiResponse<DashboardStats>(
    response,
    "Could not load dashboard statistics.",
  )
}
