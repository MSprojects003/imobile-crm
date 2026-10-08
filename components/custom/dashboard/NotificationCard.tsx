"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Bell,
  Boxes,
  Check,
  ClipboardList,
  Store,
  UsersRound,
} from "lucide-react"
import { cn } from "cn"

export type NotificationCategory =
  | "order"
  | "assignment"
  | "stock"
  | "shop"
  | "staff"
  | "other"

export type NotificationType = "info" | "success" | "warning" | "error"

export interface NotificationDetail {
  label: string
  value: string
}

interface NotificationCardProps {
  id: string
  title: string
  message: string
  time: string
  type: NotificationType
  category: NotificationCategory
  actor?: string
  details?: NotificationDetail[]
  read: boolean
  onClick?: () => void
  onMarkRead?: () => void
}

const categoryMeta: Record<
  NotificationCategory,
  { label: string; icon: typeof Bell; className: string }
> = {
  order: {
    label: "Order",
    icon: ClipboardList,
    className: "bg-sky-50 text-sky-700",
  },
  assignment: {
    label: "Field work",
    icon: ClipboardList,
    className: "bg-violet-50 text-violet-700",
  },
  stock: {
    label: "Inventory",
    icon: AlertTriangle,
    className: "bg-amber-50 text-amber-700",
  },
  shop: {
    label: "Shop",
    icon: Store,
    className: "bg-teal-50 text-teal-700",
  },
  staff: {
    label: "Team",
    icon: UsersRound,
    className: "bg-indigo-50 text-indigo-700",
  },
  other: {
    label: "Other",
    icon: Bell,
    className: "bg-slate-100 text-slate-700",
  },
}

export function NotificationCard({
  title,
  message,
  time,
  category,
  actor,
  details,
  read,
  onClick,
  onMarkRead,
}: NotificationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const meta = categoryMeta[category]
  const Icon = meta.icon
  const hasExtraDetails = (details?.length ?? 0) > 0

  return (
    <article
      className={cn(
        "group relative flex gap-3 border-b border-slate-100 px-4 py-3.5 transition-colors last:border-b-0",
        read ? "bg-white hover:bg-slate-50" : "bg-[#fff6f6] hover:bg-[#ffefef]"
      )}
    >
      {!read && (
        <span className="absolute inset-y-0 left-0 w-0.5 bg-[#ed1c2e]" aria-hidden="true" />
      )}

      <button
        type="button"
        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full outline-none"
        onClick={onClick}
        aria-label={title}
      >
        <span className={cn("grid size-9 place-items-center rounded-full", meta.className)}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className={cn(
              "text-left text-sm leading-5 outline-none",
              read ? "font-medium text-slate-800" : "font-semibold text-slate-900"
            )}
            onClick={onClick}
          >
            {title}
          </button>
          <time className="shrink-0 pt-0.5 text-[11px] text-slate-400">{time}</time>
        </div>

        <p
          className={cn(
            "mt-0.5 text-xs leading-5",
            expanded ? "" : "line-clamp-2",
            read ? "text-slate-500" : "text-slate-600"
          )}
        >
          {message}
        </p>

        {expanded && hasExtraDetails && (
          <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-md border border-slate-100 bg-white/80 px-3 py-2.5">
            {details?.map((item) => (
              <div key={`${item.label}-${item.value}`} className="contents">
                <dt className="text-[11px] font-medium text-slate-400">{item.label}</dt>
                <dd className="truncate text-[11px] text-slate-700">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", meta.className)}>
            {meta.label}
          </span>
          {actor && (
            <span className="truncate text-[11px] text-slate-400">{actor}</span>
          )}
          <button
            type="button"
            aria-expanded={expanded}
            className="text-[11px] font-medium text-[#c82432] hover:underline"
            onClick={(event) => {
              event.stopPropagation()
              if (!expanded) onClick?.()
              setExpanded((current) => !current)
            }}
          >
            {expanded ? "See less" : "See more"}
          </button>
          {!read && (
            <span className="ml-auto size-1.5 rounded-full bg-[#ed1c2e]" aria-label="Unread" />
          )}
        </div>
      </div>

      {!read && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onMarkRead?.()
          }}
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-slate-400 opacity-0 transition-opacity hover:bg-white hover:text-slate-700 group-hover:opacity-100"
          aria-label="Mark as read"
        >
          <Check className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </article>
  )
}
