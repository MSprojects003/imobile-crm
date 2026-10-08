import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizeDashboardRequest } from "@/lib/admin-auth"

function colomboMonthStart(year: number, month: number) {
  const normalizedYear = year + Math.floor((month - 1) / 12)
  const normalizedMonth = ((month - 1) % 12 + 12) % 12 + 1
  return `${normalizedYear}-${String(normalizedMonth).padStart(2, "0")}-01T00:00:00+05:30`
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewDashboard")
  if (!authorization.authorized) return authorization.response

  const now = new Date()
  const dateParts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now)
  const currentYear = Number(dateParts.find((part) => part.type === "year")?.value)
  const currentMonth = Number(dateParts.find((part) => part.type === "month")?.value)
  const fiscalYear = currentMonth >= 10 ? currentYear : currentYear - 1
  const elapsedFiscalMonths = currentMonth >= 10 ? currentMonth - 9 : currentMonth + 3

  try {
    const months = await Promise.all(
      Array.from({ length: elapsedFiscalMonths }, async (_, index) => {
        const monthOffset = index + 10
        const year = fiscalYear + Math.floor((monthOffset - 1) / 12)
        const month = ((monthOffset - 1) % 12) + 1
        const { count, error } = await authorization.adminClient
          .from("sms")
          .select("id", { count: "exact", head: true })
          .gte("created_at", colomboMonthStart(fiscalYear, monthOffset))
          .lt("created_at", colomboMonthStart(fiscalYear, monthOffset + 1))

        if (error) throw error
        return { year, month, count: count ?? 0 }
      })
    )

    return NextResponse.json({
      fiscalYear,
      currentYear,
      currentMonth,
      currentCount: months.find((month) => month.year === currentYear && month.month === currentMonth)?.count ?? 0,
      total: months.reduce((sum, month) => sum + month.count, 0),
      months,
    })
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined
    console.error("SMS monthly summary query failed", { code })
    return NextResponse.json({ error: "Could not load SMS counts." }, { status: 500 })
  }
}
