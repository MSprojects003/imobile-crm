import { Bell } from "lucide-react"

import { SectionPage } from "@/components/custom/dashboard/section-page"

export default function NotificationsPage() {
  return (
    <SectionPage
      title="Notifications"
      description="Updates and alerts for your iMobile admin workspace."
      icon={Bell}
      actionLabel="Back to dashboard"
    />
  )
}