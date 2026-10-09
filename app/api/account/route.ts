import "server-only"

import { randomUUID } from "node:crypto"
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
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token)
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 500 }
    )
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } =
    await authClient.auth.getUser(token)
  if (authError || !authData.user?.phone) {
    return NextResponse.json(
      { error: "Your session is invalid or has expired." },
      { status: 401 }
    )
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
    return NextResponse.json(
      { error: "Could not load your account profile." },
      { status: 500 }
    )
  }

  const profile = users?.find(
    (candidate) =>
      candidate.phone &&
      normalizeSriLankanPhone(candidate.phone) === normalizedAuthPhone
  )

  if (!profile) {
    return NextResponse.json(
      { error: "An active account profile could not be found." },
      { status: 403 }
    )
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
      role:
        staffRecord?.role ||
        (profile.is_admin
          ? "Admin"
          : profile.is_sub_admin
            ? "Sub Admin"
            : "User"),
    },
  })
}

export async function PATCH(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token)
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 })

  let body: Record<string, unknown> = {}
  let profileImage: File | null = null
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    try {
      const formData = await request.formData()
      const image = formData.get("image")
      if (!(image instanceof File)) {
        return NextResponse.json(
          { error: "Choose a profile image." },
          { status: 400 }
        )
      }
      profileImage = image
    } catch {
      return NextResponse.json(
        { error: "Invalid profile image upload." },
        { status: 400 }
      )
    }
  } else {
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 500 }
    )
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } =
    await authClient.auth.getUser(token)
  if (authError || !authData.user?.phone) {
    return NextResponse.json(
      { error: "Your session is invalid or has expired." },
      { status: 401 }
    )
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const normalizedAuthPhone = normalizeSriLankanPhone(authData.user.phone)
  const { data: users, error: profileError } = await adminClient
    .from("users")
    .select("id, phone")
    .eq("status", true)

  if (profileError)
    return NextResponse.json(
      { error: "Could not load your account profile." },
      { status: 500 }
    )

  const profile = users?.find(
    (candidate) =>
      candidate.phone &&
      normalizeSriLankanPhone(candidate.phone) === normalizedAuthPhone
  )
  if (!profile)
    return NextResponse.json(
      { error: "An active account profile could not be found." },
      { status: 403 }
    )

  const userId = profile.id

  // Prepare updates
  const usersUpdate: Record<string, string> = {}
  const staffUpdate: Record<string, string> = {}

  if (typeof body.phone === "string") {
    return NextResponse.json(
      { error: "Verify the new phone number before saving it." },
      { status: 400 }
    )
  }

  if (typeof body.fullName === "string")
    usersUpdate.full_name = body.fullName.trim()
  if (typeof body.username === "string")
    usersUpdate.username = body.username.trim().toLowerCase()
  if (typeof body.imageUrl === "string")
    usersUpdate.profile_image_url = body.imageUrl

  if (typeof body.nic === "string") staffUpdate.nic = body.nic.trim()
  if (typeof body.address === "string")
    staffUpdate.address = body.address.trim()
  if (typeof body.dob === "string") staffUpdate.dob = body.dob.trim()

  let uploadedImagePath: string | null = null
  let uploadedImageUrl: string | null = null
  if (profileImage) {
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }
    const extension = extensionByType[profileImage.type]
    if (!extension || profileImage.size === 0) {
      return NextResponse.json(
        { error: "Profile image must be JPG, PNG, or WEBP." },
        { status: 400 }
      )
    }
    if (profileImage.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Profile image must be 5 MB or smaller." },
        { status: 400 }
      )
    }

    uploadedImagePath = `${userId}/${randomUUID()}.${extension}`
    const profileImages = adminClient.storage.from("profile_images")
    const { error: uploadError } = await profileImages.upload(
      uploadedImagePath,
      profileImage,
      { contentType: profileImage.type, upsert: false }
    )
    if (uploadError) {
      console.error("Profile image upload failed", {
        message: uploadError.message,
      })
      return NextResponse.json(
        { error: "Could not upload your profile image." },
        { status: 500 }
      )
    }

    uploadedImageUrl =
      profileImages.getPublicUrl(uploadedImagePath).data.publicUrl
    usersUpdate.profile_image_url = uploadedImageUrl
  }

  let staffProfileExists: boolean | null = null
  if (Object.keys(staffUpdate).length > 0) {
    const { data: staffData, error: staffLookupError } = await adminClient
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (staffLookupError) {
      console.error("Profile staff lookup failed", {
        code: staffLookupError.code,
      })
      return NextResponse.json(
        { error: "Could not load your staff profile." },
        { status: 500 }
      )
    }

    staffProfileExists = Boolean(staffData)
    if (!staffProfileExists && typeof body.nic === "string") {
      return NextResponse.json(
        {
          error:
            "Your account does not have a staff profile to save a NIC number.",
        },
        { status: 409 }
      )
    }
  }

  try {
    if (Object.keys(usersUpdate).length > 0) {
      const { error } = await adminClient
        .from("users")
        .update(usersUpdate)
        .eq("id", userId)
      if (error) throw error
    }

    if (Object.keys(staffUpdate).length > 0) {
      if (staffProfileExists) {
        const { error } = await adminClient
          .from("staff")
          .update(staffUpdate)
          .eq("user_id", userId)
        if (error) throw error
      } else {
        console.warn(
          "Attempted to update staff details for a user without a staff record.",
          userId
        )
      }
    }

    return NextResponse.json({
      ok: true,
      ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
    })
  } catch (error) {
    console.error("Profile update failed", error)
    if (uploadedImagePath) {
      const { error: cleanupError } = await adminClient.storage
        .from("profile_images")
        .remove([uploadedImagePath])
      if (cleanupError) {
        console.error(
          "Failed to clean up profile image after profile update failed",
          {
            message: cleanupError.message,
          }
        )
      }
    }
    return NextResponse.json(
      { error: "Could not update profile." },
      { status: 500 }
    )
  }
}
