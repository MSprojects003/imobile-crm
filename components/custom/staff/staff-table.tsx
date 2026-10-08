import { ListPageSkeleton } from "@/components/custom/dashboard/list-page-skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { StaffRecord } from "@/lib/staff"
import { MapPin, Phone, UserRound } from "lucide-react"

function TruncatedValue({ value, className }: { value: string; className: string }) {
  if (!value) return <span className="text-slate-400">—</span>

  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" className={`block w-full truncate text-left ${className}`} />}>
        {value}
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="text-xs">{value}</TooltipContent>
    </Tooltip>
  )
}

export function StaffTable({
  staff,
  isLoading,
  error,
  hasFilters,
  updatingStaffId,
  onStatusChange,
}: {
  staff: StaffRecord[]
  isLoading: boolean
  error: string
  hasFilters: boolean
  updatingStaffId: string | null
  onStatusChange: (id: string, isActive: boolean) => void
}) {
  if (isLoading) {
    return <ListPageSkeleton page="staff" contentOnly />
  }

  const mobileStateMessage = error ? (
    <p role="alert" className="px-4 py-8 text-center text-xs text-rose-700">{error}</p>
  ) : staff.length === 0 ? (
    <div className="px-4 py-10 text-center">
      <p className="text-xs font-medium text-slate-700">{hasFilters ? "No staff match these filters" : "No staff members yet"}</p>
      <p className="mt-1 text-xs text-slate-500">
        {hasFilters ? "Try changing or clearing your filters." : "New staff members will appear here after they are added."}
      </p>
    </div>
  ) : null

  return (
    <section aria-label="Staff list" className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-900/3">
      <div className="hidden md:block">
      <Table className="text-xs">
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-24 pl-4 text-xs font-semibold text-slate-500">Staff ID</TableHead>
            <TableHead className="min-w-36 text-xs font-semibold text-slate-500">Name</TableHead>
            <TableHead className="min-w-32 text-xs font-semibold text-slate-500">Phone</TableHead>
            <TableHead className="min-w-28 text-xs font-semibold text-slate-500">Role</TableHead>
            <TableHead className="min-w-28 text-xs font-semibold text-slate-500">NIC</TableHead>
            <TableHead className="min-w-28 text-xs font-semibold text-slate-500">Status</TableHead>
            <TableHead className="min-w-28 pr-4 text-xs font-semibold text-slate-500">Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {error ? (
            <TableRow><TableCell colSpan={7} className="h-24 text-center text-xs text-rose-700">{error}</TableCell></TableRow>
          ) : staff.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center">
                <p className="text-xs font-medium text-slate-700">{hasFilters ? "No staff match these filters" : "No staff members yet"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {hasFilters ? "Try changing or clearing your filters." : "New staff members will appear here after they are added."}
                </p>
              </TableCell>
            </TableRow>
          ) : staff.map((member) => {
            const isActive = member.isActive && !member.isDeleted
            return (
              <TableRow key={member.id}>
                <TableCell className="pl-4 font-mono text-xs font-semibold text-slate-700">{member.staffId}</TableCell>
                <TableCell className="max-w-36 font-medium text-slate-900">
                  <TruncatedValue value={member.fullName} className="text-xs font-medium text-slate-900" />
                </TableCell>
                <TableCell className="max-w-32 whitespace-nowrap text-slate-600">
                  <TruncatedValue value={member.phone} className="text-xs text-slate-600" />
                </TableCell>
                <TableCell className="max-w-28 text-slate-600">
                  <TruncatedValue value={member.role ?? ""} className="text-xs text-slate-600" />
                </TableCell>
                <TableCell className="max-w-28 text-slate-600">
                  <TruncatedValue value={member.nic ?? ""} className="text-xs text-slate-600" />
                </TableCell>
                <TableCell>
                  <Select
                    value={isActive ? "active" : "deactive"}
                    onValueChange={(value: string | null) => {
                      if (value) void onStatusChange(member.id, value === "active")
                    }}
                  >
                    <SelectTrigger
                      aria-label={`${member.fullName} status`}
                      disabled={updatingStaffId === member.id}
                      className={`h-8 min-w-24 px-2 text-xs ${isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"}`}
                    >
                      <SelectValue>{(value) => value === "active" ? "Active" : "Deactive"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="active" className="text-xs">Active</SelectItem>
                      <SelectItem value="deactive" className="text-xs">Deactive</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="whitespace-nowrap pr-4 text-slate-600">
                  {new Date(member.createdAt).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "2-digit" })}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
      <div className="md:hidden">
        {mobileStateMessage ? (
          mobileStateMessage
        ) : (
          <ul className="space-y-2 p-2">
            {staff.map((member) => {
              const isActive = member.isActive && !member.isDeleted
              const initials = member.fullName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("")

              return (
                <li key={member.id} className="flex min-w-0 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {initials || <UserRound className="size-4" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900">{member.fullName || "Unnamed staff"}</p>
                      <Select
                        value={isActive ? "active" : "deactive"}
                        onValueChange={(value: string | null) => {
                          if (value) void onStatusChange(member.id, value === "active")
                        }}
                      >
                        <SelectTrigger
                          aria-label={`${member.fullName} status`}
                          disabled={updatingStaffId === member.id}
                          className={`h-6 min-w-0 gap-1 rounded-full px-2 text-[10px] font-medium shadow-none ${isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"}`}
                        >
                          <SelectValue>{(value) => value === "active" ? "Active" : "Deactive"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-xs">Active</SelectItem>
                          <SelectItem value="deactive" className="text-xs">Deactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{member.staffId}</p>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-600">
                      <Phone className="size-3 shrink-0 text-slate-400" aria-hidden="true" />
                      <p className="min-w-0 truncate">{member.phone || "No phone number"}</p>
                    </div>
                    {(member.role || member.address || member.nic) && (
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
                        {member.address ? <MapPin className="size-3 shrink-0 text-slate-400" aria-hidden="true" /> : <span className="w-3 shrink-0" />}
                        <p className="min-w-0 truncate">
                          {[member.role, member.address, member.nic ? `NIC ${member.nic}` : ""].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">
                      Joined {new Date(member.createdAt).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "2-digit" })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}