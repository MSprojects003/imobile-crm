"use client"

import { useEffect, useState } from "react"

export function ParcelCountInput({
  value,
  label,
  disabled,
  onSave,
}: {
  value: number
  label: string
  disabled: boolean
  onSave: (value: number) => Promise<unknown>
}) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  async function save() {
    const nextValue = Number(draft)
    if (
      draft.trim() === "" ||
      !Number.isSafeInteger(nextValue) ||
      nextValue < 0
    ) {
      setDraft(String(value))
      return
    }
    if (nextValue !== value) {
      try {
        await onSave(nextValue)
      } catch {
        setDraft(String(value))
      }
    }
  }

  return (
    <input
      type="number"
      min={0}
      step={1}
      inputMode="numeric"
      aria-label={label}
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur()
        } else if (event.key === "Escape") {
          setDraft(String(value))
          event.currentTarget.blur()
        }
      }}
      className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-center text-xs font-medium text-slate-800 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
    />
  )
}
