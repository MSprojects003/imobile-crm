import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest } from "@/lib/admin-auth"
import { getShops } from "@/lib/api/shops"

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewShops")
  if (!authorization.authorized) return authorization.response

  try {
    const shops = await getShops(authorization.adminClient)
    return NextResponse.json({ shops })
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined
    console.error("Shop list query failed", { code })
    return NextResponse.json({ error: "Could not load shops." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "updateShops")
  if (!authorization.authorized) return authorization.response

  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Shop ID is required." }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid shop status update." }, { status: 400 })
  }
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).isActive !== "boolean") {
    return NextResponse.json({ error: "Choose an active or deactive status." }, { status: 400 })
  }

  const { data, error } = await authorization.adminClient
    .from("shops")
    .update({
      is_active: (body as { isActive: boolean }).isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_deleted", false)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Shop status update failed", { code: error.code })
    return NextResponse.json({ error: "Could not update shop status." }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: "Shop was not found." }, { status: 404 })

  return NextResponse.json({ shop: { id: data.id, isActive: (body as { isActive: boolean }).isActive } })
}
