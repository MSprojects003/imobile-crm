import { supabase } from "@/lib/supabase"

export type StaffRecord = {
  id: string
  staffId: string
  userId: string
  fullName: string
  phone: string
  nic: string | null
  address: string | null
  role: string | null
  isActive: boolean
  isDeleted: boolean
  createdAt: string
}

export type StaffList = {
  staff: StaffRecord[]
  nextStaffId: string
}

export type CreateStaffInput = {
  fullName: string
  phone: string
  nic: string
  address: string
  role: string
  accountType: "staff" | "sub_admin"
  username?: string
  password?: string
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error("Your session expired. Please sign in again.")
  return data.session.access_token
}

async function parseResponse<T>(response: Response): Promise<T> {
  const result = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? "The staff request could not be completed.")
  return result
}

export async function fetchStaff(): Promise<StaffList> {
  const accessToken = await getAccessToken()
  const response = await fetch("/api/staff", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  return parseResponse<StaffList>(response)
}

export async function createStaff(input: CreateStaffInput): Promise<StaffRecord> {
  const accessToken = await getAccessToken()
  const response = await fetch("/api/staff", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })
  const result = await parseResponse<{ staff: StaffRecord }>(response)
  return result.staff
}

export async function updateStaffStatus(id: string, isActive: boolean): Promise<StaffRecord> {
  const accessToken = await getAccessToken()
  const response = await fetch(`/api/staff?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isActive }),
  })
  const result = await parseResponse<{ staff: StaffRecord }>(response)
  return result.staff
}