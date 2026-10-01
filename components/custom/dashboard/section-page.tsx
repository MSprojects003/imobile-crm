import type { LucideIcon } from "lucide-react"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

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
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          iMobile workspace
        </p>
        </div>

      <div className="flex min-h-72 flex-col items-center justify-center border-y bg-background px-6 py-12 text-center">
        <span className="mb-5 grid size-12 place-items-center rounded-lg border bg-muted/50 text-foreground">
          <Icon className="size-5" />
        </span>
        <h2 className="text-base font-semibold">Your {title.toLowerCase()} will appear here</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          This section is ready. Connect your {title.toLowerCase()} data to start managing it from your workspace.
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