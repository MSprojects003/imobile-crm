"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { AssignWorkSheet } from "@/components/custom/dashboard/assign-work-sheet"
import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import {
  ListPageSkeleton,
  type ListPageKind,
} from "@/components/custom/dashboard/list-page-skeleton"
import {
  DashboardPageSkeleton,
} from "@/components/custom/dashboard/dashboard-skeleton"
import {
  NotificationsBellButton,
  NotificationsProvider,
  SmsMonthlySummaryButton,
} from "@/components/custom/dashboard/Notifications"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase"

const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  categories: "Categories",
  brands: "Brands",
  products: "Products",
  reps: "Reps (Staffs)",
  "assigned-work": "Assigned - Work",
  orders: "Orders",
  users: "Users",
  shops: "Shops",
  account: "Account",
  notifications: "Notifications",
}

const listPageKinds: Record<string, ListPageKind> = {
  products: "products",
  reps: "staff",
  brands: "catalog",
  categories: "catalog",
  orders: "orders",
  shops: "shops",
  "assigned-work": "assigned-work",
  users: "users",
}

function SessionPageSkeleton({ pathname }: { pathname: string }) {
  const page = pathname.split("/").filter(Boolean).at(-1) ?? "dashboard"
  if (page === "dashboard") return <DashboardPageSkeleton />
  const pageKind = listPageKinds[page]
  if (pageKind) return <ListPageSkeleton page={pageKind} />
  return (
    <div aria-label={`Loading ${page} page`} aria-busy="true" role="status" className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-32 w-full rounded-md" />
    </div>
  )
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const currentPage = pageTitles[pathname.split("/").filter(Boolean).at(-1) ?? ""] ?? "Home"
  const isAssetPage = [
    "/dashboard/products",
    "/dashboard/categories",
    "/dashboard/brands",
  ].includes(pathname)
  const hasStickyTableFooter = [
    "/dashboard/products",
    "/dashboard/categories",
    "/dashboard/brands",
    "/dashboard/reps",
    "/dashboard/assigned-work",
    "/dashboard/orders",
    "/dashboard/shops",
  ].includes(pathname)

  useEffect(() => {
    let isCurrent = true
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/")
    })

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!isCurrent) return
      if (error || !data.user) {
        router.replace("/")
        return
      }
      setIsLoading(false)
    })

    return () => {
      isCurrent = false
      authListener.subscription.unsubscribe()
    }
  }, [router])

  return (
    <SidebarProvider>
      <NotificationsProvider>
        <AppSidebar />
        <SidebarInset className="h-svh min-h-0 overflow-hidden">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              <SidebarTrigger aria-label="Toggle navigation" />
              <Link
                href="/dashboard"
                aria-label="iMobile dashboard"
                className="shrink-0"
              >
                <Image
                  src="/imobile.webp"
                  alt="iMobile Supreme"
                  width={130}
                  height={42}
                  priority
                  className="h-auto w-[96px] object-contain sm:w-[110px]"
                />
              </Link>
              <div className="hidden h-5 w-px bg-border md:block" />
              <Breadcrumb className="hidden md:block">
                <BreadcrumbList>
                  {currentPage === "Dashboard" ? (
                    <BreadcrumbItem>
                      <BreadcrumbPage>Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                  ) : (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbLink render={<Link href="/dashboard" />}>Dashboard</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      {isAssetPage && (
                        <>
                          <BreadcrumbItem>
                            <BreadcrumbLink render={<Link href="/dashboard/products" />}>Asset</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator />
                        </>
                      )}
                      <BreadcrumbItem>
                        <BreadcrumbPage>{currentPage}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <NotificationsBellButton />
              <SmsMonthlySummaryButton />
              <AssignWorkSheet />
            </div>
          </header>
          <div
            className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-8"
            style={{ paddingBottom: hasStickyTableFooter ? 0 : undefined }}
          >
            {isLoading ? <SessionPageSkeleton pathname={pathname} /> : children}
          </div>
        </SidebarInset>
      </NotificationsProvider>
    </SidebarProvider>
  )
}