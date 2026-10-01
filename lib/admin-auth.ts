import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

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

export async function authorizeActiveAdmin(request: NextRequest, adminClient: SupabaseClient) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    return { authorized: false as const, response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !publishableKey) {
    return { authorized: false as const, response: NextResponse.json({ error: "Supabase client configuration is missing." }, { status: 500 }) }
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user?.phone) {
    return { authorized: false as const, response: NextResponse.json({ error: "Your session is invalid or has expired." }, { status: 401 }) }
  }

  const { data: adminProfiles, error: profileError } = await adminClient
    .from("users")
    .select("phone")
    .eq("status", true)
    .eq("is_admin", true)

  if (profileError) {
    return { authorized: false as const, response: NextResponse.json({ error: "Could not verify admin access." }, { status: 500 }) }
  }

  const normalizedAuthPhone = normalizeSriLankanPhone(authData.user.phone)
  const isAdmin = adminProfiles?.some((profile) =>
    profile.phone && normalizeSriLankanPhone(profile.phone) === normalizedAuthPhone
  )

  if (!isAdmin) {
    return { authorized: false as const, response: NextResponse.json({ error: "Admin access is required." }, { status: 403 }) }
  }

  return { authorized: true as const, response: null }
}