import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export type StatKey = "shops" | "sales" | "products" | "salesAmount"
export type MetricTrend = {
  direction: "up" | "down" | "flat"
  label: string
}

export type DashboardStats = {
  shops: number
  sales: number
  products: number
  salesAmount: number
  trends: Record<StatKey, MetricTrend | null>
}

function makeTrend(current: number, previous: number): MetricTrend {
  if (previous === 0) {
    return current === 0
      ? { direction: "flat", label: "No change vs preceding 30 days" }
      : { direction: "up", label: "New vs preceding 30 days" }
  }

  const change = ((current - previous) / previous) * 100
  const direction = current > previous ? "up" : current < previous ? "down" : "flat"
  return {
    direction,
    label: `${Math.abs(change).toFixed(1)}% vs preceding 30 days`,
  }
}

async function fetchPeriodCount(
  adminClient: SupabaseClient,
  table: "shops" | "products",
  from: string,
  to: string,
): Promise<number> {
  let query = adminClient
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", from)
    .lt("created_at", to)

  if (table === "shops") query = query.eq("is_deleted", false)

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

async function fetchOrderSummary(adminClient: SupabaseClient) {
  const { count, error: countError } = await adminClient
    .from("orders")
    .select("id", { count: "exact", head: true })

  if (countError) throw countError

  let totalCents = 0
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await adminClient
      .from("orders")
      .select("full_total")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    for (const order of data ?? []) {
      totalCents += Math.round(Number(order.full_total) * 100)
    }
    if (!data || data.length < pageSize) break
  }

  return {
    count: count ?? 0,
    fullTotal: totalCents / 100,
  }
}

export async function fetchDashboardStats(
  adminClient: SupabaseClient,
): Promise<DashboardStats> {
  const now = new Date()
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const currentFrom = currentStart.toISOString()
  const previousFrom = previousStart.toISOString()
  const currentTo = now.toISOString()

  const [shopsCurrent, shopsPrevious, productsCurrent, productsPrevious, orderSummary] = await Promise.all([
    fetchPeriodCount(adminClient, "shops", currentFrom, currentTo),
    fetchPeriodCount(adminClient, "shops", previousFrom, currentFrom),
    fetchPeriodCount(adminClient, "products", currentFrom, currentTo),
    fetchPeriodCount(adminClient, "products", previousFrom, currentFrom),
    fetchOrderSummary(adminClient),
  ])

  return {
    shops: shopsCurrent,
    sales: orderSummary.count,
    products: productsCurrent,
    salesAmount: orderSummary.fullTotal,
    trends: {
      shops: makeTrend(shopsCurrent, shopsPrevious),
      sales: null,
      products: makeTrend(productsCurrent, productsPrevious),
      salesAmount: null,
    },
  }
}
