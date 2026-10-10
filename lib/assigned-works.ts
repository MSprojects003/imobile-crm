"use client"

import { supabase } from "@/lib/supabase"

export type AssignmentStaffOption = {
  id: string
  staffId: string
  fullName: string
  area: string | null
}

export type AssignmentShopOption = {
  id: string
  name: string
  area: string | null
}

export type AssignmentOptions = {
  staff: AssignmentStaffOption[]
  shops: AssignmentShopOption[]
}

export type AssignedWorkRecord = {
  id: string
  staffId: string
  staffCode: string
  staffName: string
  shopName: string
  shopArea: string
  message: string | null
  progress: string
  createdAt: string
}

export type CreateAssignedWorkInput = {
  staffId: string
  shopId: string
  message: string
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error("Your session expired. Please sign in again.")
  }
  return data.session.access_token
}

async function parseResponse<T>(response: Response): Promise<T> {
  const result = await response.json() as T & { error?: string }
  if (!response.ok) {
    throw new Error(result.error ?? "The assignment request could not be completed.")
  }
  return result
}

export async function fetchAssignmentOptions(): Promise<AssignmentOptions> {
  const accessToken = await getAccessToken()
  const response = await fetch("/api/assigned-works", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  const result = await parseResponse<AssignmentOptions>(response)
  return {
    staff: result.staff ?? [],
    shops: result.shops ?? [],
  }
}

export async function fetchAssignedWorks(): Promise<AssignedWorkRecord[]> {
  const accessToken = await getAccessToken()
  const response = await fetch("/api/assigned-works/list", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  const result = await parseResponse<{ works: AssignedWorkRecord[] }>(response)
  return result.works
}

export async function createAssignedWork(input: CreateAssignedWorkInput) {
  const accessToken = await getAccessToken()
  const response = await fetch("/api/assigned-works", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })
  return parseResponse<{
    assignedWork: { id: string }
    smsDelivery: { sent: boolean; logged: boolean; error?: string }
  }>(response)
}
