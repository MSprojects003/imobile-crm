"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Bell, Check } from "lucide-react"
import { Menu } from "@base-ui/react/menu"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs"
import { useSidebar } from "@/components/ui/sidebar"

import {
  NotificationCard,
  type NotificationCategory,
  type NotificationDetail,
  type NotificationType,
} from "./NotificationCard"

type NotificationFilter = "all" | "unread" | "read"
type ActivityFilter = "all" | NotificationCategory

interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: NotificationType
  category: NotificationCategory
  actor?: string
  details?: NotificationDetail[]
  read: boolean
}

const dummyNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "New order from Unity Mobiles",
    message: "Order #ORD-24091 for 12 units is waiting to be assigned to a representative. Confirm the shop contact and allocate stock before the 4:00 PM dispatch window closes.",
    time: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    type: "info",
    category: "order",
    actor: "Unity Mobiles · Colombo",
    details: [
      { label: "Order", value: "ORD-24091" },
      { label: "Shop", value: "Unity Mobiles, Colombo 03" },
      { label: "Items", value: "12 units · mixed SKUs" },
      { label: "Next step", value: "Assign a Western region rep" },
    ],
    read: false,
  },
  {
    id: "2",
    title: "Visit assigned to Nuwan Perera",
    message: "Shop visit at Metro Electronics is scheduled for today at 3:30 PM. The brief includes a stock count, pending order handover, and a photo check of the display bay.",
    time: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    type: "info",
    category: "assignment",
    actor: "Assigned by you",
    details: [
      { label: "Rep", value: "Nuwan Perera" },
      { label: "Shop", value: "Metro Electronics, Dehiwala" },
      { label: "Window", value: "Today, 3:30 PM – 5:00 PM" },
      { label: "Tasks", value: "Stock count, handover, display check" },
    ],
    read: false,
  },
  {
    id: "3",
    title: "Low stock on iPhone 16 Pro",
    message: "Only 3 units remain across active shops. Reorder before the next delivery cycle so Western and Southern routes are not short during weekend demand.",
    time: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
    type: "warning",
    category: "stock",
    actor: "Inventory watch",
    details: [
      { label: "SKU", value: "iPhone 16 Pro 256GB" },
      { label: "On hand", value: "3 units" },
      { label: "Threshold", value: "12 units" },
      { label: "Next step", value: "Raise purchase request" },
    ],
    read: false,
  },
  {
    id: "4",
    title: "Overdue field assignment",
    message: "Order #ORD-24078 at City Gadget Hub is 2 days past the visit deadline. The shop has called twice for delivery confirmation and the assigned rep has not checked in.",
    time: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    type: "error",
    category: "assignment",
    actor: "Kasun Fernando",
    details: [
      { label: "Order", value: "ORD-24078" },
      { label: "Shop", value: "City Gadget Hub, Nugegoda" },
      { label: "Rep", value: "Kasun Fernando" },
      { label: "Overdue", value: "2 days" },
    ],
    read: false,
  },
  {
    id: "5",
    title: "Shop visit completed",
    message: "Tharindu Silva marked the Bright Phone Gallery visit complete with stock confirmed. Display planogram photos were uploaded and no damaged units were reported.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    type: "success",
    category: "shop",
    actor: "Tharindu Silva",
    details: [
      { label: "Shop", value: "Bright Phone Gallery, Gampaha" },
      { label: "Rep", value: "Tharindu Silva" },
      { label: "Result", value: "Stock confirmed, 0 damages" },
      { label: "Evidence", value: "3 photos uploaded" },
    ],
    read: true,
  },
  {
    id: "6",
    title: "New shop registered",
    message: "Lanka Wireless — Kandy was added and is pending first product allocation. Complete the opening stock pack so the shop can start taking walk-in orders this week.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    type: "info",
    category: "shop",
    actor: "Shops",
    details: [
      { label: "Shop", value: "Lanka Wireless, Kandy" },
      { label: "Region", value: "Central" },
      { label: "Status", value: "Pending first allocation" },
      { label: "Next step", value: "Assign opening stock pack" },
    ],
    read: false,
  },
  {
    id: "7",
    title: "Rep checked in late",
    message: "Ishara Jayasuriya started the Galle route 47 minutes after the planned time. Two morning shop visits are now compressed into the afternoon window.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    type: "warning",
    category: "staff",
    actor: "Ishara Jayasuriya",
    details: [
      { label: "Rep", value: "Ishara Jayasuriya" },
      { label: "Route", value: "Galle coastal" },
      { label: "Delay", value: "47 minutes" },
      { label: "Impact", value: "2 morning visits shifted" },
    ],
    read: true,
  },
  {
    id: "8",
    title: "Samsung Galaxy S25 added",
    message: "The product is live in catalog and ready to assign to shop inventories. Pricing, warranty, and hero image are complete; only accessory bundles are still pending.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    type: "success",
    category: "catalog",
    actor: "Catalog",
    details: [
      { label: "Product", value: "Samsung Galaxy S25 256GB" },
      { label: "Status", value: "Live in catalog" },
      { label: "Ready", value: "Price, warranty, hero image" },
      { label: "Pending", value: "Accessory bundles" },
    ],
    read: true,
  },
  {
    id: "9",
    title: "Order delivered",
    message: "Order #ORD-24065 was marked delivered at Phone World, Negombo. The shop signed for 8 units and requested a follow-up visit for display stand replacement.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 34).toISOString(),
    type: "success",
    category: "order",
    actor: "Nuwan Perera",
    details: [
      { label: "Order", value: "ORD-24065" },
      { label: "Shop", value: "Phone World, Negombo" },
      { label: "Delivered", value: "8 units" },
      { label: "Follow-up", value: "Replace display stand" },
    ],
    read: true,
  },
  {
    id: "10",
    title: "New representative onboarded",
    message: "Malsha Fernando was added to the Western region staff roster. Complete device issue, route mapping, and first-week shop list before she starts field visits on Monday.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    type: "info",
    category: "staff",
    actor: "Team",
    details: [
      { label: "Rep", value: "Malsha Fernando" },
      { label: "Region", value: "Western" },
      { label: "Start", value: "Monday" },
      { label: "Next step", value: "Issue device and route list" },
    ],
    read: true,
  },
  {
    id: "11",
    title: "Brand Apple needs images",
    message: "3 catalog SKUs are live without brand artwork. Add images before the next shop sync so storefront cards and order sheets do not show placeholder art.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
    type: "warning",
    category: "catalog",
    actor: "Catalog review",
    details: [
      { label: "Brand", value: "Apple" },
      { label: "Missing", value: "3 SKU images" },
      { label: "Impact", value: "Shop sync and order sheets" },
      { label: "Next step", value: "Upload brand artwork" },
    ],
    read: true,
  },
  {
    id: "12",
    title: "Stock received at warehouse",
    message: "48 Pixel 9 units were added and can now be allocated to shops. Priority allocation is recommended for Colombo and Gampaha after last week's stock-outs.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    type: "success",
    category: "stock",
    actor: "Warehouse",
    details: [
      { label: "SKU", value: "Google Pixel 9 128GB" },
      { label: "Received", value: "48 units" },
      { label: "Priority", value: "Colombo, Gampaha" },
      { label: "Next step", value: "Allocate to shops" },
    ],
    read: true,
  },
]

const activityFilters: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "order", label: "Orders" },
  { value: "assignment", label: "Field work" },
  { value: "stock", label: "Inventory" },
  { value: "shop", label: "Shops" },
  { value: "staff", label: "Team" },
  { value: "catalog", label: "Catalog" },
]

type NotificationsContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  unreadCount: number
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error("Notifications controls must be used inside NotificationsProvider.")
  }
  return context
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString("en-LK", { day: "numeric", month: "short" })
}

function getTimeGroup(iso: string) {
  const date = new Date(iso)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 7)

  if (date >= startOfToday) return "Today"
  if (date >= startOfYesterday) return "Yesterday"
  if (date >= startOfWeek) return "This week"
  return "Earlier"
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ed1c2e] px-1 text-[10px] font-semibold text-white">
      {count > 9 ? "9+" : count}
    </span>
  )
}

export function NotificationsMenuItem() {
  const { setOpen, unreadCount } = useNotifications()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Menu.Item
      onClick={() => {
        if (isMobile) setOpenMobile(false)
        setOpen(true)
      }}
      className="flex h-10 w-full cursor-default items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 data-highlighted:bg-slate-100"
    >
      <Bell className="size-4 text-slate-500" />
      Notifications
      {unreadCount > 0 && (
        <span className="ml-auto">
          <UnreadBadge count={unreadCount} />
        </span>
      )}
    </Menu.Item>
  )
}

export function NotificationsBellButton() {
  const { open, setOpen, unreadCount } = useNotifications()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={open ? "Close notifications" : "Open notifications"}
      onClick={() => setOpen(!open)}
      className="relative text-slate-600 hover:text-slate-900"
    >
      <Bell className="size-5" aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 text-sm font-bold leading-none text-[#ed1c2e] sm:top-0.5 sm:right-0.5 sm:flex sm:h-5 sm:min-w-5 sm:items-center sm:justify-center sm:rounded-full sm:bg-[#ed1c2e] sm:px-1 sm:text-[10px] sm:text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  )
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [activity, setActivity] = useState<ActivityFilter>("all")
  const [notifications, setNotifications] = useState(dummyNotifications)

  const unreadCount = notifications.filter((item) => !item.read).length

  const filteredNotifications = notifications.filter((item) => {
    const matchesReadState =
      filter === "all" || (filter === "unread" ? !item.read : item.read)
    const matchesActivity = activity === "all" || item.category === activity
    return matchesReadState && matchesActivity
  })

  const groupedNotifications = useMemo(() => {
    const groups: { label: string; items: NotificationItem[] }[] = []

    for (const item of filteredNotifications) {
      const label = getTimeGroup(item.time)
      const existing = groups.find((group) => group.label === label)
      if (existing) existing.items.push(item)
      else groups.push({ label, items: [item] })
    }

    return groups
  }, [filteredNotifications])

  function markAsRead(id: string) {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
  }

  function markAllAsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
  }

  return (
    <NotificationsContext.Provider value={{ open, setOpen, unreadCount }}>
      {children}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 overflow-hidden p-0 data-[side=right]:w-[86vw] sm:max-w-md sm:data-[side=right]:w-full lg:max-w-lg"
        >
          <SheetHeader className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="text-base font-semibold text-slate-900">Inbox</SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Live operations across orders, shops, stock, and field work.
                </SheetDescription>
              </div>
              {unreadCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-slate-600"
                  onClick={markAllAsRead}
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  Mark all read
                </Button>
              )}
            </div>

            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as NotificationFilter)}
              className="mt-4"
            >
              <TabsList className="w-full">
                <TabsTab value="all" className="flex-1 text-xs">
                  All
                </TabsTab>
                <TabsTab value="unread" className="flex-1 text-xs">
                  Unread
                  {unreadCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-[#ed1c2e] px-1.5 py-px text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </TabsTab>
                <TabsTab value="read" className="flex-1 text-xs">
                  Read
                </TabsTab>
              </TabsList>
            </Tabs>

            <div className="mt-3 md:hidden">
              <p className="mb-1.5 text-[11px] font-medium text-slate-500">Category</p>
              <Select
                value={activity}
                onValueChange={(value: ActivityFilter | null) => {
                  if (value) setActivity(value)
                }}
              >
                <SelectTrigger aria-label="Filter by category" className="h-9 w-full min-w-0 text-xs">
                  <SelectValue placeholder="All activity" />
                </SelectTrigger>
                <SelectContent>
                  {activityFilters.map((item) => (
                    <SelectItem key={item.value} value={item.value} className="text-xs">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 hidden gap-1.5 overflow-x-auto pb-0.5 md:flex">
              {activityFilters.map((item) => {
                const isActive = activity === item.value

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setActivity(item.value)}
                    className={
                      isActive
                        ? "shrink-0 rounded-full bg-[#ed1c2e] px-2.5 py-1 text-[11px] font-medium text-white"
                        : "shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    }
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Bell className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-slate-700">
                  {filter === "unread" ? "You are all caught up" : "No notifications in this view"}
                </p>
                <p className="max-w-[220px] text-xs leading-5 text-slate-400">
                  New order, stock, shop, and field updates will appear here.
                </p>
              </div>
            ) : (
              groupedNotifications.map((group) => (
                <section key={group.label}>
                  <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase backdrop-blur">
                    {group.label}
                  </div>
                  <div>
                    {group.items.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        id={notification.id}
                        title={notification.title}
                        message={notification.message}
                        time={formatTime(notification.time)}
                        type={notification.type}
                        category={notification.category}
                        actor={notification.actor}
                        details={notification.details}
                        read={notification.read}
                        onClick={() => markAsRead(notification.id)}
                        onMarkRead={() => markAsRead(notification.id)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </NotificationsContext.Provider>
  )
}
