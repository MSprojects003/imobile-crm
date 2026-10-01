import { Skeleton } from "@/components/ui/skeleton"
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

function TruncatedValue({ value, className }: { value: string; className: string }) {
  if (!value) return <span className="text-slate-400">—</span>

  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" className={`block w-full truncate text-left ${className}`} />}>
        {value}
      </TooltipTrigger>
      <TooltipContent side="top" align="start">{value}</TooltipContent>
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
  return (
    <section aria-label="Staff list" className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-900/3">
      <Table>
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
          {isLoading ? Array.from({ length: 4 }, (_, index) => (
            <TableRow key={`staff-loading-${index}`}>
              <TableCell colSpan={7} className="py-4"><Skeleton className="h-8 w-full rounded-sm" /></TableCell>
            </TableRow>
          )) : error ? (
            <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-rose-700">{error}</TableCell></TableRow>
          ) : staff.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center">
                <p className="text-sm font-medium text-slate-700">{hasFilters ? "No staff match these filters" : "No staff members yet"}</p>
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
                  <TruncatedValue value={member.fullName} className="text-sm font-medium text-slate-900" />
                </TableCell>
                <TableCell className="max-w-32 whitespace-nowrap text-slate-600">
                  <TruncatedValue value={member.phone} className="text-sm text-slate-600" />
                </TableCell>
                <TableCell className="max-w-28 text-slate-600">
                  <TruncatedValue value={member.role ?? ""} className="text-sm text-slate-600" />
                </TableCell>
                <TableCell className="max-w-28 text-slate-600">
                  <TruncatedValue value={member.nic ?? ""} className="text-sm text-slate-600" />
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
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="deactive">Deactive</SelectItem>
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
    </section>
  )
}