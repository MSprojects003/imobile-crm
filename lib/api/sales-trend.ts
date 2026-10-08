import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export type SalesTrendPeriod = "today" | "month" | "quarter" | "year"
export type SalesTrendPoint = {
  label: string
  sales: number
}

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
}

type Bucket = {
  key: string
  label: string
}

const colomboDateTime = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Colombo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
})

function getColomboDateParts(date: Date): DateParts {
  const parts = colomboDateTime.formatToParts(date)
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
    hour: Number(parts.find((part) => part.type === "hour")?.value),
  }
}

function colomboBoundary(year: number, month: number, day: number, hour = 0) {
  const normalized = new Date(Date.UTC(year, month - 1, day, hour))
  const date = normalized.toISOString().slice(0, 10)
  const normalizedHour = String(normalized.getUTCHours()).padStart(2, "0")
  return `${date}T${normalizedHour}:00:00+05:30`
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-LK", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function makeBuckets(period: SalesTrendPeriod, now: Date) {
  const { year, month, day } = getColomboDateParts(now)

  if (period === "today") {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour).padStart(2, "0"),
      label: new Intl.DateTimeFormat("en-LK", {
        hour: "numeric",
        hourCycle: "h12",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(2000, 0, 1, hour))),
    }))
    return {
      from: colomboBoundary(year, month, day),
      to: colomboBoundary(year, month, day + 1),
      buckets,
    }
  }

  if (period === "month") {
    const buckets = Array.from({ length: day }, (_, index) => {
      const bucketDay = index + 1
      const key = `${year}-${String(month).padStart(2, "0")}-${String(bucketDay).padStart(2, "0")}`
      return { key, label: String(bucketDay) }
    })
    return {
      from: colomboBoundary(year, month, 1),
      to: colomboBoundary(year, month, day + 1),
      buckets,
    }
  }

  const firstMonthOffset = period === "quarter" ? month - 2 : 1
  const buckets: Bucket[] = Array.from({ length: period === "quarter" ? 3 : month }, (_, index) => {
    const monthOffset = firstMonthOffset + index
    const bucketYear = year + Math.floor((monthOffset - 1) / 12)
    const bucketMonth = ((monthOffset - 1) % 12 + 12) % 12 + 1
    return {
      key: monthKey(bucketYear, bucketMonth),
      label: monthLabel(bucketYear, bucketMonth),
    }
  })
  const firstMonth = firstMonthOffset
  const finalMonth = period === "quarter" ? month + 1 : month + 1

  return {
    from: colomboBoundary(year, firstMonth, 1),
    to: colomboBoundary(year, finalMonth, 1),
    buckets,
  }
}

function getBucketKey(period: SalesTrendPeriod, createdAt: string) {
  const parts = getColomboDateParts(new Date(createdAt))
  if (period === "today") return String(parts.hour).padStart(2, "0")
  if (period === "month") {
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
  }
  return monthKey(parts.year, parts.month)
}

export async function fetchSalesTrend(
  adminClient: SupabaseClient,
  period: SalesTrendPeriod,
): Promise<SalesTrendPoint[]> {
  const { from: dateFrom, to: dateTo, buckets } = makeBuckets(period, new Date())
  const totalsByBucket = new Map(buckets.map((bucket) => [bucket.key, 0]))
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await adminClient
      .from("orders")
      .select("created_at, full_total")
      .gte("created_at", dateFrom)
      .lt("created_at", dateTo)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    for (const order of data ?? []) {
      const key = getBucketKey(period, order.created_at)
      if (totalsByBucket.has(key)) {
        totalsByBucket.set(key, (totalsByBucket.get(key) ?? 0) + Math.round(Number(order.full_total) * 100))
      }
    }
    if (!data || data.length < pageSize) break
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    sales: (totalsByBucket.get(bucket.key) ?? 0) / 100,
  }))
}
