"use client"

import { supabase } from "@/lib/supabase"
import type { TopStaffMember, TopStaffPeriod } from "@/lib/api/top-staff"

export async function fetchTopStaff(period: TopStaffPeriod): Promise<TopStaffMember[]> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error("Your session expired. Please sign in again.")
  }

  const response = await fetch(`/api/dashboard/top-staff?period=${period}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
  })
  const result = await response.json() as { staff?: TopStaffMember[]; error?: string }
  if (!response.ok || !result.staff) {
    throw new Error(result.error ?? "Could not load top staff order totals.")
  }
  return result.staff
}
