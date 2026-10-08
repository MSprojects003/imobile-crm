import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest } from "@/lib/admin-auth"
import { sendNotifySms } from "@/lib/notify-lk"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "assignWork")
  if (!authorization.authorized) return authorization.response

  const [staffResult, shopsResult] = await Promise.all([
    authorization.adminClient
      .from("staff")
      .select("id, staff_id, user_id, is_active, is_deleted, user:users!staff_user_id_fkey(full_name, phone)")
      .eq("is_deleted", false)
      .eq("is_active", true)
      .order("staff_id", { ascending: true }),
    authorization.adminClient
      .from("shops")
      .select("id, name")
      .eq("is_deleted", false)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ])

  if (staffResult.error) {
    console.error("Assignment staff lookup failed", { code: staffResult.error.code })
    return NextResponse.json({ error: "Could not load staff for assignment." }, { status: 500 })
  }
  if (shopsResult.error) {
    console.error("Assignment shop lookup failed", { code: shopsResult.error.code })
    return NextResponse.json({ error: "Could not load shops for assignment." }, { status: 500 })
  }

  const staff = (staffResult.data ?? []).flatMap((member) => {
    const user = Array.isArray(member.user) ? member.user[0] : member.user
    if (!user?.full_name || !member.user_id) return []
    return [{ id: member.id, staffId: member.staff_id, fullName: user.full_name }]
  })

  return NextResponse.json({ staff, shops: shopsResult.data ?? [] })
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "assignWork")
  if (!authorization.authorized) return authorization.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid assignment form data." }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid assignment form data." }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const staffId = typeof input.staffId === "string" ? input.staffId : ""
  const shopId = typeof input.shopId === "string" ? input.shopId : ""
  const message = typeof input.message === "string" ? input.message.trim() : ""
  if (!uuidPattern.test(staffId) || !uuidPattern.test(shopId)) {
    return NextResponse.json({ error: "Choose a valid staff member and shop." }, { status: 400 })
  }
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "Enter work details up to 2000 characters." }, { status: 400 })
  }

  const [staffResult, shopResult] = await Promise.all([
    authorization.adminClient
      .from("staff")
      .select("id, staff_id, user_id, user:users!staff_user_id_fkey(id, full_name, phone)")
      .eq("id", staffId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .maybeSingle(),
    authorization.adminClient
      .from("shops")
      .select("id, name, area")
      .eq("id", shopId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .maybeSingle(),
  ])

  if (staffResult.error || shopResult.error) {
    console.error("Assignment target validation failed", {
      staffCode: staffResult.error?.code,
      shopCode: shopResult.error?.code,
    })
    return NextResponse.json({ error: "Could not validate the selected staff member and shop." }, { status: 500 })
  }
  if (!staffResult.data?.user_id || !shopResult.data) {
    return NextResponse.json({ error: "The selected staff member or shop is no longer active." }, { status: 400 })
  }

  const staffProfile = Array.isArray(staffResult.data.user)
    ? staffResult.data.user[0]
    : staffResult.data.user
  if (!staffProfile?.id || !staffProfile.phone) {
    return NextResponse.json({ error: "The selected staff member does not have a valid profile phone number." }, { status: 400 })
  }

  const { data: adminProfiles, error: adminsError } = await authorization.adminClient
    .from("users")
    .select("id")
    .eq("is_admin", true)
    .eq("status", true)

  if (adminsError) {
    console.error("Assigned work admin notification lookup failed", { code: adminsError.code })
    return NextResponse.json({ error: "Could not load admin notification recipients." }, { status: 500 })
  }

  const { data, error } = await authorization.adminClient
    .from("assigned_works")
    .insert({ staff_id: staffId, shop_id: shopId, message })
    .select("id")
    .single()

  if (error) {
    console.error("Assigned work insert failed", { code: error.code })
    return NextResponse.json({ error: "Could not assign the work." }, { status: 500 })
  }

  const notificationMessage =
    `${staffProfile.full_name?.trim() || "A staff member"} was assigned ${message} at ` +
    `${shopResult.data.name}${shopResult.data.area ? `, ${shopResult.data.area}` : ""}.`
  const recipients = [...new Set([
    staffProfile.id,
    authorization.notificationUserId,
    ...(adminProfiles ?? []).map((profile) => profile.id),
  ])]
  const { error: notificationError } = await authorization.adminClient
    .from("notifications")
    .insert(recipients.map((recipientId) => ({
      title: recipientId === staffProfile.id ? "New work assigned" : "Work assigned to staff",
      message: notificationMessage,
      type: "work_assigned",
      from_user_id: authorization.notificationUserId,
      to_user_id: recipientId,
      is_to_all: false,
      is_read: false,
      content_id: data.id,
      link: "/dashboard/assigned-work",
    })))

  if (notificationError) {
    console.error("Assigned work notification insert failed", { code: notificationError.code })
    const { error: notificationRollbackError } = await authorization.adminClient
      .from("notifications")
      .delete()
      .eq("content_id", data.id)
    const { error: rollbackError } = await authorization.adminClient
      .from("assigned_works")
      .delete()
      .eq("id", data.id)
    if (notificationRollbackError || rollbackError) {
      console.error("Assigned work rollback failed after notification error", {
        assignmentId: data.id,
        notificationCode: notificationRollbackError?.code,
        assignmentCode: rollbackError?.code,
      })
    }
    return NextResponse.json(
      {
        error: notificationRollbackError || rollbackError
          ? "Work notification delivery failed, and the assignment could not be fully rolled back."
          : "Could not notify the staff member and admins; the assignment was not saved.",
      },
      { status: 500 }
    )
  }

  const smsMessage = `iMobile Supreme: New work assigned at ${shopResult.data.name}. ${message}`
  let smsDelivery: { sent: boolean; error?: string } = { sent: false }
  try {
    await sendNotifySms(staffProfile.phone, smsMessage)
    smsDelivery = { sent: true }
  } catch (smsError) {
    const detail = smsError instanceof Error ? smsError.message : "SMS delivery failed."
    console.error("Assigned work SMS failed", { assignmentId: data.id, detail })
    smsDelivery = { sent: false, error: detail }
  }

  const { error: smsLogError } = await authorization.adminClient
    .from("sms")
    .insert({
      body: smsMessage,
      user_id: staffProfile.id,
      shop_id: null,
      type: "work_assigned",
    })

  if (smsLogError) {
    console.error("Assigned work SMS log insert failed", { code: smsLogError.code })
  }

  return NextResponse.json(
    {
      assignedWork: { id: data.id },
      smsDelivery: { ...smsDelivery, logged: !smsLogError },
    },
    { status: 201 }
  )
}
