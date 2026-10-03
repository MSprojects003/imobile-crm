"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { supabase } from "@/lib/supabase"
import {
  canPerformDashboardAction,
  getDashboardRole,
  type DashboardAction,
  type DashboardRole,
} from "@/lib/user-limits"

export type CurrentUser = {
  fullName: string
  username: string
  phone: string
  imageUrl: string | null
  isAdmin: boolean
  isSubAdmin: boolean
  role: DashboardRole
}

type CurrentUserContextValue = {
  user: CurrentUser | null
  isLoading: boolean
  hasError: boolean
  can: (action: DashboardAction) => boolean
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!data.session) throw new Error("Sign in is required.")

        const response = await fetch("/api/auth", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store",
        })
        const result = await response.json() as {
          profile?: {
            fullName: string
            username: string
            phone: string
            imageUrl: string | null
            isAdmin: boolean
            isSubAdmin: boolean
          }
          error?: string
        }
        if (!response.ok || !result.profile) {
          throw new Error(result.error ?? "Could not load your account profile.")
        }

        const role = getDashboardRole({
          isAdmin: result.profile.isAdmin,
          isSubAdmin: result.profile.isSubAdmin,
        })
        if (!role) throw new Error("This account does not have dashboard access.")

        if (isMounted) {
          setUser({ ...result.profile, role })
          setHasError(false)
        }
      } catch (error) {
        console.error("Current account profile could not be loaded", error)
        if (isMounted) {
          setUser(null)
          setHasError(true)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadCurrentUser()
    return () => {
      isMounted = false
    }
  }, [])

  const value = useMemo<CurrentUserContextValue>(() => ({
    user,
    isLoading,
    hasError,
    can: (action) => canPerformDashboardAction(user?.role, action),
  }), [user, isLoading, hasError])

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext)
  if (!context) {
    throw new Error("useCurrentUser must be used inside CurrentUserProvider.")
  }
  return context
}

export function useCanPerform(action: DashboardAction) {
  return useCurrentUser().can(action)
}
