import { StatsCards } from "@/components/custom/dashboard/StatsCards"
import { SalesTrendChart } from "@/components/custom/dashboard/SalesTrendChart"
import { TopReps } from "@/components/custom/dashboard/charts/topReps"
import { PageHeading } from "@/components/custom/dashboard/page-heading"

export default function DashboardPage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-7">
      <PageHeading
        title="Dashboard"
        description="Track sales activity and top-performing representatives."
        hideTitle
      />
      <StatsCards />
      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
        <SalesTrendChart />
        <TopReps />
      </div>
    </section>
  )
}