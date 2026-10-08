"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, Check, LoaderCircle, MessageSquareText } from "lucide-react"
import { Menu } from "@base-ui/react/menu"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  fetchAdminNotifications,
  getAdminNotificationUserId,
  updateAdminNotification,
  type AdminNotification,
} from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import { fetchSmsMonthlySummary } from "@/lib/sms-summary-client"
import {
  NotificationCard,
  type NotificationCategory,
  type NotificationType,
} from "./NotificationCard"

type NotificationFilter = "all" | "unread" | "read"
type ActivityFilter = "all" | NotificationCategory
type NotificationItem = {
  id: string
  title: string
  message: string
  time: string
  type: NotificationType
  category: NotificationCategory
  actor?: string
  read: boolean
}

const notificationQueryKey = ["admin-notifications"]
const smsSummaryQueryKey = ["sms-monthly-summary"]
const activityFilters: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "order", label: "Orders" },
  { value: "assignment", label: "Field work" },
  { value: "stock", label: "Inventory" },
  { value: "shop", label: "Shops" },
  { value: "staff", label: "Team" },
  { value: "other", label: "Other" },
]

type NotificationsContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  unreadCount: number
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) throw new Error("Notifications controls must be used inside NotificationsProvider.")
  return context
}

function toNotificationItem(notification: AdminNotification): NotificationItem {
  const notificationType = notification.type?.toLowerCase() ?? ""
  const category: NotificationCategory = notificationType.includes("order")
    ? "order"
    : notificationType.includes("shop")
      ? "shop"
      : notificationType.includes("staff")
        ? "staff"
        : notificationType.includes("work") || notificationType.includes("assign")
          ? "assignment"
          : notificationType.includes("stock")
            ? "stock"
            : "other"

  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    time: notification.created_at,
    type: "info",
    category,
    actor: category === "assignment" ? "Assigned work" : undefined,
    read: notification.is_read,
  }
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)

  if (date >= today) return "Today"
  if (date >= yesterday) return "Yesterday"
  if (date >= lastWeek) return "This week"
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

export function NotificationsMenuItem({ onSelect }: { onSelect: () => void }) {
  const { setOpen, unreadCount } = useNotifications()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Menu.Item
      onClick={() => {
        setOpen(true)
        onSelect()
        if (isMobile) setOpenMobile(false)
      }}
      className="flex h-10 w-full cursor-default items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 data-highlighted:bg-slate-100"
    >
      <Bell className="size-4 text-slate-500" />
      Notifications
      {unreadCount > 0 && <span className="ml-auto"><UnreadBadge count={unreadCount} /></span>}
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

export function SmsMonthlySummaryButton() {
  const summaryQuery = useQuery({
    queryKey: smsSummaryQueryKey,
    queryFn: fetchSmsMonthlySummary,
    refetchInterval: 60_000,
  })
  const summary = summaryQuery.data
  const currentMonthCount = summary?.currentCount
  const months = summary?.months ?? []
  const errorMessage = summaryQuery.error instanceof Error
    ? summaryQuery.error.message
    : "Could not load SMS counts."

  return (
    <div>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label={summaryQuery.isError
                ? "SMS counts unavailable"
                : `SMS sent this month: ${currentMonthCount ?? "loading"}`}
              title={summaryQuery.isError ? errorMessage : undefined}
              className="relative h-9 min-w-9 gap-2 border-slate-200 px-2 text-slate-600 md:px-3"
            />
          }
        >
          <MessageSquareText className="size-4 text-slate-500" aria-hidden="true" />
          <span className="hidden text-xs font-medium md:inline">SMS</span>
          <span className="hidden min-w-5 rounded-full bg-slate-100 px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-slate-700 md:inline-block">
            {currentMonthCount ?? (summaryQuery.isPending ? "…" : "—")}
          </span>
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ed1c2e] px-1 text-[9px] font-semibold leading-none text-white md:hidden">
            {currentMonthCount === undefined
              ? (summaryQuery.isPending ? "…" : "!")
              : currentMonthCount > 99 ? "99+" : currentMonthCount}
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 overflow-hidden p-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">SMS activity</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Monthly sent counts{summary ? ` · ${summary.fiscalYear}–${summary.fiscalYear + 1}` : ""}
            </p>
          </div>
          {summaryQuery.isPending ? (
            <div role="status" className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-slate-500">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Loading SMS counts...
            </div>
          ) : summaryQuery.isError ? (
            <p role="alert" className="px-4 py-5 text-xs text-rose-700">{errorMessage}</p>
          ) : summary ? (
            <>
              <div className="max-h-72 overflow-y-auto px-2 py-1.5">
                {months.map(({ year, month, count }) => {
                  const monthName = new Intl.DateTimeFormat("en", {
                    month: "long",
                    timeZone: "UTC",
                  }).format(new Date(Date.UTC(year, month - 1, 1)))
                  const isCurrentMonth = year === summary.currentYear && month === summary.currentMonth

                  return (
                    <div
                      key={`${year}-${month}`}
                      className={isCurrentMonth
                        ? "flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-2"
                        : "flex items-center justify-between rounded-md px-2.5 py-2"}
                    >
                      <span className="text-sm text-slate-700">{monthName} {year}</span>
                      <span className="flex items-center gap-2">
                        {isCurrentMonth && (
                          <span className="text-[10px] font-medium text-slate-500">This month</span>
                        )}
                        <span className="min-w-7 text-right text-sm font-semibold tabular-nums text-slate-900">
                          {count.toLocaleString()}
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                <span className="text-xs font-medium text-slate-600">October–September total</span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {summary.total.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <div role="status" className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-slate-500">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Loading SMS counts...
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [activity, setActivity] = useState<ActivityFilter>("all")
  const [actionError, setActionError] = useState("")
  const [realtimeError, setRealtimeError] = useState("")
  const notificationsQuery = useQuery({
    queryKey: notificationQueryKey,
    queryFn: fetchAdminNotifications,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    let isActive = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function subscribeToNotifications() {
      try {
        const recipientId = await getAdminNotificationUserId()
        if (!isActive) return

        channel = supabase
          .channel(`notifications:${recipientId}`, { config: { private: true } })
          .on("broadcast", { event: "notification_created" }, () => {
            void queryClient.invalidateQueries({ queryKey: notificationQueryKey })
          })
          .subscribe((status, subscriptionError) => {
            if (!isActive) return
            if (status === "SUBSCRIBED") {
              setRealtimeError("")
              void queryClient.invalidateQueries({ queryKey: notificationQueryKey })
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              const message = subscriptionError?.message ??
                `Notification Realtime subscription ${status.toLowerCase().replace("_", " ")}.`
              setRealtimeError(message)
              console.error("Unable to subscribe to admin notification updates:", subscriptionError ?? message)
            }
          })
      } catch (error) {
        if (!isActive) return
        const message = error instanceof Error
          ? error.message
          : "Unable to initialize notification updates."
        setRealtimeError(message)
        console.error("Unable to initialize admin notification updates:", error)
      }
    }

    void subscribeToNotifications()
    return () => {
      isActive = false
      if (channel) void supabase.removeChannel(channel)
    }
  }, [queryClient])

  const updateMutation = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      updateAdminNotification(id, isRead),
    onMutate: async ({ id, isRead }) => {
      await queryClient.cancelQueries({ queryKey: notificationQueryKey })
      const previous = queryClient.getQueryData<AdminNotification[]>(notificationQueryKey)
      queryClient.setQueryData<AdminNotification[]>(notificationQueryKey, (current) =>
        current?.map((notification) => notification.id === id
          ? { ...notification, is_read: isRead }
          : notification)
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(notificationQueryKey, context.previous)
      setActionError(error instanceof Error ? error.message : "Could not update notification.")
    },
    onSuccess: () => setActionError(""),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationQueryKey }),
  })

  const notifications = (notificationsQuery.data ?? []).map(toNotificationItem)
  const unreadCount = notifications.filter((item) => !item.read).length
  const filteredNotifications = notifications.filter((item) => {
    const matchesRead = filter === "all" || (filter === "unread" ? !item.read : item.read)
    return matchesRead && (activity === "all" || item.category === activity)
  })
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; items: NotificationItem[] }[] = []
    for (const item of filteredNotifications) {
      const label = getTimeGroup(item.time)
      const group = groups.find((entry) => entry.label === label)
      if (group) group.items.push(item)
      else groups.push({ label, items: [item] })
    }
    return groups
  }, [filteredNotifications])

  async function markAllAsRead() {
    setActionError("")
    const unread = notifications.filter((item) => !item.read)
    const results = await Promise.allSettled(
      unread.map((item) => updateAdminNotification(item.id, true))
    )
    const failureCount = results.filter((result) => result.status === "rejected").length
    if (failureCount > 0) {
      setActionError(`Could not mark ${failureCount} notification${failureCount === 1 ? "" : "s"} as read.`)
    }
    await queryClient.invalidateQueries({ queryKey: notificationQueryKey })
  }

  const queryError = notificationsQuery.error instanceof Error
    ? notificationsQuery.error.message
    : "Could not load notifications."

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
                  Work assignments and dashboard updates.
                </SheetDescription>
              </div>
              {unreadCount > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs text-slate-600" onClick={() => void markAllAsRead()}>
                  <Check className="size-3.5" aria-hidden="true" />
                  Mark all read
                </Button>
              )}
            </div>

            <Tabs value={filter} onValueChange={(value) => setFilter(value as NotificationFilter)} className="mt-4">
              <TabsList className="w-full">
                <TabsTab value="all" className="flex-1 text-xs">All</TabsTab>
                <TabsTab value="unread" className="flex-1 text-xs">
                  Unread{unreadCount > 0 && <span className="ml-1.5 rounded-full bg-[#ed1c2e] px-1.5 py-px text-[10px] font-semibold text-white">{unreadCount}</span>}
                </TabsTab>
                <TabsTab value="read" className="flex-1 text-xs">Read</TabsTab>
              </TabsList>
            </Tabs>

            <div className="mt-3 md:hidden">
              <p className="mb-1.5 text-[11px] font-medium text-slate-500">Category</p>
              <Select value={activity} onValueChange={(value: ActivityFilter | null) => value && setActivity(value)}>
                <SelectTrigger aria-label="Filter by category" className="h-9 w-full min-w-0 text-xs">
                  <SelectValue placeholder="All activity" />
                </SelectTrigger>
                <SelectContent>
                  {activityFilters.map((item) => <SelectItem key={item.value} value={item.value} className="text-xs">{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 hidden gap-1.5 overflow-x-auto pb-0.5 md:flex">
              {activityFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActivity(item.value)}
                  className={activity === item.value
                    ? "shrink-0 rounded-full bg-[#ed1c2e] px-2.5 py-1 text-[11px] font-medium text-white"
                    : "shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {(actionError || realtimeError || notificationsQuery.isError) && (
              <div role="alert" className="m-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {actionError || (notificationsQuery.isError ? queryError : realtimeError)}
              </div>
            )}
            {notificationsQuery.isPending ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Bell className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-slate-700">
                  {filter === "unread" ? "You are all caught up" : "No notifications in this view"}
                </p>
                <p className="max-w-[220px] text-xs leading-5 text-slate-400">
                  New assignments and dashboard updates will appear here.
                </p>
              </div>
            ) : groupedNotifications.map((group) => (
              <section key={group.label}>
                <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase backdrop-blur">
                  {group.label}
                </div>
                {group.items.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    {...notification}
                    time={formatTime(notification.time)}
                    onClick={() => !notification.read && updateMutation.mutate({ id: notification.id, isRead: true })}
                    onMarkRead={() => updateMutation.mutate({ id: notification.id, isRead: true })}
                  />
                ))}
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </NotificationsContext.Provider>
  )
}
