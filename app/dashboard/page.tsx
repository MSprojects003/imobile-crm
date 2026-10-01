import { StatsCards } from "@/components/custom/dashboard/StatsCards"
import { SalesTrendChart } from "@/components/custom/dashboard/SalesTrendChart"
import { TopReps } from "@/components/custom/dashboard/charts/topReps"

export default function DashboardPage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-7">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">
          iMobile workspace
        </p>
        
      </div>
      <StatsCards />
      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
        <SalesTrendChart />
        <TopReps />
      </div>
    </section>
  )
}