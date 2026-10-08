import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest } from "@/lib/admin-auth"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeDashboardRequest(request, "viewNotifications")
  if (!authorization.authorized) return authorization.response

  const { id } = await params
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "The notification ID is invalid." }, { status: 400 })
  }

  let body: { isRead?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid notification update request." }, { status: 400 })
  }
  if (typeof body.isRead !== "boolean") {
    return NextResponse.json({ error: "Choose whether the notification is read." }, { status: 400 })
  }

  const { data, error } = await authorization.adminClient
    .from("notifications")
    .update({
      is_read: body.isRead,
      read_at: body.isRead ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("to_user_id", authorization.notificationUserId)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Admin notification update failed", { code: error.code })
    return NextResponse.json({ error: "Could not update the notification." }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "The notification was not found for this account." }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
