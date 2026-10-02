import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeActiveAdmin, createAdminClient } from "@/lib/admin-auth"
import { fetchDashboardStats } from "@/lib/api/stat.card"

export async function GET(request: NextRequest) {
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 })
  }

  const authorization = await authorizeActiveAdmin(request, adminClient)
  if (!authorization.authorized) return authorization.response

  try {
    const stats = await fetchDashboardStats(adminClient)
    return NextResponse.json(stats)
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined
    console.error("Dashboard stats query failed", { code })
    return NextResponse.json({ error: "Could not load dashboard statistics." }, { status: 500 })
  }
}
