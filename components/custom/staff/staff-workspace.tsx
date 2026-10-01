"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search, X, Plus } from "lucide-react"

import { StaffDateRangePicker } from "@/components/custom/staff/staff-date-range-picker"
import { AddStaffSheet } from "@/components/custom/staff/add-staff-sheet"
import { StaffTable } from "@/components/custom/staff/staff-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TablePaginationFooter } from "@/components/custom/dashboard/table-pagination-footer"
import { createStaff, fetchStaff, updateStaffStatus, type CreateStaffInput, type StaffList } from "@/lib/staff"

const staffQueryKey = ["staff"]
const staffPageSize = 10
type StatusFilter = "all" | "active" | "deactive"

export function StaffWorkspace() {
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [joinedFrom, setJoinedFrom] = useState("")
  const [joinedTo, setJoinedTo] = useState("")
  const [page, setPage] = useState(1)
  const staffQuery = useQuery({ queryKey: staffQueryKey, queryFn: fetchStaff })
  const createMutation = useMutation({
    mutationFn: (input: CreateStaffInput) => createStaff(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: staffQueryKey })
      setSheetOpen(false)
      setToastMessage("New staff created successfully")
    },
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateStaffStatus(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: staffQueryKey })
      const previous = queryClient.getQueryData<StaffList>(staffQueryKey)
      if (previous) {
        queryClient.setQueryData<StaffList>(staffQueryKey, {
          ...previous,
          staff: previous.staff.map((member) => member.id === id ? { ...member, isActive } : member),
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(staffQueryKey, context.previous)
    },
    onSuccess: (updatedStaff) => {
      queryClient.setQueryData<StaffList>(staffQueryKey, (current) => current && ({
        ...current,
        staff: current.staff.map((member) => member.id === updatedStaff.id ? updatedStaff : member),
      }))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: staffQueryKey }),
  })

  useEffect(() => {
    if (!toastMessage) return
    const timeoutId = window.setTimeout(() => setToastMessage(""), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  async function handleCreate(input: CreateStaffInput) {
    await createMutation.mutateAsync(input)
  }

  async function handleStatusChange(id: string, isActive: boolean) {
    await statusMutation.mutateAsync({ id, isActive })
  }

  const staffData: StaffList = staffQuery.data ?? { staff: [], nextStaffId: "S0001" }
  const queryError = staffQuery.error instanceof Error ? staffQuery.error.message : "Could not load staff."
  const filteredStaff = staffData.staff.filter((member) => {
    const searchValue = search.trim().toLowerCase()
    const matchesSearch = !searchValue || [member.staffId, member.fullName, member.phone, member.nic ?? "", member.role ?? ""]
      .some((value) => value.toLowerCase().includes(searchValue))
    const isActive = member.isActive && !member.isDeleted
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? isActive : !isActive)
    const joinedDate = new Date(member.createdAt)
    const fromDate = joinedFrom ? new Date(`${joinedFrom}T00:00:00`) : null
    const toDate = joinedTo ? new Date(`${joinedTo}T23:59:59.999`) : null
    const matchesDateRange = (!fromDate || joinedDate >= fromDate) && (!toDate || joinedDate <= toDate)

    return matchesSearch && matchesStatus && matchesDateRange
  })
  const visibleStaff = filteredStaff.slice((page - 1) * staffPageSize, page * staffPageSize)
  const hasFilters = Boolean(search.trim() || statusFilter !== "all" || joinedFrom || joinedTo)

  function clearFilters() {
    setSearch("")
    setStatusFilter("all")
    setJoinedFrom("")
    setJoinedTo("")
    setPage(1)
  }

  return (
    <section className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6">
      <section aria-label="Staff filters" className="space-y-3">
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-3">
          <label className="relative block min-w-0 flex-1 sm:max-w-xs lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              aria-label="Search staff"
              className="h-10 rounded-md border-slate-200 bg-white pl-9 pr-10 text-sm focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search name, staff ID, phone, or role"
              value={search}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ed1c2e]"
                onClick={() => {
                  setSearch("")
                  setPage(1)
                }}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </label>
          <Button
            type="button"
            onClick={() => {
              createMutation.reset()
              setSheetOpen(true)
            }}
            className="h-10 w-auto shrink-0 gap-2 bg-[#ed1c2e] px-3 text-white hover:bg-[#d91829] sm:px-4"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add staff
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3 sm:order-1 sm:justify-start">
            <p className="whitespace-nowrap text-xs tabular-nums text-slate-500" aria-live="polite">
              {filteredStaff.length} {filteredStaff.length === 1 ? "staff member" : "staff members"}
            </p>
            {hasFilters && (
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-600" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:order-2 sm:ml-auto sm:flex-row sm:items-center">
            <label className="text-xs font-medium text-slate-600" htmlFor="staff-status-filter">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(value: string | null) => {
                setStatusFilter((value ?? "all") as StatusFilter)
                setPage(1)
              }}
            >
              <SelectTrigger id="staff-status-filter" aria-label="Filter staff by status" className="h-10 w-full sm:w-36">
                <SelectValue>
                  {(value) => value === "active" ? "Active" : value === "deactive" ? "Deactive" : "All status"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deactive">Deactive</SelectItem>
              </SelectContent>
            </Select>
            <StaffDateRangePicker
              from={joinedFrom}
              to={joinedTo}
              onFromChange={(value) => {
                setJoinedFrom(value)
                setPage(1)
              }}
              onToChange={(value) => {
                setJoinedTo(value)
                setPage(1)
              }}
            />
          </div>
        </div>
      </section>

      {staffQuery.isError && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm text-rose-700" role="alert">{queryError}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void staffQuery.refetch()}>Retry</Button>
        </div>
      )}

      <StaffTable
        staff={visibleStaff}
        isLoading={staffQuery.isPending}
        error={staffQuery.isError ? queryError : ""}
        hasFilters={hasFilters}
        updatingStaffId={statusMutation.isPending ? statusMutation.variables?.id ?? null : null}
        onStatusChange={handleStatusChange}
      />

      {statusMutation.isError && (
        <p className="text-sm text-rose-700" role="alert">
          {statusMutation.error instanceof Error ? statusMutation.error.message : "Could not update staff status."}
        </p>
      )}

      <TablePaginationFooter
        currentPage={page}
        pageSize={staffPageSize}
        totalItems={filteredStaff.length}
        itemLabel="staff"
        onPageChange={setPage}
      />

      <AddStaffSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        nextStaffId={staffData.nextStaffId}
        isSubmitting={createMutation.isPending}
        error={createMutation.error instanceof Error ? createMutation.error.message : ""}
        onSubmit={handleCreate}
      />

      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-120 rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg sm:right-8 sm:bottom-8">
          {toastMessage}
        </div>
      )}
    </section>
  )
}