"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type DownloadColumn<T> = {
  header: string
  value: (row: T) => string | number | boolean | Date | null | undefined
}

type DownloadFormat = "csv" | "xlsx"

function getCellValue(value: ReturnType<DownloadColumn<unknown>["value"]>) {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString()
  return value
}

function escapeCsvCell(value: string | number | boolean) {
  const text = String(value)
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replaceAll('"', '""')}"`
}

export function DownloadData<T>({
  data,
  columns,
  filename,
  label = "Download",
  itemLabel = "record",
  sheetName = "Data",
}: {
  data: readonly T[]
  columns: readonly DownloadColumn<T>[]
  filename: string
  label?: string
  itemLabel?: string
  sheetName?: string
}) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<DownloadFormat>("xlsx")
  const [error, setError] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)

  async function download() {
    if (data.length === 0 || columns.length === 0) return

    setIsDownloading(true)
    setError("")

    try {
      const rows = data.map((row) =>
        columns.map((column) => getCellValue(column.value(row)))
      )
      let blob: Blob

      if (format === "csv") {
        const csv = [
          columns.map((column) => escapeCsvCell(column.header)).join(","),
          ...rows.map((row) => row.map(escapeCsvCell).join(",")),
        ].join("\r\n")
        blob = new Blob(["\uFEFF", csv], {
          type: "text/csv;charset=utf-8",
        })
      } else {
        const ExcelJS = await import("exceljs")
        const workbook = new ExcelJS.Workbook()
        const safeSheetName =
          sheetName.replace(/[\\/*?:[\]]/g, " ").slice(0, 31) || "Data"
        const worksheet = workbook.addWorksheet(safeSheetName, {
          views: [{ state: "frozen", ySplit: 1 }],
        })
        worksheet.columns = columns.map((column, index) => ({
          header: column.header,
          key: `column${index}`,
          width: Math.min(Math.max(column.header.length + 2, 14), 32),
        }))
        rows.forEach((row) => worksheet.addRow(row))
        worksheet.getRow(1).font = { bold: true, color: { argb: "FF334155" } }
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: columns.length },
        }
        const content = await workbook.xlsx.writeBuffer()
        blob = new Blob([content], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      }

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${filename}.${format}`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setOpen(false)
    } catch (downloadError) {
      console.error(
        `Could not export the current ${itemLabel} view.`,
        downloadError
      )
      setError(
        downloadError instanceof Error
          ? `The file could not be created: ${downloadError.message}`
          : "The file could not be created. Please try again."
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`${label} current page`}
        title={`${label} current page`}
        disabled={data.length === 0}
        onClick={() => {
          setError("")
          setOpen(true)
        }}
        className="size-9 shrink-0 border-slate-200 bg-white text-slate-600"
      >
        <Download className="size-4" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-5">
          <DialogHeader>
            <DialogTitle>Download {itemLabel} list</DialogTitle>
            <DialogDescription>
              Choose a file format for the {data.length} {itemLabel}{" "}
              {data.length === 1 ? "record" : "records"} currently shown.
            </DialogDescription>
          </DialogHeader>

          <div
            className="grid gap-2"
            role="radiogroup"
            aria-label="File format"
          >
            {(
              [
                {
                  value: "xlsx",
                  title: "Excel workbook",
                  details: "Microsoft Excel (.xlsx)",
                  Icon: FileSpreadsheet,
                },
                {
                  value: "csv",
                  title: "CSV file",
                  details: "Comma-separated values (.csv)",
                  Icon: FileText,
                },
              ] as const
            ).map(({ value, title, details, Icon }) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 border p-3 transition-colors ${
                  format === value
                    ? "border-slate-500 bg-slate-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="staff-download-format"
                  value={value}
                  checked={format === value}
                  onChange={() => setFormat(value)}
                  className="size-4 accent-slate-800"
                />
                <Icon
                  className="size-4 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs font-medium text-slate-900">
                    {title}
                  </span>
                  <span className="text-[11px] text-slate-500">{details}</span>
                </span>
              </label>
            ))}
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-700">
              {error}
            </p>
          )}

          <DialogFooter className="flex-row justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isDownloading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void download()}
              disabled={isDownloading}
              className="gap-2"
            >
              <Download className="size-4" aria-hidden="true" />
              {isDownloading ? "Preparing…" : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
