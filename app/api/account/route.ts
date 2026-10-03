import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function normalizeSriLankanPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("0094")) return `+${digits.slice(2)}`
  if (digits.startsWith("94")) return `+${digits}`
  if (digits.startsWith("0")) return `+94${digits.slice(1)}`
  return `+94${digits}`
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: "Sign in is required." }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 500 })
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user?.phone) {
    return NextResponse.json({ error: "Your session is invalid or has expired." }, { status: 401 })
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const normalizedAuthPhone = normalizeSriLankanPhone(authData.user.phone)
  
  const { data: users, error: profileError } = await adminClient
    .from("users")
    .select("*, staff(*)")
    .eq("status", true)

  if (profileError) {
    return NextResponse.json({ error: "Could not load your account profile." }, { status: 500 })
  }

  const profile = users?.find((candidate) =>
    candidate.phone && normalizeSriLankanPhone(candidate.phone) === normalizedAuthPhone
  )

  if (!profile) {
    return NextResponse.json({ error: "An active account profile could not be found." }, { status: 403 })
  }

  const staffRecord = profile.staff?.[0] || null

  return NextResponse.json({
    profile: {
      userId: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      phone: profile.phone,
      imageUrl: profile.profile_image_url,
      isAdmin: Boolean(profile.is_admin),
      isSubAdmin: Boolean(profile.is_sub_admin),
      joinedDate: profile.created_at,
      nic: staffRecord?.nic || null,
      dob: staffRecord?.dob || null,
      address: staffRecord?.address || null,
      role: staffRecord?.role || (profile.is_admin ? "Admin" : profile.is_sub_admin ? "Sub Admin" : "User"),
    },
  })
}

export async function PATCH(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: "Sign in is required." }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 500 })
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user?.phone) {
    return NextResponse.json({ error: "Your session is invalid or has expired." }, { status: 401 })
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const normalizedAuthPhone = normalizeSriLankanPhone(authData.user.phone)
  const { data: users, error: profileError } = await adminClient
    .from("users")
    .select("id, phone")
    .eq("status", true)

  if (profileError) return NextResponse.json({ error: "Could not load your account profile." }, { status: 500 })

  const profile = users?.find((candidate) => candidate.phone && normalizeSriLankanPhone(candidate.phone) === normalizedAuthPhone)
  if (!profile) return NextResponse.json({ error: "An active account profile could not be found." }, { status: 403 })

  const userId = profile.id
  
  // Prepare updates
  const usersUpdate: Record<string, any> = {}
  const staffUpdate: Record<string, any> = {}
  
  if (typeof body.fullName === "string") usersUpdate.full_name = body.fullName.trim()
  if (typeof body.phone === "string") usersUpdate.phone = body.phone.trim()
  if (typeof body.imageUrl === "string") usersUpdate.profile_image_url = body.imageUrl
  
  if (typeof body.nic === "string") staffUpdate.nic = body.nic.trim()
  if (typeof body.address === "string") staffUpdate.address = body.address.trim()
  if (typeof body.dob === "string") staffUpdate.dob = body.dob.trim()

  try {
    if (Object.keys(usersUpdate).length > 0) {
      const { error } = await adminClient.from("users").update(usersUpdate).eq("id", userId)
      if (error) throw error
    }
    
    if (Object.keys(staffUpdate).length > 0) {
      const { data: staffData } = await adminClient.from("staff").select("id").eq("user_id", userId).maybeSingle()
      
      if (staffData) {
        const { error } = await adminClient.from("staff").update(staffUpdate).eq("user_id", userId)
        if (error) throw error
      } else {
        console.warn("Attempted to update staff details for a user without a staff record.", userId)
      }
    }
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Profile update failed", error)
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 })
  }
}
