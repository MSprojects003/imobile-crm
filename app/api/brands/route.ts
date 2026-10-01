import "server-only"

import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { authorizeActiveAdmin, createAdminClient } from "@/lib/admin-auth"

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function getImageError(image: FormDataEntryValue | null) {
  if (!(image instanceof File) || image.size === 0) return "Choose a brand image."
  if (!imageTypes.has(image.type)) return "Brand image must be JPG, PNG, or WEBP."
  if (image.size > 5 * 1024 * 1024) return "Brand image must be 5 MB or smaller."
  return null
}

async function getAuthorizedAdmin(request: NextRequest) {
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return { authorized: false as const, response: NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 }) }
  }

  const authorization = await authorizeActiveAdmin(request, adminClient)
  if (!authorization.authorized) return authorization
  return { authorized: true as const, adminClient }
}

export async function GET(request: NextRequest) {
  const authorization = await getAuthorizedAdmin(request)
  if (!authorization.authorized) return authorization.response

  const { data, error } = await authorization.adminClient
    .from("brands")
    .select("id, name, description, image_url, created_at, is_deleted")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Brand list query failed", { code: error.code })
    return NextResponse.json({ error: "Could not load brands." }, { status: 500 })
  }

  return NextResponse.json({ brands: data ?? [] })
}

export async function POST(request: NextRequest) {
  const authorization = await getAuthorizedAdmin(request)
  if (!authorization.authorized) return authorization.response

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid brand form data." }, { status: 400 })
  }

  const name = formData.get("name")
  const description = formData.get("description")
  const image = formData.get("image")
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    return NextResponse.json({ error: "Brand name must be between 1 and 80 characters." }, { status: 400 })
  }
  const imageError = getImageError(image)
  if (imageError) return NextResponse.json({ error: imageError }, { status: 400 })
  if (typeof description !== "string" || description.length > 500) {
    return NextResponse.json({ error: "Brand description must be 500 characters or fewer." }, { status: 400 })
  }

  const brandImage = image as File
  const imagePath = `${randomUUID()}.${extensionByType[brandImage.type]}`
  const storage = authorization.adminClient.storage.from("brands")
  const { error: uploadError } = await storage.upload(imagePath, brandImage, {
    contentType: brandImage.type,
    upsert: false,
  })
  if (uploadError) {
    console.error("Brand image upload failed", { message: uploadError.message })
    return NextResponse.json({ error: "Could not upload the brand image. Check the brands storage bucket." }, { status: 500 })
  }

  const { data: publicImage } = storage.getPublicUrl(imagePath)
  const { data, error } = await authorization.adminClient
    .from("brands")
    .insert({
      name: name.trim(),
      description: description.trim() || null,
      image_url: publicImage.publicUrl,
    })
    .select("id, name, description, image_url, created_at, is_deleted")
    .single()

  if (error) {
    await storage.remove([imagePath])
    console.error("Brand insert failed", { code: error.code })
    return NextResponse.json({ error: "Could not save the brand. Check the brands table schema." }, { status: 500 })
  }

  return NextResponse.json({ brand: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const authorization = await getAuthorizedAdmin(request)
  if (!authorization.authorized) return authorization.response

  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Brand ID is required." }, { status: 400 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid brand update data." }, { status: 400 })
  }

  const update: { name?: string; description?: string | null; image_url?: string; is_deleted?: boolean } = {}
  const name = formData.get("name")
  const description = formData.get("description")
  const image = formData.get("image")
  const isDeleted = formData.get("is_deleted")

  if (name !== null) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
      return NextResponse.json({ error: "Brand name must be between 1 and 80 characters." }, { status: 400 })
    }
    update.name = name.trim()
  }
  if (description !== null) {
    if (typeof description !== "string" || description.length > 500) {
      return NextResponse.json({ error: "Brand description must be 500 characters or fewer." }, { status: 400 })
    }
    update.description = description.trim() || null
  }
  if (isDeleted !== null) {
    if (isDeleted !== "true" && isDeleted !== "false") {
      return NextResponse.json({ error: "Brand status must be active or deactive." }, { status: 400 })
    }
    update.is_deleted = isDeleted === "true"
  }
  if (image !== null) {
    const imageError = getImageError(image)
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 })

    const brandImage = image as File
    const imagePath = `${randomUUID()}.${extensionByType[brandImage.type]}`
    const storage = authorization.adminClient.storage.from("brands")
    const { error: uploadError } = await storage.upload(imagePath, brandImage, {
      contentType: brandImage.type,
      upsert: false,
    })
    if (uploadError) {
      console.error("Brand image upload failed", { message: uploadError.message })
      return NextResponse.json({ error: "Could not upload the brand image." }, { status: 500 })
    }
    const { data: publicImage } = storage.getPublicUrl(imagePath)
    update.image_url = publicImage.publicUrl
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No brand changes were provided." }, { status: 400 })
  }

  const { data, error } = await authorization.adminClient
    .from("brands")
    .update(update)
    .eq("id", id)
    .select("id, name, description, image_url, created_at, is_deleted")
    .single()

  if (error) {
    if (update.image_url) {
      const uploadedPath = new URL(update.image_url).pathname.split("/brands/").pop()
      if (uploadedPath) await authorization.adminClient.storage.from("brands").remove([uploadedPath])
    }
    console.error("Brand update failed", { code: error.code })
    return NextResponse.json({ error: "Could not update the brand." }, { status: 500 })
  }

  return NextResponse.json({ brand: data })
}