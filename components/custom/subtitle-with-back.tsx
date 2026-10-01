"use client"

import { ArrowLeft } from "lucide-react"

type SubtitleWithBackProps = {
  subtitle: string
  backLabel: string
  onBack: () => void
}

export function SubtitleWithBack({ subtitle, backLabel, onBack }: SubtitleWithBackProps) {
  return (
    <div className="mb-2 flex items-center gap-1">
      <button
        aria-label={backLabel}
        className="-ml-1 inline-flex size-6 items-center justify-center rounded text-[#707781] transition-colors hover:bg-[#f4f5f6] hover:text-[#ed1c2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
        onClick={onBack}
        title={backLabel}
        type="button"
      >
        <ArrowLeft className="size-4" />
      </button>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ed1c2e]">{subtitle}</p>
    </div>
  )
}
