import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeActiveAdmin, createAdminClient } from "@/lib/admin-auth"

type StaffRow = {
  id: string
  staff_id: string
  user_id: string | null
  nic: string | null
  address: string | null
  role: string | null
  is_deleted: boolean
  is_active: boolean
  created_at: string
  user: { full_name: string; phone: string } | null
}

function createStaffId(rows: Array<{ staff_id: string }>) {
  const highestNumber = rows.reduce((highest, row) => {
    const match = /^S(\d+)$/i.exec(row.staff_id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0)

  return `S${String(highestNumber + 1).padStart(4, "0")}`
}

async function getStaffIdValues(adminClient: Awaited<ReturnType<typeof createAdminClient>>) {
  const [staffResult, profilesResult] = await Promise.all([
    adminClient.from("staff").select("staff_id"),
    adminClient.from("users").select("username").eq("is_rep", true),
  ])

  if (staffResult.error) return { values: null, error: staffResult.error }
  if (profilesResult.error) return { values: null, error: profilesResult.error }

  return {
    values: [
      ...(staffResult.data ?? []),
      ...(profilesResult.data ?? []).map((profile) => ({ staff_id: profile.username })),
    ],
    error: null,
  }
}

function serializeStaff(row: StaffRow) {
  return {
    id: row.id,
    staffId: row.staff_id,
    userId: row.user_id ?? "",
    fullName: row.user?.full_name ?? "",
    phone: row.user?.phone ?? "",
    nic: row.nic,
    address: row.address,
    role: row.role,
    isActive: row.is_active,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
  }
}

async function getAuthorizedAdmin(request: NextRequest) {
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return { authorized: false as const, response: NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 }) }
  }

  const authorization = await authorizeActiveAdmin(request, adminClient)
  if (!authorization.authorized) return authorization
  return { authorized: true as const, adminClient }
}

export async function GET(request: NextRequest) {
  const authorization = await getAuthorizedAdmin(request)
  if (!authorization.authorized) return authorization.response

  const { data, error } = await authorization.adminClient
    .from("staff")
    .select("id, staff_id, user_id, nic, address, role, is_deleted, is_active, created_at, user:users!staff_user_id_fkey(full_name, phone)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Staff list query failed", { code: error.code })
    return NextResponse.json({ error: "Could not load staff." }, { status: 500 })
  }

  const staff = (data ?? []) as unknown as StaffRow[]
  const staffIds = await getStaffIdValues(authorization.adminClient)
  if (staffIds.error) {
    console.error("Staff ID lookup failed", { code: staffIds.error.code })
    return NextResponse.json({ error: "Could not generate the next staff ID." }, { status: 500 })
  }

  return NextResponse.json({ staff: staff.map(serializeStaff), nextStaffId: createStaffId(staffIds.values ?? []) })
}

export async function PATCH(request: NextRequest) {
  const authorization = await getAuthorizedAdmin(request)
  if (!authorization.authorized) return authorization.response

  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Staff ID is required." }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid staff status update." }, { status: 400 })
  }
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).isActive !== "boolean") {
    return NextResponse.json({ error: "Choose an active or deactive status." }, { status: 400 })
  }

  const { data, error } = await authorization.adminClient
    .from("staff")
    .update({
      is_active: (body as { isActive: boolean }).isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_deleted", false)
    .select("id, staff_id, user_id, nic, address, role, is_deleted, is_active, created_at, user:users!staff_user_id_fkey(full_name, phone)")
    .maybeSingle()

  if (error) {
    console.error("Staff status update failed", { code: error.code })
    return NextResponse.json({ error: "Could not update staff status." }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: "Staff member was not found." }, { status: 404 })

  return NextResponse.json({ staff: serializeStaff(data as unknown as StaffRow) })
}

export async function POST(request: NextRequest) {
  const authorization = await getAuthorizedAdmin(request)
  if (!authorization.authorized) return authorization.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid staff form data." }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid staff form data." }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : ""
  const phone = typeof input.phone === "string" ? input.phone.trim() : ""
  const nic = typeof input.nic === "string" ? input.nic.trim() : ""
  const address = typeof input.address === "string" ? input.address.trim() : ""
  const role = typeof input.role === "string" ? input.role.trim() : ""

  if (!fullName || fullName.length > 255) {
    return NextResponse.json({ error: "Enter a staff name up to 255 characters." }, { status: 400 })
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid international phone number." }, { status: 400 })
  }
  if (nic.length > 32) return NextResponse.json({ error: "NIC must be 32 characters or fewer." }, { status: 400 })
  if (address.length > 500) return NextResponse.json({ error: "Address must be 500 characters or fewer." }, { status: 400 })
  if (!role || role.length > 80) return NextResponse.json({ error: "Enter a staff role up to 80 characters." }, { status: 400 })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const staffIds = await getStaffIdValues(authorization.adminClient)
    if (staffIds.error) {
      console.error("Staff ID lookup failed", { code: staffIds.error.code })
      return NextResponse.json({ error: "Could not generate a staff ID." }, { status: 500 })
    }

    const staffId = createStaffId(staffIds.values ?? [])
    const { data: user, error: userError } = await authorization.adminClient
      .from("users")
      .insert({
        full_name: fullName,
        username: staffId,
        phone,
        is_admin: false,
        is_sub_admin: false,
        is_rep: true,
        is_shop: false,
        status: true,
      })
      .select("id")
      .single()

    if (userError) {
      if (userError.code === "23505" && userError.message.includes("username")) continue
      if (userError.code === "23505") {
        return NextResponse.json({ error: "That phone number is already assigned to a user." }, { status: 409 })
      }
      console.error("Staff profile insert failed", { code: userError.code })
      return NextResponse.json({ error: "Could not create the staff profile." }, { status: 500 })
    }

    const { data: staffRecord, error: insertError } = await authorization.adminClient
      .from("staff")
      .insert({
        staff_id: staffId,
        user_id: user.id,
        nic: nic || null,
        address: address || null,
        role,
      })
      .select("id, staff_id, user_id, nic, address, role, is_deleted, is_active, created_at")
      .single()

    if (insertError) {
      await authorization.adminClient.from("users").delete().eq("id", user.id)
      if (insertError.code === "23505" && insertError.message.includes("staff_id")) continue
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "That NIC is already assigned to another staff member." }, { status: 409 })
      }
      console.error("Staff insert failed", { code: insertError.code })
      return NextResponse.json({ error: "Could not create the staff record." }, { status: 500 })
    }

    return NextResponse.json({
      staff: serializeStaff({ ...staffRecord, user: { full_name: fullName, phone } } as StaffRow),
    }, { status: 201 })
  }

  return NextResponse.json({ error: "Could not allocate a unique staff ID. Please try again." }, { status: 409 })
}