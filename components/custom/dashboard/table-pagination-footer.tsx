import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

type TablePaginationFooterProps = {
  currentPage: number
  pageSize: number
  totalItems: number
  itemLabel: string
  onPageChange: (page: number) => void
}

export function TablePaginationFooter({
  currentPage,
  pageSize,
  totalItems,
  itemLabel,
  onPageChange,
}: TablePaginationFooterProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <footer className="sticky bottom-0 z-0 -mx-5 mt-auto flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4">
      <p className="text-xs leading-5 text-slate-600">
        Showing {firstItem}–{lastItem} of {totalItems} {itemLabel}
      </p>
      <nav aria-label={`${itemLabel} pagination`} className="flex items-center gap-3 self-end sm:self-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs"
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <span className="min-w-24 text-center text-xs font-medium tabular-nums text-slate-600">
          Page {currentPage} of {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs"
          aria-label="Next page"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </nav>
    </footer>
  )
}