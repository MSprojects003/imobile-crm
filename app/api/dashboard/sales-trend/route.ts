import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest } from "@/lib/admin-auth"
import { fetchSalesTrend, type SalesTrendPeriod } from "@/lib/api/sales-trend"

const validPeriods = new Set<SalesTrendPeriod>(["today", "month", "quarter", "year"])

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewDashboard")
  if (!authorization.authorized) return authorization.response

  const requestedPeriod = request.nextUrl.searchParams.get("period")
  if (!requestedPeriod || !validPeriods.has(requestedPeriod as SalesTrendPeriod)) {
    return NextResponse.json({ error: "Choose a valid sales trend period." }, { status: 400 })
  }

  try {
    const data = await fetchSalesTrend(authorization.adminClient, requestedPeriod as SalesTrendPeriod)
    return NextResponse.json({ data })
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined
    console.error("Dashboard sales trend query failed", { code })
    return NextResponse.json({ error: "Could not load order totals." }, { status: 500 })
  }
}
