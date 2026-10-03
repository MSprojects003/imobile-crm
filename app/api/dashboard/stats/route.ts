import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest } from "@/lib/admin-auth"
import { fetchDashboardStats } from "@/lib/api/stat.card"

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewDashboard")
  if (!authorization.authorized) return authorization.response

  try {
    const stats = await fetchDashboardStats(authorization.adminClient)
    return NextResponse.json(stats)
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined
    console.error("Dashboard stats query failed", { code })
    return NextResponse.json({ error: "Could not load dashboard statistics." }, { status: 500 })
  }
}
