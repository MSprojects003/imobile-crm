"use client"

import { supabase } from "@/lib/supabase"
import type { SalesTrendPeriod, SalesTrendPoint } from "@/lib/api/sales-trend"

export async function fetchSalesTrend(period: SalesTrendPeriod): Promise<SalesTrendPoint[]> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error("Your session expired. Please sign in again.")
  }

  const response = await fetch(`/api/dashboard/sales-trend?period=${period}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
  })
  const result = await response.json() as { data?: SalesTrendPoint[]; error?: string }
  if (!response.ok || !result.data) {
    throw new Error(result.error ?? "Could not load order totals.")
  }
  return result.data
}
