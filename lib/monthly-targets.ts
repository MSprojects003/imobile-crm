"use client"

import { supabase } from "@/lib/supabase"

export type MonthlyTargetSummary = {
  month: number
  year: number
  previousBalance: number
  currentTarget: {
    id: string
    targetAmount: number
    achievedAmount: number
  } | null
}

export type MonthlyTargetSaveResult = MonthlyTargetSummary & {
  delivery: {
    smsSent: boolean
    smsLogged: boolean
    notificationsSent: boolean
    smsError?: string
  }
}

export type CurrentMonthlyTargets = {
  month: number
  year: number
  staffIds: string[]
}

export type MonthlyTargetHistoryRecord = {
  id: string
  month: number
  year: number
  targetAmount: number
  achievedAmount: number
}

export type MonthlyTargetHistory = {
  staffId: string
  year: number | "all"
  targets: MonthlyTargetHistoryRecord[]
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error("Your session expired. Please sign in again.")
  }
  return data.session.access_token
}

async function parseResponse<T>(response: Response): Promise<T> {
  const result = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(result.error ?? "The monthly target request failed.")
  }
  return result
}

export async function fetchMonthlyTarget(
  staffUserId: string,
  month: number,
  year: number
): Promise<MonthlyTargetSummary> {
  const accessToken = await getAccessToken()
  const params = new URLSearchParams({
    staffId: staffUserId,
    month: String(month),
    year: String(year),
  })
  const response = await fetch(`/api/monthly-target?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  return parseResponse<MonthlyTargetSummary>(response)
}

export async function fetchMonthlyTargetHistory(
  staffUserId: string,
  year: number | "all"
): Promise<MonthlyTargetHistory> {
  const accessToken = await getAccessToken()
  const params = new URLSearchParams({
    staffId: staffUserId,
    history: "true",
    year: String(year),
  })
  const response = await fetch(`/api/monthly-target?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  return parseResponse<MonthlyTargetHistory>(response)
}

export async function fetchCurrentMonthlyTargetStaffIds(
  month: number,
  year: number
): Promise<CurrentMonthlyTargets> {
  const accessToken = await getAccessToken()
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
  })
  const response = await fetch(`/api/monthly-target?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  return parseResponse<CurrentMonthlyTargets>(response)
}

export async function saveMonthlyTarget(input: {
  staffUserId: string
  month: number
  year: number
  targetAmount: number
}): Promise<MonthlyTargetSaveResult> {
  const accessToken = await getAccessToken()
  const response = await fetch("/api/monthly-target", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      staffId: input.staffUserId,
      month: input.month,
      year: input.year,
      targetAmount: input.targetAmount,
    }),
  })
  return parseResponse<MonthlyTargetSaveResult>(response)
}
