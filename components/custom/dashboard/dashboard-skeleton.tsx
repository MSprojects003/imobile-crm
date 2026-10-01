import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSessionSkeleton() {
  return (
    <main className="flex min-h-svh bg-white">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 p-5 md:flex">
        <Skeleton className="mb-8 h-10 w-36 rounded-sm" />
        <Skeleton className="mb-4 h-3 w-20 rounded-sm" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-10 w-full rounded-sm" />
          ))}
        </div>
        <Skeleton className="mt-auto h-12 w-full rounded-sm" />
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex h-16 items-center gap-4 border-b border-slate-200 px-5">
          <Skeleton className="size-8 rounded-sm" />
          <Skeleton className="h-4 w-36 rounded-sm" />
        </div>
        <DashboardPageSkeleton />
      </div>
    </main>
  )
}

export function DashboardPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 sm:p-8" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-sm" />
        <Skeleton className="h-7 w-48 rounded-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-4 rounded-sm border border-slate-200 p-4">
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="h-8 w-28 rounded-sm" />
            <Skeleton className="h-3 w-32 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
        <div className="space-y-4 rounded-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-sm" />
            <Skeleton className="h-8 w-28 rounded-sm" />
          </div>
          <Skeleton className="h-64 w-full rounded-sm sm:h-72" />
        </div>
        <div className="space-y-4 rounded-sm border border-slate-200 p-5">
          <Skeleton className="h-5 w-28 rounded-sm" />
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-12 w-full rounded-sm" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function AuthPageSkeleton() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-100 p-4 sm:p-8" aria-label="Loading sign-in page">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-sm bg-white shadow-sm lg:min-h-[540px] lg:grid-cols-2">
        <Skeleton className="hidden min-h-[540px] rounded-none lg:block" />
        <div className="flex items-center p-7 sm:p-12">
          <div className="mx-auto w-full max-w-sm space-y-5">
            <Skeleton className="h-3 w-24 rounded-sm" />
            <Skeleton className="h-8 w-48 rounded-sm" />
            <Skeleton className="h-4 w-64 max-w-full rounded-sm" />
            <div className="space-y-4 pt-3">
              {[0, 1].map((item) => (
                <div key={item} className="space-y-2">
                  <Skeleton className="h-4 w-20 rounded-sm" />
                  <Skeleton className="h-12 w-full rounded-sm" />
                </div>
              ))}
              <Skeleton className="h-12 w-full rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}