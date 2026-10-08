import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest } from "@/lib/admin-auth"

type AssignedWorkRow = {
  id: string
  staff_id: string
  shop_id: string
  message: string | null
  progress: string
  created_at: string
}

type StaffRow = {
  id: string
  staff_id: string
  user_id: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
}

type ShopRow = {
  id: string
  name: string
  area: string | null
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewStaff")
  if (!authorization.authorized) return authorization.response

  const { data: worksData, error: worksError } = await authorization.adminClient
    .from("assigned_works")
    .select("id, staff_id, shop_id, message, progress, created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (worksError) {
    console.error("Assigned work list query failed", { code: worksError.code })
    return NextResponse.json({ error: "Could not load assigned work." }, { status: 500 })
  }

  const workRows = (worksData ?? []) as AssignedWorkRow[]
  if (workRows.length === 0) return NextResponse.json({ works: [] })

  const staffIds = [...new Set(workRows.map((work) => work.staff_id))]
  const shopIds = [...new Set(workRows.map((work) => work.shop_id))]
  const [staffResult, shopsResult] = await Promise.all([
    authorization.adminClient
      .from("staff")
      .select("id, staff_id, user_id")
      .in("id", staffIds),
    authorization.adminClient
      .from("shops")
      .select("id, name, area")
      .in("id", shopIds),
  ])

  if (staffResult.error) {
    console.error("Assigned work staff lookup failed", { code: staffResult.error.code })
    return NextResponse.json({ error: "Could not load assigned staff." }, { status: 500 })
  }
  if (shopsResult.error) {
    console.error("Assigned work shop lookup failed", { code: shopsResult.error.code })
    return NextResponse.json({ error: "Could not load assigned-work shops." }, { status: 500 })
  }

  const staffRows = (staffResult.data ?? []) as StaffRow[]
  const userIds = [...new Set(staffRows.flatMap((staff) => staff.user_id ? [staff.user_id] : []))]
  const profileResult = userIds.length > 0
    ? await authorization.adminClient
      .from("users")
      .select("id, full_name")
      .in("id", userIds)
    : { data: [], error: null }

  if (profileResult.error) {
    console.error("Assigned work profile lookup failed", { code: profileResult.error.code })
    return NextResponse.json({ error: "Could not load assigned staff names." }, { status: 500 })
  }

  const staffById = new Map(staffRows.map((staff) => [staff.id, staff]))
  const nameByUserId = new Map(
    ((profileResult.data ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "Staff member",
    ])
  )
  const shopById = new Map(
    ((shopsResult.data ?? []) as ShopRow[]).map((shop) => [shop.id, shop])
  )
  const works = workRows.map((work) => {
    const staff = staffById.get(work.staff_id)
    const shop = shopById.get(work.shop_id)
    return {
      id: work.id,
      staffId: work.staff_id,
      staffCode: staff?.staff_id ?? "",
      staffName: staff?.user_id ? nameByUserId.get(staff.user_id) ?? "Staff member" : "Staff member",
      shopName: shop?.name ?? "Shop unavailable",
      shopArea: shop?.area ?? "",
      message: work.message,
      progress: work.progress,
      createdAt: work.created_at,
    }
  })

  return NextResponse.json({ works })
}
