import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type TableSkeletonProps = {
  label: string
  columns: number
  rows?: number
  className?: string
  tableClassName?: string
}

export function TableSkeleton({
  label,
  columns,
  rows = 5,
  className,
  tableClassName,
}: TableSkeletonProps) {
  return (
    <section
      aria-label={`Loading ${label}`}
      aria-busy="true"
      role="status"
      className={cn(
        "overflow-hidden rounded-md border border-slate-200 bg-white",
        className
      )}
    >
      <Table className={tableClassName}>
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-transparent">
            {Array.from({ length: columns }, (_, index) => (
              <TableHead key={`header-${index}`}>
                <Skeleton className="h-3 w-3/4" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <TableRow key={`row-${rowIndex}`} className="hover:bg-transparent">
              {Array.from({ length: columns }, (_, columnIndex) => (
                <TableCell key={`cell-${columnIndex}`} className="py-3">
                  <Skeleton
                    className={`h-4 ${
                      columnIndex === 0 ? "w-4/5" : "w-2/3"
                    }`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <span className="sr-only">Loading {label}</span>
    </section>
  )
}
