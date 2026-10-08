"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from "date-fns"
import { CalendarDays, ChevronDown, MapPin, Store } from "lucide-react"

import { TablePaginationFooter } from "@/components/custom/dashboard/table-pagination-footer"
import { ListPageSkeleton } from "@/components/custom/dashboard/list-page-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchAssignedWorks, type AssignedWorkRecord } from "@/lib/assigned-works"

const pageSize = 10
const progressOptions = [
  { value: "pending", label: "Pending" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
] as const

type ProgressFilter = "all" | (typeof progressOptions)[number]["value"]
type AssignedDateRange = {
  start: string
  end: string
}

function progressLabel(progress: string) {
  return progress ? `${progress[0].toUpperCase()}${progress.slice(1)}` : "Unknown"
}

function progressClass(progress: string) {
  switch (progress.toLowerCase()) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "ongoing":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "pending":
      return "border-slate-200 bg-slate-100 text-slate-600"
    default:
      return "border-slate-200 bg-white text-slate-600"
  }
}

function matchesAssignedDate(createdAt: string, range: AssignedDateRange) {
  const assignedAt = new Date(createdAt)
  if (Number.isNaN(assignedAt.getTime())) return !range.start && !range.end

  const start = range.start ? startOfDay(parseISO(range.start)) : null
  const end = range.end ? endOfDay(parseISO(range.end)) : null
  return (!start || !isBefore(assignedAt, start)) && (!end || !isAfter(assignedAt, end))
}

function AssignedDateFilters({
  range,
  onChange,
}: {
  range: AssignedDateRange
  onChange: (range: AssignedDateRange) => void
}) {
  const startDate = range.start ? parseISO(range.start) : undefined
  const endDate = range.end ? parseISO(range.end) : undefined

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label="Filter by assigned-work start date"
              className="h-10 w-full justify-start gap-2 border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
            />
          }
        >
          <CalendarDays className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="truncate">
            {startDate ? `From ${format(startDate, "dd MMM yyyy")}` : "Start date"}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <p className="mb-2 px-2 text-xs font-semibold text-slate-700">Start date</p>
          <Calendar
            mode="single"
            selected={startDate}
            defaultMonth={startDate ?? endDate}
            disabled={endDate ? { after: endDate } : undefined}
            onSelect={(date) => onChange({ ...range, start: date ? format(date, "yyyy-MM-dd") : "" })}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label="Filter by assigned-work end date"
              className="h-10 w-full justify-start gap-2 border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
            />
          }
        >
          <CalendarDays className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="truncate">
            {endDate ? `To ${format(endDate, "dd MMM yyyy")}` : "End date"}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <p className="mb-2 px-2 text-xs font-semibold text-slate-700">End date</p>
          <Calendar
            mode="single"
            selected={endDate}
            defaultMonth={endDate ?? startDate}
            disabled={startDate ? { before: startDate } : undefined}
            onSelect={(date) => onChange({ ...range, end: date ? format(date, "yyyy-MM-dd") : "" })}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function StaffOptionLabel({ staffCode, staffName }: Pick<AssignedWorkRecord, "staffCode" | "staffName">) {
  return staffCode ? `${staffName} (${staffCode})` : staffName
}

export function AssignedWorkTable() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [staffFilter, setStaffFilter] = useState("all")
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all")
  const [dateRange, setDateRange] = useState<AssignedDateRange>({ start: "", end: "" })
  const [page, setPage] = useState(1)
  const worksQuery = useQuery({
    queryKey: ["assigned-works"],
    queryFn: fetchAssignedWorks,
  })
  const works = worksQuery.data ?? []

  const staffOptions = useMemo(() => {
    const uniqueStaff = new Map<string, Pick<AssignedWorkRecord, "staffId" | "staffCode" | "staffName">>()
    for (const work of works) {
      if (!uniqueStaff.has(work.staffId)) {
        uniqueStaff.set(work.staffId, {
          staffId: work.staffId,
          staffCode: work.staffCode,
          staffName: work.staffName,
        })
      }
    }
    return [...uniqueStaff.values()].sort((first, second) =>
      first.staffName.localeCompare(second.staffName)
    )
  }, [works])

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const matchesStaff = staffFilter === "all" || work.staffId === staffFilter
      const matchesProgress = progressFilter === "all" || work.progress.toLowerCase() === progressFilter
      return matchesStaff && matchesProgress && matchesAssignedDate(work.createdAt, dateRange)
    })
  }, [dateRange, progressFilter, staffFilter, works])

  const pageCount = Math.max(1, Math.ceil(filteredWorks.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageWorks = filteredWorks.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const hasFilters = Boolean(
    staffFilter !== "all" || progressFilter !== "all" || dateRange.start || dateRange.end
  )

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value)
    setPage(1)
  }

  function clearFilters() {
    setStaffFilter("all")
    setProgressFilter("all")
    setDateRange({ start: "", end: "" })
    setPage(1)
  }

  return (
    <section className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1 md:hidden">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Work management</p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Assigned - Work</h1>
        <p className="max-w-2xl text-[13px] leading-5 text-slate-500">
          Review staff assignments and their current progress.
        </p>
      </header>

      <section
        aria-label="Filter assigned work"
        className="rounded-md border border-slate-200 bg-slate-50/70 p-3"
      >
        <button
          type="button"
          aria-expanded={mobileFiltersOpen}
          aria-controls="assigned-work-filter-controls"
          onClick={() => setMobileFiltersOpen((open) => !open)}
          className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-1 text-left text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1c2e] md:hidden"
        >
          <span className="flex items-center gap-2">
            Filters
            {hasFilters && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-[#c82432]">
                Active
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-slate-500 transition-transform duration-300 ease-out motion-reduce:transition-none ${
              mobileFiltersOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          id="assigned-work-filter-controls"
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none md:!grid-rows-[1fr] md:!opacity-100 ${
            mobileFiltersOpen
              ? "visible grid-rows-[1fr] opacity-100"
              : "invisible grid-rows-[0fr] opacity-0 md:visible"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-[minmax(190px,1fr)_minmax(320px,1.7fr)_minmax(170px,0.9fr)_auto] xl:items-end">
              <label className="min-w-0 space-y-1.5">
                <span className="block text-xs font-medium text-slate-600">Staff member</span>
                <Select
                  value={staffFilter}
                  onValueChange={(value) => updateFilter(setStaffFilter, value ?? "all")}
                >
                  <SelectTrigger aria-label="Filter by staff" className="h-10 w-full min-w-0 bg-white text-xs">
                    <SelectValue placeholder="All staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All staff</SelectItem>
                    {staffOptions.map((staff) => (
                      <SelectItem key={staff.staffId} value={staff.staffId}>
                        <StaffOptionLabel staffCode={staff.staffCode} staffName={staff.staffName} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <div className="min-w-0 space-y-1.5">
                <span className="block text-xs font-medium text-slate-600">Assigned date range</span>
                <AssignedDateFilters
                  range={dateRange}
                  onChange={(range) => updateFilter(setDateRange, range)}
                />
              </div>

              <label className="min-w-0 space-y-1.5">
                <span className="block text-xs font-medium text-slate-600">Progress</span>
                <Select
                  value={progressFilter}
                  onValueChange={(value) => updateFilter(setProgressFilter, (value ?? "all") as ProgressFilter)}
                >
                  <SelectTrigger aria-label="Filter by progress" className="h-10 w-full min-w-0 bg-white text-xs">
                    <SelectValue>
                      {(value) => value === "all" ? "All progress" : progressLabel(value)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All progress</SelectItem>
                    {progressOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <Button
                type="button"
                variant="outline"
                disabled={!hasFilters}
                onClick={clearFilters}
                className="h-10 w-full text-xs xl:w-auto"
              >
                Clear filters
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs tabular-nums text-slate-500" aria-live="polite">
          {filteredWorks.length} {filteredWorks.length === 1 ? "assignment" : "assignments"}
        </p>
      </section>

      {worksQuery.isError && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm text-rose-700" role="alert">
            {worksQuery.error instanceof Error ? worksQuery.error.message : "Could not load assigned work."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void worksQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {worksQuery.isPending ? (
        <ListPageSkeleton page="assigned-work" contentOnly />
      ) : !worksQuery.isError && pageWorks.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <Store className="mx-auto size-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-800">
            {hasFilters ? "No assignments match these filters." : "No assigned work yet."}
          </p>
          {hasFilters && (
            <Button type="button" variant="link" onClick={clearFilters} className="mt-1 text-xs text-[#c82432]">
              Clear filters
            </Button>
          )}
        </div>
      ) : !worksQuery.isError ? (
        <section aria-label="Assigned work results" className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="space-y-3 p-3 md:hidden">
            {pageWorks.map((work) => (
              <article key={work.id} className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-rose-50 text-[#c82432]">
                      <Store className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-slate-900">{work.shopName}</h2>
                      <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500">
                        <MapPin className="size-3 shrink-0" aria-hidden="true" />
                        {work.shopArea || "Area not provided"}
                      </p>
                    </div>
                  </div>
                  <Badge className={`shrink-0 ${progressClass(work.progress)}`}>
                    {progressLabel(work.progress)}
                  </Badge>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-700">
                  {work.staffName}{work.staffCode ? ` · ${work.staffCode}` : ""}
                </p>
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                  {work.message?.trim() || "No work details provided."}
                </p>
                <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                  Assigned {format(new Date(work.createdAt), "dd MMM yyyy, h:mm a")}
                </p>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[760px]">
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-40 pl-5">Staff member</TableHead>
                  <TableHead className="min-w-44">Shop</TableHead>
                  <TableHead className="min-w-64">Work details</TableHead>
                  <TableHead className="min-w-40">Assigned date</TableHead>
                  <TableHead className="min-w-32">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageWorks.map((work) => (
                  <TableRow key={work.id}>
                    <TableCell className="pl-5">
                      <p className="font-medium text-slate-800">{work.staffName}</p>
                      {work.staffCode && <p className="mt-0.5 text-[11px] text-slate-500">{work.staffCode}</p>}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-800">{work.shopName}</p>
                      {work.shopArea && <p className="mt-0.5 text-[11px] text-slate-500">{work.shopArea}</p>}
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal">
                      <p className="line-clamp-2 text-slate-600">{work.message?.trim() || "No work details provided."}</p>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {format(new Date(work.createdAt), "dd MMM yyyy, h:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge className={progressClass(work.progress)}>{progressLabel(work.progress)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      <TablePaginationFooter
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filteredWorks.length}
        itemLabel="assigned works"
        onPageChange={setPage}
      />
    </section>
  )
}
