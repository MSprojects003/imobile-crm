"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { AssignWorkSheet } from "@/components/custom/dashboard/assign-work-sheet"
import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import { DashboardSessionSkeleton } from "@/components/custom/dashboard/dashboard-skeleton"
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
  orders: "Orders",
  users: "Users",
  shops: "Shops",
  account: "Account",
  notifications: "Notifications",
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

  if (isLoading) {
    return <DashboardSessionSkeleton />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh min-h-0 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <SidebarTrigger aria-label="Toggle navigation" />
          <div className="hidden h-5 w-px bg-border md:block" />
          <Link
            href="/dashboard"
            aria-label="iMobile dashboard"
            className="absolute left-1/2 -translate-x-1/2 md:hidden"
          >
            <Image
              src="/imobile.webp"
              alt="iMobile Supreme"
              width={130}
              height={42}
              priority
              className="h-auto w-[110px] object-contain"
            />
          </Link>
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
          <div className="ml-auto">
            <AssignWorkSheet />
          </div>
        </header>
        <div
          className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-8"
          style={{ paddingBottom: hasStickyTableFooter ? 0 : undefined }}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}