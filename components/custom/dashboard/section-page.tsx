import type { LucideIcon } from "lucide-react"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { PageHeading } from "@/components/custom/dashboard/page-heading"

type SectionPageProps = {
  title: string
  description: string
  icon: LucideIcon
  actionLabel: string
}

export function SectionPage({
  title,
  description,
  icon: Icon,
  actionLabel,
}: SectionPageProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <PageHeading title={title} description={description} />

      <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <span className="mb-5 grid size-12 place-items-center rounded-lg border bg-muted/50 text-foreground">
          <Icon className="size-5" />
        </span>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Your {title.toLowerCase()} will appear here</h2>
        <p className="mt-2 max-w-md text-[13px] leading-5 text-muted-foreground">
          This section is ready for your {title.toLowerCase()} data.
        </p>
        <Button
          render={<Link href="/dashboard" />}
          nativeButton={false}
          variant="outline"
          className="mt-6"
        >
          {actionLabel}
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </div>
    </section>
  )
}