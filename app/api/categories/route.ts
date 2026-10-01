import "server-only"

import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { authorizeActiveAdmin, createAdminClient } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  let adminClient: SupabaseClient
  try {
    adminClient = createAdminClient()
  } catch {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 })
  }

  const authorization = await authorizeActiveAdmin(request, adminClient)
  if (!authorization.authorized) return authorization.response

  const { data, error } = await adminClient
    .from("categories")
    .select("id, name, description, image_url, created_at, is_deleted")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Category list query failed", { code: error.code })
    return NextResponse.json({ error: "Could not load categories." }, { status: 500 })
  }

  return NextResponse.json({ categories: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  let adminClient: SupabaseClient
  try {
    adminClient = createAdminClient()
  } catch {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 })
  }

  const authorization = await authorizeActiveAdmin(request, adminClient)
  if (!authorization.authorized) return authorization.response

  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Category ID is required." }, { status: 400 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid category update data." }, { status: 400 })
  }

  const update: { name?: string; description?: string | null; image_url?: string; is_deleted?: boolean } = {}
  const name = formData.get("name")
  const description = formData.get("description")
  const image = formData.get("image")
  const isDeleted = formData.get("is_deleted")

  if (name !== null) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
      return NextResponse.json({ error: "Category name must be between 1 and 80 characters." }, { status: 400 })
    }
    update.name = name.trim()
  }

  if (description !== null) {
    if (typeof description !== "string" || description.length > 500) {
      return NextResponse.json({ error: "Category description must be 500 characters or fewer." }, { status: 400 })
    }
    update.description = description.trim() || null
  }

  if (isDeleted !== null) {
    if (isDeleted !== "true" && isDeleted !== "false") {
      return NextResponse.json({ error: "Category status must be active or deactive." }, { status: 400 })
    }
    update.is_deleted = isDeleted === "true"
  }

  if (image !== null) {
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "Choose a category image." }, { status: 400 })
    }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(image.type)) {
      return NextResponse.json({ error: "Category image must be JPG, PNG, or WEBP." }, { status: 400 })
    }
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Category image must be 5 MB or smaller." }, { status: 400 })
    }

    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }
    const imagePath = `${randomUUID()}.${extensionByType[image.type]}`
    const storage = adminClient.storage.from("categories")
    const { error: uploadError } = await storage.upload(imagePath, image, {
      contentType: image.type,
      upsert: false,
    })

    if (uploadError) {
      console.error("Category image upload failed", { message: uploadError.message })
      return NextResponse.json({ error: "Could not upload the category image." }, { status: 500 })
    }

    const { data: publicImage } = storage.getPublicUrl(imagePath)
    update.image_url = publicImage.publicUrl
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No category changes were provided." }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from("categories")
    .update(update)
    .eq("id", id)
    .select("id, name, description, image_url, created_at, is_deleted")
    .single()

  if (error) {
    if (update.image_url) {
      const uploadedPath = new URL(update.image_url).pathname.split("/categories/").pop()
      if (uploadedPath) await adminClient.storage.from("categories").remove([uploadedPath])
    }
    console.error("Category update failed", { code: error.code })
    return NextResponse.json({ error: "Could not update the category." }, { status: 500 })
  }

  return NextResponse.json({ category: data })
}

export async function POST(request: NextRequest) {
  let adminClient: SupabaseClient
  try {
    adminClient = createAdminClient()
  } catch {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 })
  }

  const authorization = await authorizeActiveAdmin(request, adminClient)
  if (!authorization.authorized) return authorization.response

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid category form data." }, { status: 400 })
  }

  const name = formData.get("name")
  const description = formData.get("description")
  const image = formData.get("image")

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 })
  }
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Choose a category image." }, { status: 400 })
  }
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(image.type)) {
    return NextResponse.json({ error: "Category image must be JPG, PNG, or WEBP." }, { status: 400 })
  }
  if (image.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Category image must be 5 MB or smaller." }, { status: 400 })
  }

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }
  const imagePath = `${randomUUID()}.${extensionByType[image.type]}`
  const storage = adminClient.storage.from("categories")
  const { error: uploadError } = await storage.upload(imagePath, image, {
    contentType: image.type,
    upsert: false,
  })

  if (uploadError) {
    console.error("Category image upload failed", { message: uploadError.message })
    return NextResponse.json({ error: "Could not upload the category image. Check the categories storage bucket." }, { status: 500 })
  }

  const { data: publicImage } = storage.getPublicUrl(imagePath)
  const { data, error: insertError } = await adminClient
    .from("categories")
    .insert({
      name: name.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      image_url: publicImage.publicUrl,
    })
    .select("id, name, description, image_url, created_at, is_deleted")
    .single()

  if (insertError) {
    await storage.remove([imagePath])
    console.error("Category insert failed", { code: insertError.code, message: insertError.message })
    return NextResponse.json({ error: "Could not save the category. Check the categories table schema." }, { status: 500 })
  }

  return NextResponse.json({ category: data }, { status: 201 })
}