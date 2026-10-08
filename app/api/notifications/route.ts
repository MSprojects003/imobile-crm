import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewNotifications")
  if (!authorization.authorized) return authorization.response

  const { data, error } = await authorization.adminClient
    .from("notifications")
    .select("id, title, message, type, is_read, created_at, content_id")
    .eq("to_user_id", authorization.notificationUserId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("Admin notifications query failed", { code: error.code })
    return NextResponse.json({ error: "Could not load notifications." }, { status: 500 })
  }

  return NextResponse.json({ notifications: data ?? [] })
}
