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

import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { fetchDashboardStats } from "@/lib/stat-card-client"
import type { StatKey } from "@/lib/api/stat.card"

const numberFormatter = new Intl.NumberFormat("en-LK")
const currencyFormatter = new Intl.NumberFormat("en-LK", {
	style: "currency",
	currency: "LKR",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})

const statsCards = [
	{
		label: "Shops (last 30 days)",
		key: "shops",
		icon: Store,
		color: "bg-rose-50 text-rose-700",
	},
	{
		label: "Total Orders",
		key: "sales",
		icon: ShoppingBag,
		color: "bg-sky-50 text-sky-700",
	},
	{
		label: "Products (last 30 days)",
		key: "products",
		icon: Package,
		color: "bg-emerald-50 text-emerald-700",
	},
	{
		label: "Full Order Amount",
		key: "salesAmount",
		icon: CircleDollarSign,
		color: "bg-amber-50 text-amber-700",
	},
] as const

export function StatsCards() {
	const { data, isPending, isError, refetch, error } = useQuery({
		queryKey: ["dashboard", "stats", "rolling-30-day-comparison"],
		queryFn: fetchDashboardStats,
		staleTime: 60_000,
	})
	const errorMessage = error instanceof Error
		? error.message
		: "Dashboard statistics could not be loaded."

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
					const isCompactAmount =
						stat.key === "salesAmount" &&
						typeof value === "number" &&
						value >= 200_000
					const compactAmount = isCompactAmount && typeof value === "number"
						? `LKR ${(value / 100_000).toFixed(1).replace(/\.0$/, "")}L`
						: formattedValue

					return (
						<article
							key={stat.key}
							className="min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4 xl:p-5"
						>
							<div className="flex items-start justify-between gap-2 sm:gap-3">
								<div className="min-w-0">
										<h2 className="truncate text-xs font-medium text-slate-600">
										{stat.label}
									</h2>
										<div className="mt-1.5 min-h-7 break-words text-base font-semibold tabular-nums text-slate-950 sm:mt-2 sm:text-xl xl:text-2xl">
										{isPending ? (
													<Skeleton className="h-6 w-20 rounded-sm sm:h-7" />
										) : isError ? (
											"Unavailable"
										) : isCompactAmount ? (
											<>
												<div className="hidden md:block">
													<Tooltip>
														<TooltipTrigger
															render={
																<span
																	tabIndex={0}
																	className="cursor-help underline decoration-dotted underline-offset-4"
																/>
															}
														>
															{compactAmount}
														</TooltipTrigger>
														<TooltipContent>{formattedValue}</TooltipContent>
													</Tooltip>
												</div>
												<div className="md:hidden">
													<Popover>
														<PopoverTrigger
															render={
																<button
																	type="button"
																	aria-label={`Show full order amount: ${formattedValue}`}
																	className="cursor-pointer underline decoration-dotted underline-offset-4"
																/>
															}
														>
															{compactAmount}
														</PopoverTrigger>
														<PopoverContent side="top" className="w-auto">
															{formattedValue}
														</PopoverContent>
													</Popover>
												</div>
											</>
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
								{trend && <TrendIcon className="size-3.5 shrink-0" aria-hidden="true" />}
								<span>
									{isError
										? "Check your database access"
										: stat.key === "sales" || stat.key === "salesAmount"
											? "All orders"
											: trend?.label ?? "—"}
								</span>
							</div>
						</article>
					)
				})}
			</div>
			{isError && (
				<div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-rose-700" role="status">
					<span>{errorMessage}</span>
					<button
						className="font-semibold underline underline-offset-4 hover:text-rose-900"
						onClick={() => void refetch()}
						type="button"
					>
						Try again
					</button>
				</div>
			)}
		</section>
	)
}
