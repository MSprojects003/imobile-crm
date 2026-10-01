import { UsersRound } from "lucide-react"

import { SectionPage } from "@/components/custom/dashboard/section-page"

export default function UsersPage() {
  return (
    <SectionPage
      title="Users"
      description="View and manage the people using your iMobile platform."
      icon={UsersRound}
      actionLabel="Back to home"
    />
  )
}