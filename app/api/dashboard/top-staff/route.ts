import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest } from "@/lib/admin-auth"
import { fetchTopStaff, type TopStaffPeriod } from "@/lib/api/top-staff"

const validPeriods = new Set<TopStaffPeriod>(["today", "week", "month", "year"])

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewDashboard")
  if (!authorization.authorized) return authorization.response

  const requestedPeriod = request.nextUrl.searchParams.get("period")
  if (!requestedPeriod || !validPeriods.has(requestedPeriod as TopStaffPeriod)) {
    return NextResponse.json({ error: "Choose a valid staff ranking period." }, { status: 400 })
  }

  try {
    const staff = await fetchTopStaff(authorization.adminClient, requestedPeriod as TopStaffPeriod)
    return NextResponse.json({ staff })
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined
    console.error("Top staff order summary query failed", { code })
    return NextResponse.json({ error: "Could not load top staff order totals." }, { status: 500 })
  }
}
