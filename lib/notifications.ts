"use client"

import { supabase } from "@/lib/supabase"

export type AdminNotification = {
  id: string
  title: string
  message: string
  type: string | null
  is_read: boolean
  created_at: string
  content_id: string | null
  from_user_id: string | null
  to_user_id: string
  is_to_all: boolean
  link: string | null
}

function isAdminNotification(value: unknown): value is AdminNotification {
  if (typeof value !== "object" || value === null) return false

  return (
    "id" in value && typeof value.id === "string" &&
    "title" in value && typeof value.title === "string" &&
    "message" in value && typeof value.message === "string" &&
    "to_user_id" in value && typeof value.to_user_id === "string" &&
    "is_to_all" in value && typeof value.is_to_all === "boolean" &&
    "is_read" in value && typeof value.is_read === "boolean" &&
    "created_at" in value && typeof value.created_at === "string" &&
    "type" in value && (value.type === null || typeof value.type === "string") &&
    "from_user_id" in value && (value.from_user_id === null || typeof value.from_user_id === "string") &&
    "content_id" in value && (value.content_id === null || typeof value.content_id === "string") &&
    "link" in value && (value.link === null || typeof value.link === "string")
  )
}

export async function getAdminNotificationUserId() {
  const { data, error } = await supabase.rpc("current_notification_user_id")
  if (error) throw new Error(`Unable to resolve notification recipient: ${error.message}`)
  if (typeof data !== "string" || !data) {
    throw new Error("No notification profile is linked to the signed-in account.")
  }
  return data
}

export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  const recipientId = await getAdminNotificationUserId()
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, type, from_user_id, to_user_id, is_to_all, is_read, content_id, link, created_at")
    .eq("to_user_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) throw new Error(`Unable to load notifications: ${error.message}`)

  const rows: unknown[] = data ?? []
  if (!rows.every(isAdminNotification)) {
    throw new Error("The notifications response contains an invalid record.")
  }
  return rows
}

export async function updateAdminNotification(id: string, isRead: boolean) {
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !data.session) {
    throw new Error("Your session expired. Please sign in again.")
  }
  const accessToken = data.session.access_token
  const response = await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isRead }),
  })
  const result = await response.json() as { error?: unknown }
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to update notification."
    )
  }
}
