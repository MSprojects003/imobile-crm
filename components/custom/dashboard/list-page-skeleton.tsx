import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type ListPageKind =
  | "products"
  | "staff"
  | "catalog"
  | "orders"
  | "shops"
  | "assigned-work"
  | "users"

const pageDetails: Record<ListPageKind, { title: string; description: string }> = {
  products: { title: "Products", description: "Loading product catalog" },
  staff: { title: "Reps (Staffs)", description: "Loading staff profiles" },
  catalog: { title: "Catalog", description: "Loading catalog entries" },
  orders: { title: "Orders", description: "Loading order activity" },
  shops: { title: "Shops", description: "Loading shop owners and assigned staff" },
  "assigned-work": { title: "Assigned - Work", description: "Loading assigned work" },
  users: { title: "Users", description: "Loading platform users" },
}

const columnsByPage: Partial<Record<ListPageKind, string[]>> = {
  products: ["w-40", "w-24", "w-20", "w-16", "w-12", "w-8"],
  staff: ["w-14", "w-24", "w-24", "w-16", "w-16", "w-16", "w-16"],
  catalog: ["w-24", "w-14", "w-40", "w-20", "w-16"],
  orders: ["w-16", "w-24", "w-24", "w-20", "w-16", "w-16"],
  shops: ["w-20", "w-24", "w-24", "w-20", "w-20", "w-16", "w-8"],
  "assigned-work": ["w-24", "w-24", "w-32", "w-20", "w-20"],
}

function FilterSkeleton({ page }: { page: ListPageKind }) {
  const filterCount = page === "staff" || page === "assigned-work" ? 3 : 2
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {Array.from({ length: filterCount }, (_, index) => (
        <Skeleton
          key={`${page}-filter-${index}`}
          className={`h-9 w-full rounded-md ${index === 0 ? "sm:w-64" : "sm:w-36"}`}
        />
      ))}
    </div>
  )
}

function DesktopTableSkeleton({ page }: { page: ListPageKind }) {
  const columns = columnsByPage[page] ?? []
  const rows = page === "staff" ? 5 : 6
  return (
    <div className="hidden overflow-x-auto md:block">
      <Table className="min-w-full">
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-transparent">
            {columns.map((width, index) => (
              <TableHead key={`${page}-head-${index}`}>
                <Skeleton className={`h-3 ${width}`} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <TableRow key={`${page}-row-${rowIndex}`} className="hover:bg-transparent">
              {columns.map((width, columnIndex) => (
                <TableCell key={`${page}-${rowIndex}-${columnIndex}`} className="py-3">
                  {page === "products" && columnIndex === 0 ? (
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-10 shrink-0 rounded-md" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                    </div>
                  ) : page === "staff" && columnIndex === 1 ? (
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ) : (
                    <Skeleton className={`h-3 ${width}`} />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MobileCardsSkeleton({ page }: { page: ListPageKind }) {
  const cards = page === "products" || page === "staff" ? 4 : 5
  return (
    <div className="space-y-2 p-2 md:hidden">
      {Array.from({ length: cards }, (_, index) => (
        <article
          key={`${page}-mobile-${index}`}
          className="rounded-md border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          {page === "products" ? (
            <div className="flex items-start gap-2.5">
              <Skeleton className="h-16 w-12 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-1/3" />
                  <span className="h-3 border-l border-slate-200" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-3 w-2/3" />
                <div className="flex items-center justify-between pt-0.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              </div>
              <Skeleton className="size-7 shrink-0 rounded-md" />
            </div>
          ) : page === "staff" ? (
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-4/5" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ) : page === "assigned-work" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Skeleton className="size-9 shrink-0 rounded-md" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          ) : page === "catalog" ? (
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}

function ResultsSkeleton({ page }: { page: ListPageKind }) {
  return (
    <section
      aria-label={`Loading ${pageDetails[page].title.toLowerCase()}`}
      aria-busy="true"
      role="status"
      className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
    >
      <DesktopTableSkeleton page={page} />
      <MobileCardsSkeleton page={page} />
      <span className="sr-only">Loading {pageDetails[page].title.toLowerCase()}</span>
    </section>
  )
}

export function ListPageSkeleton({
  page,
  contentOnly = false,
}: {
  page: ListPageKind
  contentOnly?: boolean
}) {
  if (contentOnly) return <ResultsSkeleton page={page} />

  const details = pageDetails[page]
  return (
    <section
      aria-label={`Loading ${details.title.toLowerCase()} page`}
      aria-busy="true"
      role="status"
      className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5"
    >
      <header className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </header>
      <FilterSkeleton page={page} />
      {page === "users" ? (
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <Skeleton className="mb-3 size-9 rounded-md" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-2 h-3 w-72 max-w-full" />
          <Skeleton className="mt-5 h-9 w-28" />
        </div>
      ) : (
        <>
          <ResultsSkeleton page={page} />
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-28" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          </div>
        </>
      )}
      <span className="sr-only">Loading {details.title.toLowerCase()} page</span>
    </section>
  )
}
