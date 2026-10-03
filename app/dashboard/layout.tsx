import type { ReactNode } from "react"

import { DashboardShell } from "@/components/custom/dashboard/dashboard-shell"
import { CurrentUserProvider } from "@/components/custom/dashboard/current-user"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      <DashboardShell>{children}</DashboardShell>
    </CurrentUserProvider>
  )
}