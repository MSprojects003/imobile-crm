import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export type TopStaffPeriod = "today" | "week" | "month" | "year"

export type TopStaffMember = {
  id: string
  staffId: string
  name: string
  phone: string
  orderCount: number
  amount: number
}

function getColomboDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  }
}

function colomboDayStart(year: number, month: number, day: number) {
  const normalized = new Date(Date.UTC(year, month - 1, day))
  return `${normalized.toISOString().slice(0, 10)}T00:00:00+05:30`
}

function getPeriodRange(period: TopStaffPeriod, now: Date) {
  const { year, month, day } = getColomboDateParts(now)
  if (period === "today") {
    return { from: colomboDayStart(year, month, day), to: colomboDayStart(year, month, day + 1) }
  }
  if (period === "week") {
    const today = new Date(Date.UTC(year, month - 1, day))
    const daysSinceMonday = (today.getUTCDay() + 6) % 7
    return {
      from: colomboDayStart(year, month, day - daysSinceMonday),
      to: colomboDayStart(year, month, day + 1),
    }
  }
  if (period === "month") {
    return {
      from: colomboDayStart(year, month, 1),
      to: colomboDayStart(year, month, day + 1),
    }
  }
  return {
    from: colomboDayStart(year, 1, 1),
    to: colomboDayStart(year, month, day + 1),
  }
}

type StaffUser = { full_name: string | null; phone: string | null }
type StaffRow = {
  id: string
  staff_id: string
  user_id: string | null
  user: StaffUser | StaffUser[] | null
}

export async function fetchTopStaff(
  adminClient: SupabaseClient,
  period: TopStaffPeriod,
): Promise<TopStaffMember[]> {
  const { from: dateFrom, to: dateTo } = getPeriodRange(period, new Date())
  const totalsByStaff = new Map<string, { amountCents: number; orderCount: number }>()
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await adminClient
      .from("orders")
      .select("user_id, full_total")
      .gte("created_at", dateFrom)
      .lt("created_at", dateTo)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    for (const order of data ?? []) {
      const current = totalsByStaff.get(order.user_id) ?? { amountCents: 0, orderCount: 0 }
      current.amountCents += Math.round(Number(order.full_total) * 100)
      current.orderCount += 1
      totalsByStaff.set(order.user_id, current)
    }
    if (!data || data.length < pageSize) break
  }

  if (totalsByStaff.size === 0) return []

  const { data, error } = await adminClient
    .from("staff")
    .select("id, staff_id, user_id, user:users!staff_user_id_fkey(full_name, phone)")
    .in("id", Array.from(totalsByStaff.keys()))

  if (error) throw error

  const staffRows = (data ?? []) as StaffRow[]
  return staffRows
    .map((staff) => {
      const user = Array.isArray(staff.user) ? staff.user[0] : staff.user
      const totals = totalsByStaff.get(staff.id)
      if (!totals) return null
      return {
        id: staff.id,
        staffId: staff.staff_id,
        name: user?.full_name?.trim() || staff.staff_id,
        phone: user?.phone ?? "",
        orderCount: totals.orderCount,
        amount: totals.amountCents / 100,
      }
    })
    .filter((staff): staff is TopStaffMember => staff !== null)
    .sort((first, second) =>
      second.amount - first.amount ||
      second.orderCount - first.orderCount ||
      first.name.localeCompare(second.name)
    )
    .slice(0, 5)
}
