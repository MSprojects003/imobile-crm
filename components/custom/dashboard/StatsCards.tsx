"use client"

import { useQuery } from "@tanstack/react-query"
import {
	ArrowDownRight,
	ArrowUpRight,
	CircleDollarSign,
	Minus,
	Package,
	ShoppingBag,
	Store,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"

type DashboardStats = {
	shops: number
	sales: number
	products: number
	salesAmount: number | null
	trends: Record<StatKey, MetricTrend | null>
}

type StatKey = "shops" | "sales" | "products" | "salesAmount"
type MetricTrend = { direction: "up" | "down" | "flat"; label: string }
type CountTable = "shops" | "products" | "orders"

function makeTrend(current: number | null, previous: number | null): MetricTrend | null {
	if (current === null || previous === null) return null
	if (previous === 0) {
		return current === 0
			? { direction: "flat", label: "No change in 30 days" }
			: { direction: "up", label: "New in the last 30 days" }
	}

	const change = ((current - previous) / previous) * 100
	const direction = change > 0 ? "up" : change < 0 ? "down" : "flat"
	return {
		direction,
		label: `${Math.abs(change).toFixed(1)}% vs previous 30 days`,
	}
}

async function fetchPeriodCount(
	table: CountTable,
	from: string,
	to: string,
): Promise<number | null> {
	const { count, error } = await supabase
		.from(table)
		.select("*", { count: "exact", head: true })
		.gte("created_at", from)
		.lt("created_at", to)

	return error ? null : count ?? 0
}

async function fetchPeriodAmount(from: string, to: string): Promise<number | null> {
	let amount = 0
	let offset = 0
	const pageSize = 1000

	while (true) {
		const { data, error } = await supabase
			.from("orders")
			.select("total_amount")
			.gte("created_at", from)
			.lt("created_at", to)
			.range(offset, offset + pageSize - 1)

		if (error) return null

		for (const order of data ?? []) {
			const orderAmount = Number(order.total_amount)
			if (Number.isFinite(orderAmount)) amount += orderAmount
		}

		if ((data?.length ?? 0) < pageSize) return amount
		offset += pageSize
	}
}

async function fetchDashboardStats(): Promise<DashboardStats> {
	const now = new Date()
	const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
	const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
	const currentFrom = currentStart.toISOString()
	const previousFrom = previousStart.toISOString()
	const currentTo = now.toISOString()

	const [shopsResult, productsResult, salesResult] = await Promise.all([
		supabase.from("shops").select("*", { count: "exact", head: true }),
		supabase.from("products").select("*", { count: "exact", head: true }),
		supabase.from("orders").select("*", { count: "exact", head: true }),
	])

	if (shopsResult.error) throw shopsResult.error
	if (productsResult.error) throw productsResult.error
	if (salesResult.error) throw salesResult.error

	let salesAmount: number | null = 0
	let offset = 0
	const pageSize = 1000

	while (salesAmount !== null) {
		const { data, error } = await supabase
			.from("orders")
			.select("total_amount")
			.range(offset, offset + pageSize - 1)

		if (error) {
			salesAmount = null
			break
		}

		for (const order of data ?? []) {
			const amount = Number(order.total_amount)
			if (Number.isFinite(amount)) salesAmount += amount
		}

		if ((data?.length ?? 0) < pageSize) break
		offset += pageSize
	}

	const [shopsCurrent, shopsPrevious, productsCurrent, productsPrevious, salesCurrent, salesPrevious, amountCurrent, amountPrevious] = await Promise.all([
		fetchPeriodCount("shops", currentFrom, currentTo),
		fetchPeriodCount("shops", previousFrom, currentFrom),
		fetchPeriodCount("products", currentFrom, currentTo),
		fetchPeriodCount("products", previousFrom, currentFrom),
		fetchPeriodCount("orders", currentFrom, currentTo),
		fetchPeriodCount("orders", previousFrom, currentFrom),
		fetchPeriodAmount(currentFrom, currentTo),
		fetchPeriodAmount(previousFrom, currentFrom),
	])

	return {
		shops: shopsResult.count ?? 0,
		sales: salesResult.count ?? 0,
		products: productsResult.count ?? 0,
		salesAmount,
		trends: {
			shops: makeTrend(shopsCurrent, shopsPrevious),
			sales: makeTrend(salesCurrent, salesPrevious),
			products: makeTrend(productsCurrent, productsPrevious),
			salesAmount: makeTrend(amountCurrent, amountPrevious),
		},
	}
}

const numberFormatter = new Intl.NumberFormat("en-LK")
const currencyFormatter = new Intl.NumberFormat("en-LK", {
	style: "currency",
	currency: "LKR",
	maximumFractionDigits: 2,
})

const statsCards = [
	{
		label: "Total Shops",
		key: "shops",
		icon: Store,
		color: "bg-rose-50 text-rose-700",
	},
	{
		label: "Total Sales",
		key: "sales",
		icon: ShoppingBag,
		color: "bg-sky-50 text-sky-700",
	},
	{
		label: "Total Products",
		key: "products",
		icon: Package,
		color: "bg-emerald-50 text-emerald-700",
	},
	{
		label: "Sales Amount",
		key: "salesAmount",
		icon: CircleDollarSign,
		color: "bg-amber-50 text-amber-700",
	},
] as const

export function StatsCards() {
	const { data, isPending, isError, refetch } = useQuery({
		queryKey: ["dashboard", "stats"],
		queryFn: fetchDashboardStats,
		staleTime: 60_000,
	})

	return (
		<section aria-label="Dashboard statistics">
					<div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
				{statsCards.map((stat) => {
					const Icon = stat.icon
					const value = data?.[stat.key]
					const trend = data?.trends[stat.key]
					const TrendIcon =
						trend?.direction === "up"
							? ArrowUpRight
							: trend?.direction === "down"
								? ArrowDownRight
								: Minus
					const trendColor =
						trend?.direction === "up"
							? "text-emerald-700"
							: trend?.direction === "down"
								? "text-rose-700"
								: "text-slate-500"
					const formattedValue =
						typeof value !== "number"
							? "—"
							: stat.key === "salesAmount"
								? currencyFormatter.format(value)
								: numberFormatter.format(value)

					return (
						<article
							key={stat.key}
							className="min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4 xl:p-5"
						>
							<div className="flex items-start justify-between gap-2 sm:gap-3">
								<div className="min-w-0">
										<h2 className="truncate text-sm font-medium text-slate-600">
										{stat.label}
									</h2>
										<div className="mt-1.5 min-h-7 break-words text-lg font-semibold tabular-nums text-slate-950 sm:mt-2 sm:text-2xl xl:text-[28px]">
										{isPending ? (
													<Skeleton className="h-6 w-20 rounded-sm sm:h-7" />
										) : isError ? (
											"Unavailable"
										) : (
											formattedValue
										)}
										</div>
								</div>
								<span className={`grid size-8 shrink-0 place-items-center rounded-md sm:size-10 ${stat.color}`}>
									<Icon className="size-4 sm:size-5" aria-hidden="true" />
								</span>
							</div>
							<div className={`mt-2 flex min-h-6 items-center gap-1 border-t border-slate-100 pt-1.5 text-[10px] leading-4 sm:mt-3 sm:min-h-7 sm:gap-1.5 sm:pt-2 sm:text-xs ${trend ? trendColor : "text-slate-500"}`}>
								<TrendIcon className="size-3.5 shrink-0" aria-hidden="true" />
								<span>{isError ? "Check your database access" : trend?.label ?? "Trend unavailable"}</span>
							</div>
						</article>
					)
				})}
			</div>
			{isError && (
				<div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-rose-700" role="status">
					<span>Dashboard totals could not be loaded from Supabase.</span>
					<button
						className="font-semibold underline underline-offset-4 hover:text-rose-900"
						onClick={() => void refetch()}
						type="button"
					>
						Try again
					</button>
				</div>
			)}
			{!isError && data?.salesAmount === null && (
				<p className="mt-4 text-xs text-slate-500" role="status">
					Sales amount is unavailable. Confirm that the orders table has a total_amount column and that your account can read it.
				</p>
			)}
		</section>
	)
}
