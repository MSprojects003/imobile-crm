import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest, createAdminClient } from "@/lib/admin-auth"
import { sriLankaAreas } from "@/lib/api/arealist"

type StaffRow = {
  id: string
  staff_id: string
  user_id: string | null
  nic: string | null
  address: string | null
  area: string | null
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

async function sendSubAdminSms(
  phone: string,
  fullName: string,
  username: string,
  password: string
) {
  const { NOTIFY_LK_API_KEY, NOTIFY_LK_USER_ID, NOTIFY_LK_SENDER_ID } =
    process.env
  if (!NOTIFY_LK_API_KEY || !NOTIFY_LK_USER_ID || !NOTIFY_LK_SENDER_ID) {
    console.error("Notify.lk is not configured, skipping SMS.")
    return
  }

  const messageText = `iMobile Supreme - New Staff Credentials

Welcome ${fullName},

Your credentials:
Username: ${username}
Password: ${password}

Don't share these credentials with anyone.`

  try {
    const response = await fetch("https://app.notify.lk/api/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        user_id: NOTIFY_LK_USER_ID,
        api_key: NOTIFY_LK_API_KEY,
        sender_id: NOTIFY_LK_SENDER_ID,
        to: phone.replace(/\D/g, ""),
        message: messageText,
      }),
      cache: "no-store",
    })
    const responseText = await response.text()
    console.log("Notify.lk response:", responseText)
  } catch (error) {
    console.error("Notify.lk SMS sending failed:", error)
  }
}

async function getStaffIdValues(
  adminClient: ReturnType<typeof createAdminClient>
) {
  const [staffResult, profilesResult] = await Promise.all([
    adminClient.from("staff").select("staff_id"),
    adminClient.from("users").select("username"),
  ])

  if (staffResult.error) return { values: null, error: staffResult.error }
  if (profilesResult.error) return { values: null, error: profilesResult.error }

  return {
    values: [
      ...(staffResult.data ?? []),
      ...(profilesResult.data ?? []).map((profile: { username: string }) => ({
        staff_id: profile.username,
      })),
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
    area: row.area,
    role: row.role,
    isActive: row.is_active,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
  }
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewStaff")
  if (!authorization.authorized) return authorization.response

  const { data, error } = await authorization.adminClient
    .from("staff")
    .select(
      "id, staff_id, user_id, nic, address, area, role, is_deleted, is_active, created_at, user:users!staff_user_id_fkey(full_name, phone)"
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Staff list query failed", { code: error.code })
    return NextResponse.json(
      { error: "Could not load staff." },
      { status: 500 }
    )
  }

  const staff = (data ?? []) as unknown as StaffRow[]
  const staffIds = await getStaffIdValues(authorization.adminClient)
  if (staffIds.error) {
    console.error("Staff ID lookup failed", { code: staffIds.error.code })
    return NextResponse.json(
      { error: "Could not generate the next staff ID." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    staff: staff.map(serializeStaff),
    nextStaffId: createStaffId(staffIds.values ?? []),
  })
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "updateStaff")
  if (!authorization.authorized) return authorization.response

  const id = request.nextUrl.searchParams.get("id")
  if (!id)
    return NextResponse.json(
      { error: "Staff ID is required." },
      { status: 400 }
    )

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid staff status update." },
      { status: 400 }
    )
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as Record<string, unknown>).isActive !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Choose an active or deactive status." },
      { status: 400 }
    )
  }

  const { data, error } = await authorization.adminClient
    .from("staff")
    .update({
      is_active: (body as { isActive: boolean }).isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_deleted", false)
    .select(
      "id, staff_id, user_id, nic, address, area, role, is_deleted, is_active, created_at, user:users!staff_user_id_fkey(full_name, phone)"
    )
    .maybeSingle()

  if (error) {
    console.error("Staff status update failed", { code: error.code })
    return NextResponse.json(
      { error: "Could not update staff status." },
      { status: 500 }
    )
  }
  if (!data)
    return NextResponse.json(
      { error: "Staff member was not found." },
      { status: 404 }
    )

  return NextResponse.json({
    staff: serializeStaff(data as unknown as StaffRow),
  })
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "addStaff")
  if (!authorization.authorized) return authorization.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid staff form data." },
      { status: 400 }
    )
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid staff form data." },
      { status: 400 }
    )
  }

  const input = body as Record<string, unknown>
  const fullName =
    typeof input.fullName === "string" ? input.fullName.trim() : ""
  const phone = typeof input.phone === "string" ? input.phone.trim() : ""
  const nic = typeof input.nic === "string" ? input.nic.trim() : ""
  const address = typeof input.address === "string" ? input.address.trim() : ""
  if (typeof input.area !== "string" || !input.area.trim()) {
    return NextResponse.json(
      { error: "Select an area." },
      { status: 400 }
    )
  }
  const area = input.area.trim()
  const role = typeof input.role === "string" ? input.role.trim() : ""
  const accountType = input.accountType

  if (!fullName || fullName.length > 255) {
    return NextResponse.json(
      { error: "Enter a staff name up to 255 characters." },
      { status: 400 }
    )
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json(
      { error: "Enter a valid international phone number." },
      { status: 400 }
    )
  }
  if (nic.length > 32)
    return NextResponse.json(
      { error: "NIC must be 32 characters or fewer." },
      { status: 400 }
    )
  if (address.length > 500)
    return NextResponse.json(
      { error: "Address must be 500 characters or fewer." },
      { status: 400 }
    )
  if (!sriLankaAreas.some((knownArea) => knownArea === area)) {
    return NextResponse.json(
      { error: "Choose an area from the provided list." },
      { status: 400 }
    )
  }
  if (!role || role.length > 80)
    return NextResponse.json(
      { error: "Enter a staff role up to 80 characters." },
      { status: 400 }
    )
  if (accountType !== "staff" && accountType !== "sub_admin") {
    return NextResponse.json(
      { error: "Choose Staff or Sub Admin as the account type." },
      { status: 400 }
    )
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const staffIds = await getStaffIdValues(authorization.adminClient)
    if (staffIds.error) {
      console.error("Staff ID lookup failed", { code: staffIds.error.code })
      return NextResponse.json(
        { error: "Could not generate a staff ID." },
        { status: 500 }
      )
    }

    const staffId = createStaffId(staffIds.values ?? [])
    const finalUsername =
      accountType === "sub_admin" &&
      typeof input.username === "string" &&
      input.username.trim()
        ? input.username.trim()
        : staffId
    const password = typeof input.password === "string" ? input.password : ""

    if (accountType === "sub_admin" && password.length < 8) {
      return NextResponse.json(
        { error: "Sub Admin password must be at least 8 characters long." },
        { status: 400 }
      )
    }

    const { data: authUser, error: authError } =
      await authorization.adminClient.auth.admin.createUser({
        ...(accountType === "sub_admin" ? { password } : {}),
        phone,
        phone_confirm: true,
        user_metadata: {
          username: finalUsername,
          role: accountType === "sub_admin" ? "sub_admin" : "staff",
        },
      })

    if (authError) {
      if (authError.code === "phone_exists") {
        return NextResponse.json(
          { error: "This phone is already registered as a login account." },
          { status: 409 }
        )
      }
      console.error("Staff Auth creation failed", {
        code: authError.code,
        message: authError.message,
      })
      return NextResponse.json(
        { error: "Could not create the login account in Supabase Auth." },
        { status: 500 }
      )
    }
    if (!authUser?.user) {
      console.error("Staff Auth creation returned no user.")
      return NextResponse.json(
        { error: "Could not create the login account in Supabase Auth." },
        { status: 500 }
      )
    }

    const { data: user, error: userError } = await authorization.adminClient
      .from("users")
      .insert({
        full_name: fullName,
        username: finalUsername,
        phone,
        is_admin: false,
        is_sub_admin: accountType === "sub_admin",
        is_rep: accountType === "staff",
        is_shop: false,
        status: true,
      })
      .select("id")
      .single()

    if (userError) {
      await authorization.adminClient.auth.admin.deleteUser(authUser.user.id)
      if (userError.code === "23505" && userError.message.includes("username"))
        continue
      if (userError.code === "23505") {
        return NextResponse.json(
          { error: "That phone number is already assigned to a user." },
          { status: 409 }
        )
      }
      console.error("Staff profile insert failed", { code: userError.code })
      return NextResponse.json(
        { error: "Could not create the staff profile." },
        { status: 500 }
      )
    }

    const { data: staffRecord, error: insertError } =
      await authorization.adminClient
        .from("staff")
        .insert({
          staff_id: staffId,
          user_id: user.id,
          nic: nic || null,
          address: address || null,
          area: area || null,
          role,
        })
        .select(
          "id, staff_id, user_id, nic, address, area, role, is_deleted, is_active, created_at"
        )
        .single()

    if (insertError) {
      await authorization.adminClient.from("users").delete().eq("id", user.id)
      await authorization.adminClient.auth.admin.deleteUser(authUser.user.id)
      if (
        insertError.code === "23505" &&
        insertError.message.includes("staff_id")
      )
        continue
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "That NIC is already assigned to another staff member." },
          { status: 409 }
        )
      }
      console.error("Staff insert failed", { code: insertError.code })
      return NextResponse.json(
        { error: "Could not create the staff record." },
        { status: 500 }
      )
    }

    if (accountType === "sub_admin") {
      await sendSubAdminSms(phone, fullName, finalUsername, password)
    }

    return NextResponse.json(
      {
        staff: serializeStaff({
          ...staffRecord,
          user: { full_name: fullName, phone },
        } as StaffRow),
      },
      { status: 201 }
    )
  }

  return NextResponse.json(
    { error: "Could not allocate a unique staff ID. Please try again." },
    { status: 409 }
  )
}
