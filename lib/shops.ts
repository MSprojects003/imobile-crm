"use client"

import { supabase } from "@/lib/supabase"

export type ShopRecord = {
  id: string
  shopId: string | null
  name: string
  owner: string
  address: string
  area: string | null
  phone: string | null
  email: string | null
  isActive: boolean
  createdAt: string
  staffName: string
  staffPhone: string
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error("Your session expired. Please sign in again.")
  return data.session.access_token
}

export async function fetchShops(): Promise<ShopRecord[]> {
  const accessToken = await getAccessToken()
  const response = await fetch("/api/shops", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  const result = await response.json() as { shops?: ShopRecord[]; error?: string }
  if (!response.ok) throw new Error(result.error ?? "Could not load shops.")
  return result.shops ?? []
}

export async function updateShopStatus(id: string, isActive: boolean): Promise<void> {
  const accessToken = await getAccessToken()
  const response = await fetch(`/api/shops?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isActive }),
  })
  const result = await response.json() as { error?: string }
  if (!response.ok) throw new Error(result.error ?? "Could not update shop status.")
}
