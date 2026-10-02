"use client"

import { useState } from "react"
import { Medal, PhoneCall } from "lucide-react"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type RepPeriod = "today" | "week" | "month" | "year"

type Rep = {
	name: string
	phone: string
	amount: number
}

const repsByPeriod: Record<RepPeriod, Rep[]> = {
	today: [
		{ name: "Kasun Perera", phone: "+94 77 *** 2418", amount: 28400 },
		{ name: "Nadeesha Silva", phone: "+94 71 *** 9032", amount: 25100 },
		{ name: "Ravindu Fernando", phone: "+94 76 *** 1854", amount: 21800 },
		{ name: "Isuru Jayasinghe", phone: "+94 75 *** 6720", amount: 19400 },
		{ name: "Amaya Dias", phone: "+94 78 *** 4156", amount: 16750 },
	],
	week: [
		{ name: "Nadeesha Silva", phone: "+94 71 *** 9032", amount: 186500 },
		{ name: "Kasun Perera", phone: "+94 77 *** 2418", amount: 172300 },
		{ name: "Amaya Dias", phone: "+94 78 *** 4156", amount: 148900 },
		{ name: "Ravindu Fernando", phone: "+94 76 *** 1854", amount: 132400 },
		{ name: "Isuru Jayasinghe", phone: "+94 75 *** 6720", amount: 119800 },
	],
	month: [
		{ name: "Kasun Perera", phone: "+94 77 *** 2418", amount: 742600 },
		{ name: "Ravindu Fernando", phone: "+94 76 *** 1854", amount: 698200 },
		{ name: "Nadeesha Silva", phone: "+94 71 *** 9032", amount: 621400 },
		{ name: "Isuru Jayasinghe", phone: "+94 75 *** 6720", amount: 582900 },
		{ name: "Amaya Dias", phone: "+94 78 *** 4156", amount: 531700 },
	],
	year: [
		{ name: "Ravindu Fernando", phone: "+94 76 *** 1854", amount: 8425600 },
		{ name: "Kasun Perera", phone: "+94 77 *** 2418", amount: 7983200 },
		{ name: "Amaya Dias", phone: "+94 78 *** 4156", amount: 7361400 },
		{ name: "Nadeesha Silva", phone: "+94 71 *** 9032", amount: 6892900 },
		{ name: "Isuru Jayasinghe", phone: "+94 75 *** 6720", amount: 6218700 },
	],
}

const periodOptions: { value: RepPeriod; label: string }[] = [
	{ value: "today", label: "Today" },
	{ value: "week", label: "This week" },
	{ value: "month", label: "This month" },
	{ value: "year", label: "This year" },
]

const amountFormatter = new Intl.NumberFormat("en-LK", {
	style: "currency",
	currency: "LKR",
	maximumFractionDigits: 0,
})

export function TopReps() {
	const [period, setPeriod] = useState<RepPeriod>("month")

	return (
		<section aria-labelledby="top-reps-title" className="w-full min-w-0">
			<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
				<div className="flex flex-nowrap items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<span className="grid size-9 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700">
							<Medal className="size-[18px]" aria-hidden="true" />
						</span>
						<div>
							<h2 id="top-reps-title" className="truncate text-sm font-semibold text-slate-900">
								Top 5 reps
							</h2>
							<p className="mt-0.5 text-xs text-slate-500">Sample data</p>
						</div>
					</div>
					<Select
						value={period}
						onValueChange={(value: RepPeriod | null) => {
							if (value) setPeriod(value)
						}}
					>
						<SelectTrigger
							aria-label="Filter top representatives by period"
							className="h-8 w-[7.15rem] min-w-0 shrink-0 px-2 text-xs"
						>
							<SelectValue>
								{(value) => periodOptions.find((option) => option.value === value)?.label ?? "Period"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{periodOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<ol className="mt-4 divide-y divide-slate-100">
					{repsByPeriod[period].map((rep, index) => {
						const dialablePhone = rep.phone.replace(/[^\d+]/g, "")
						const canCall = /^\+[1-9]\d{7,14}$/.test(dialablePhone)

						return (
						<li key={rep.name} className="flex min-h-[68px] items-center gap-2 py-3 sm:gap-3">
							<span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-600">
								{index + 1}
							</span>
							<div className="min-w-0 flex-1">
								<Tooltip>
									<TooltipTrigger
										render={<button type="button" className="block w-full truncate text-left text-xs font-medium text-slate-800" />}
									>
										{rep.name}
									</TooltipTrigger>
									<TooltipContent side="top" align="start">{rep.name}</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger
										render={<button type="button" className="mt-0.5 block w-full truncate text-left text-[11px] text-slate-500" />}
									>
										{rep.phone}
									</TooltipTrigger>
									<TooltipContent side="top" align="start">{rep.phone}</TooltipContent>
								</Tooltip>
							</div>
							{canCall ? (
								<Tooltip>
									<TooltipTrigger
										render={
										<a
											href={`tel:${dialablePhone}`}
											aria-label={`Call ${rep.name}`}
											className="grid size-8 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
										/>
									}
									>
										<PhoneCall className="size-4" aria-hidden="true" />
									</TooltipTrigger>
									<TooltipContent>Call {rep.name}</TooltipContent>
								</Tooltip>
							) : (
								<button
									type="button"
									disabled
									aria-label={`Call unavailable for ${rep.name}; phone number is masked`}
									title="Call unavailable: sample phone number is masked"
									className="grid size-8 shrink-0 place-items-center rounded-md text-slate-300"
								>
									<PhoneCall className="size-4" aria-hidden="true" />
								</button>
							)}
							<div className="shrink-0 text-right">
								<p className="text-xs font-semibold tabular-nums text-slate-900">
									{amountFormatter.format(rep.amount)}
								</p>
								<p className="mt-0.5 text-[11px] text-slate-500">Sales</p>
							</div>
						</li>
						)
					})}
				</ol>
			</div>
		</section>
	)
}
