import { CircleUserRound } from "lucide-react"

import { SectionPage } from "@/components/custom/dashboard/section-page"

export default function AccountPage() {
  return (
    <SectionPage
      title="Account"
      description="Account settings for your iMobile admin workspace."
      icon={CircleUserRound}
      actionLabel="Back to dashboard"
    />
  )
}