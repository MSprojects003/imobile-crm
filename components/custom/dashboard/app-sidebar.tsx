"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Boxes,
  ChevronsUpDown,
  ClipboardList,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Package,
  Tags,
  Store,
  UsersRound,
} from "lucide-react"
import { Menu } from "@base-ui/react/menu"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase"

const navigationItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Reps (Staffs)", href: "/dashboard/reps", icon: UsersRound },
  { title: "Shops", href: "/dashboard/shops", icon: Store },
  { title: "Orders", href: "/dashboard/orders", icon: ClipboardList },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const isProductsSection = ["/dashboard/products", "/dashboard/categories", "/dashboard/brands"].includes(pathname)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(isProductsSection ? ["products"] : [])

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false)
  }

  useEffect(() => {
    if (isProductsSection) setExpandedGroups(["products"])
  }, [isProductsSection])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace("/")
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="h-16 justify-center px-5">
        <Link href="/dashboard" onClick={closeMobileSidebar} className="flex h-full items-center overflow-hidden">
          <Image
            src="/imobile.webp"
            alt="iMobile Supreme"
            width={170}
            height={54}
            priority
            className="h-auto max-h-12 w-[156px] object-contain object-left group-data-[collapsible=icon]:hidden"
          />
          <span className="hidden size-9 shrink-0 items-center justify-center rounded-md bg-[#ed1c2e] text-lg font-bold text-white group-data-[collapsible=icon]:flex">
            i
          </span>
        </Link>
      </SidebarHeader>
      <SidebarSeparator className="mx-4 ml-0 mt-0" />
      <SidebarContent>
        <SidebarGroup className="px-3.5 py-5">
          <SidebarGroupLabel className="px-3.5 pb-2 text-[11px] font-semibold uppercase text-slate-400">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={closeMobileSidebar}
                      className="h-11 gap-3 rounded-md px-3.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 [&_svg]:size-[18px] data-active:bg-transparent data-active:font-semibold data-active:text-[#ed1c2e] data-active:hover:bg-transparent data-active:hover:text-[#ed1c2e]"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              <SidebarMenuItem>
                <Accordion
                  value={expandedGroups}
                  onValueChange={setExpandedGroups}
                  className="w-full"
                >
                  <AccordionItem value="products" className="border-0">
                    <AccordionTrigger
                      className={`h-11 items-center rounded-md px-3.5 py-0 text-xs leading-5 font-medium no-underline hover:bg-slate-100 hover:no-underline [&[aria-expanded=true]]:font-semibold [&[aria-expanded=true]]:text-[#ed1c2e] group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 [&>svg[data-slot=accordion-trigger-icon]]:size-4 group-data-[collapsible=icon]:[&>svg[data-slot=accordion-trigger-icon]]:hidden ${isProductsSection ? "text-[#ed1c2e]" : "text-slate-600"}`}
                    >
                      <Package className="mr-3 size-[18px] shrink-0 group-data-[collapsible=icon]:mr-0" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">Asset</span>
                    </AccordionTrigger>
                    <AccordionContent className="[&_a]:no-underline [&_a]:hover:no-underline">
                      <SidebarMenuSub className="mx-4 gap-1 border-slate-200 px-3 py-1">
                        {[
                          { title: "Products", href: "/dashboard/products", icon: Package },
                          { title: "Categories", href: "/dashboard/categories", icon: Boxes },
                          { title: "Brands", href: "/dashboard/brands", icon: Tags },
                        ].map((item) => (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton
                              render={<Link href={item.href} />}
                              isActive={pathname === item.href}
                              size="sm"
                              onClick={closeMobileSidebar}
                              className="h-9 gap-2.5 rounded-md px-3 text-slate-600 leading-5 no-underline hover:bg-slate-100 hover:no-underline [&>svg]:size-4 [&>svg]:text-slate-500 data-active:bg-transparent data-active:font-semibold data-active:text-[#ed1c2e] data-active:hover:bg-transparent data-active:hover:text-[#ed1c2e]"
                            >
                              <item.icon />
                              <span>{item.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator className="mx-4 ml-0" />
      <SidebarFooter className="p-1.5">
        <Menu.Root>
          <Menu.Trigger
            aria-label="Open account menu"
            className="flex h-14 w-full items-center gap-3 rounded-md px-2.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30 data-popup-open:bg-slate-100 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <Avatar className="size-9 ring-1 ring-slate-200" aria-hidden="true">
              <AvatarFallback className="bg-[#fbe7e8] text-sm font-semibold text-[#c82432]">
                A
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold text-slate-800">Admin</span>
              <span className="truncate text-xs text-slate-500">Workspace account</span>
            </span>
            <ChevronsUpDown className="size-4 text-slate-500 group-data-[collapsible=icon]:hidden" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="right" align="end" sideOffset={8} className="z-50">
              <Menu.Popup className="w-60 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-800 shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
                <div className="flex items-center gap-3 px-3 py-3">
                  <Avatar className="size-9 ring-1 ring-slate-200" aria-hidden="true">
                    <AvatarFallback className="bg-[#fbe7e8] text-sm font-semibold text-[#c82432]">
                      A
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">Admin</span>
                    <span className="truncate text-xs text-slate-500">Workspace account</span>
                  </span>
                </div>
                <div className="my-1 border-t border-slate-100" />
                <Menu.LinkItem
                  href="/dashboard/account"
                  closeOnClick
                  onClick={closeMobileSidebar}
                  className="flex h-10 items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 data-highlighted:bg-slate-100"
                >
                  <CircleUserRound className="size-4 text-slate-500" />
                  Account
                </Menu.LinkItem>
                <Menu.LinkItem
                  href="/dashboard/notifications"
                  closeOnClick
                  onClick={closeMobileSidebar}
                  className="flex h-10 items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 data-highlighted:bg-slate-100"
                >
                  <Bell className="size-4 text-slate-500" />
                  Notifications
                </Menu.LinkItem>
                <div className="my-1 border-t border-slate-100" />
                <Menu.Item
                  onClick={handleSignOut}
                  className="flex h-10 w-full cursor-default items-center gap-3 rounded-md px-3 text-sm text-[#c82432] outline-none transition-colors hover:bg-red-50 focus-visible:bg-red-50 data-highlighted:bg-red-50"
                >
                  <LogOut className="size-4" />
                  Log out
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </SidebarFooter>
    </Sidebar>
  )
}