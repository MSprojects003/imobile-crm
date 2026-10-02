import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeActiveAdmin, createAdminClient } from "@/lib/admin-auth"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getAuthorizedAdmin(request: NextRequest) {
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 }),
    }
  }

  const authorization = await authorizeActiveAdmin(request, adminClient)
  if (!authorization.authorized) return authorization
  return { authorized: true as const, adminClient }
}

export async function GET(request: NextRequest) {
  const authorization = await getAuthorizedAdmin(request)
  if (!authorization.authorized) return authorization.response

  const [staffResult, shopsResult] = await Promise.all([
    authorization.adminClient
      .from("staff")
      .select("id, staff_id, is_active, is_deleted, user:users!staff_user_id_fkey(full_name)")
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
    if (!user?.full_name) return []
    return [{ id: member.id, staffId: member.staff_id, fullName: user.full_name }]
  })

  return NextResponse.json({ staff, shops: shopsResult.data ?? [] })
}

export async function POST(request: NextRequest) {
  const authorization = await getAuthorizedAdmin(request)
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
      .select("id")
      .eq("id", staffId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .maybeSingle(),
    authorization.adminClient
      .from("shops")
      .select("id")
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
  if (!staffResult.data || !shopResult.data) {
    return NextResponse.json({ error: "The selected staff member or shop is no longer active." }, { status: 400 })
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

  return NextResponse.json({ assignedWork: { id: data.id } }, { status: 201 })
}
