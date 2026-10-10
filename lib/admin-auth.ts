import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import {
  ADMIN_ONLY_ACTION_MESSAGE,
  canPerformDashboardAction,
  getDashboardRole,
  type DashboardAction,
  type DashboardRole,
} from "@/lib/user-limits"

function normalizeSriLankanPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("0094")) return `+${digits.slice(2)}`
  if (digits.startsWith("94")) return `+${digits}`
  if (digits.startsWith("0")) return `+94${digits.slice(1)}`
  return `+94${digits}`
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !secretKey) throw new Error("Supabase server configuration is missing.")

  return createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type AuthorizedDashboardUser = {
  authorized: true
  response: null
  role: DashboardRole
  notificationUserId: string
}

type UnauthorizedDashboardUser = {
  authorized: false
  response: NextResponse
  role?: never
}

export async function authorizeDashboardUser(
  request: NextRequest,
  adminClient: SupabaseClient,
): Promise<AuthorizedDashboardUser | UnauthorizedDashboardUser> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    return { authorized: false, response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !publishableKey) {
    return { authorized: false, response: NextResponse.json({ error: "Supabase client configuration is missing." }, { status: 500 }) }
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user?.phone) {
    return { authorized: false, response: NextResponse.json({ error: "Your session is invalid or has expired." }, { status: 401 }) }
  }

  const { data: profiles, error: profileError } = await adminClient
    .from("users")
    .select("id, phone, is_admin, is_sub_admin")
    .eq("status", true)
    .or("is_admin.eq.true,is_sub_admin.eq.true")

  if (profileError) {
    return { authorized: false, response: NextResponse.json({ error: "Could not verify dashboard access." }, { status: 500 }) }
  }

  const normalizedAuthPhone = normalizeSriLankanPhone(authData.user.phone)
  const profile = profiles?.find((candidate) =>
    candidate.phone && normalizeSriLankanPhone(candidate.phone) === normalizedAuthPhone
  )
  const role = getDashboardRole({
    isAdmin: Boolean(profile?.is_admin),
    isSubAdmin: Boolean(profile?.is_sub_admin),
  })

  if (!profile || !role) {
    return { authorized: false, response: NextResponse.json({ error: "Admin access is required." }, { status: 403 }) }
  }

  return { authorized: true, response: null, role, notificationUserId: profile.id }
}

export async function authorizeDashboardAction(
  request: NextRequest,
  adminClient: SupabaseClient,
  action: DashboardAction,
) {
  const authorization = await authorizeDashboardUser(request, adminClient)
  if (!authorization.authorized) return authorization
  if (!canPerformDashboardAction(authorization.role, action)) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: ADMIN_ONLY_ACTION_MESSAGE }, { status: 403 }),
    }
  }
  return authorization
}

export async function authorizeDashboardRequest(
  request: NextRequest,
  action: DashboardAction,
) {
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 }),
    }
  }

  try {
    const authorization = await authorizeDashboardAction(request, adminClient, action)
    if (!authorization.authorized) return authorization
    return {
      authorized: true as const,
      adminClient,
      role: authorization.role,
      notificationUserId: authorization.notificationUserId,
    }
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined
    const message = error instanceof Error ? error.message : "Unknown authorization error"
    console.error("Dashboard request authorization failed", { code, message })
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Could not verify dashboard access." },
        { status: 500 },
      ),
    }
  }
}

export async function authorizeActiveAdmin(request: NextRequest, adminClient: SupabaseClient) {
  const authorization = await authorizeDashboardUser(request, adminClient)
  if (!authorization.authorized) return authorization
  if (authorization.role !== "admin") {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: ADMIN_ONLY_ACTION_MESSAGE }, { status: 403 }),
    }
  }
  return {
    authorized: true as const,
    adminClient,
    role: authorization.role,
    notificationUserId: authorization.notificationUserId,
  }
}
