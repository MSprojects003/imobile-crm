"use client"

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ADMIN_ONLY_ACTION_MESSAGE, type DashboardAction } from "@/lib/user-limits"
import { useCanPerform } from "@/components/custom/dashboard/current-user"

export function RestrictedAction({
  action,
  children,
}: {
  action: DashboardAction
  children: ReactNode
}) {
  const allowed = useCanPerform(action)

  if (allowed) return children

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ disabled?: boolean; tabIndex?: number }>, {
        disabled: true,
        tabIndex: -1,
      })
    : children

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-not-allowed [&>*]:pointer-events-none" />}>
          {control}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-center">
          {ADMIN_ONLY_ACTION_MESSAGE}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
