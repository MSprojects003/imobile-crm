import "server-only"

import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { authorizeActiveAdmin, createAdminClient } from "@/lib/admin-auth"
import type { ProductPriceTier, ProductPricingType } from "@/lib/api/products"

const MAX_IMAGES = 8
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function readJsonArray<T>(value: string, fieldName: string): T[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`Invalid ${fieldName} data.`)
  }
  if (!Array.isArray(parsed)) throw new Error(`Invalid ${fieldName} data.`)
  return parsed as T[]
}

function isPriceTier(value: unknown): value is ProductPriceTier {
  if (!value || typeof value !== "object") return false
  const tier = value as Record<string, unknown>
  return (
    Number.isInteger(tier.startQty) &&
    Number(tier.startQty) >= 1 &&
    (tier.endQty === null ||
      (Number.isInteger(tier.endQty) &&
        Number(tier.endQty) >= Number(tier.startQty))) &&
    typeof tier.price === "number" &&
    Number.isFinite(tier.price) &&
    tier.price >= 0
  )
}

export async function POST(request: NextRequest) {
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: "Supabase server configuration is missing." },
      { status: 500 }
    )
  }

  const authorization = await authorizeActiveAdmin(request, adminClient)
  if (!authorization.authorized) return authorization.response

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "Invalid product form data." },
      { status: 400 }
    )
  }

  const name = readString(formData, "name")
  const modelNumber = readString(formData, "model_number")
  const model = readString(formData, "model")
  const category = readString(formData, "category")
  const brand = readString(formData, "brand")
  const description = readString(formData, "description")
  const yearText = readString(formData, "manufactured_year")
  const pricingType = readString(formData, "pricing_type")
  const fixedPriceText = readString(formData, "fixed_price")

  if (!name || name.length > 100) {
    return NextResponse.json(
      { error: "Product name must be between 1 and 100 characters." },
      { status: 400 }
    )
  }
  if (!modelNumber || modelNumber.length > 60) {
    return NextResponse.json(
      { error: "Model number must be between 1 and 60 characters." },
      { status: 400 }
    )
  }
  if (model.length > 60) {
    return NextResponse.json(
      { error: "Model must be 60 characters or fewer." },
      { status: 400 }
    )
  }
  if (!category || !brand) {
    return NextResponse.json(
      { error: "Select a category and brand." },
      { status: 400 }
    )
  }
  if (!description || description.length > 500) {
    return NextResponse.json(
      { error: "Description must be between 1 and 500 characters." },
      { status: 400 }
    )
  }
  if (pricingType !== "fixed" && pricingType !== "bulk") {
    return NextResponse.json(
      { error: "Choose a valid pricing type." },
      { status: 400 }
    )
  }

  let manufacturedYear: number | null = null
  if (yearText) {
    manufacturedYear = Number(yearText)
    if (
      !Number.isInteger(manufacturedYear) ||
      manufacturedYear < 1950 ||
      manufacturedYear > new Date().getFullYear()
    ) {
      return NextResponse.json(
        { error: "Enter a valid manufactured year." },
        { status: 400 }
      )
    }
  }

  let specifications: string[]
  let colors: string[]
  let priceTiers: ProductPriceTier[]
  try {
    specifications = readJsonArray<string>(
      readString(formData, "specifications"),
      "specifications"
    )
    colors = readJsonArray<string>(readString(formData, "colors"), "colors")
    priceTiers = readJsonArray<ProductPriceTier>(
      readString(formData, "price_tiers"),
      "price tiers"
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid product details.",
      },
      { status: 400 }
    )
  }

  if (
    specifications.some(
      (specification) =>
        typeof specification !== "string" ||
        !specification.trim() ||
        specification.length > 500
    )
  ) {
    return NextResponse.json(
      { error: "Each feature must contain between 1 and 500 characters." },
      { status: 400 }
    )
  }
  if (
    colors.some(
      (color) => typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)
    )
  ) {
    return NextResponse.json(
      { error: "Product colors must be valid hex color codes." },
      { status: 400 }
    )
  }

  let fixedPrice: number | null = null
  if (pricingType === "fixed") {
    fixedPrice = Number(fixedPriceText)
    if (!fixedPriceText || !Number.isFinite(fixedPrice) || fixedPrice < 0) {
      return NextResponse.json(
        { error: "Enter a valid product price." },
        { status: 400 }
      )
    }
    priceTiers = []
  } else {
    if (
      priceTiers.length === 0 ||
      priceTiers.some((tier) => !isPriceTier(tier))
    ) {
      return NextResponse.json(
        { error: "Enter a valid price for each quantity range." },
        { status: 400 }
      )
    }
    let expectedStart = 1
    for (const [index, tier] of priceTiers.entries()) {
      if (
        tier.startQty !== expectedStart ||
        (tier.endQty === null && index !== priceTiers.length - 1)
      ) {
        return NextResponse.json(
          { error: "Bulk quantity ranges must be continuous and ordered." },
          { status: 400 }
        )
      }
      if (tier.endQty !== null) expectedStart = tier.endQty + 1
    }
  }

  const images = formData.getAll("images")
  if (
    images.length < 1 ||
    images.length > MAX_IMAGES ||
    images.some((image) => !(image instanceof File) || image.size === 0)
  ) {
    return NextResponse.json(
      { error: `Add between 1 and ${MAX_IMAGES} product images.` },
      { status: 400 }
    )
  }
  const imageFiles = images as File[]
  for (const image of imageFiles) {
    if (!extensionByType[image.type]) {
      return NextResponse.json(
        { error: "Product images must be JPG, PNG, or WEBP." },
        { status: 400 }
      )
    }
    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Each product image must be 5 MB or smaller." },
        { status: 400 }
      )
    }
  }

  const [
    { data: categoryRecord, error: categoryError },
    { data: brandRecord, error: brandError },
  ] = await Promise.all([
    adminClient
      .from("categories")
      .select("name, is_deleted")
      .eq("name", category)
      .limit(1)
      .maybeSingle(),
    adminClient
      .from("brands")
      .select("name, is_deleted")
      .eq("name", brand)
      .limit(1)
      .maybeSingle(),
  ])
  if (categoryError || brandError) {
    console.error("Product catalog validation failed", {
      categoryCode: categoryError?.code,
      brandCode: brandError?.code,
    })
    return NextResponse.json(
      { error: "Could not verify the selected category and brand." },
      { status: 500 }
    )
  }
  if (
    !categoryRecord ||
    categoryRecord.is_deleted ||
    !brandRecord ||
    brandRecord.is_deleted
  ) {
    return NextResponse.json(
      { error: "The selected category or brand is no longer active." },
      { status: 400 }
    )
  }

  const storage = adminClient.storage.from("products")
  const uploadedPaths: string[] = []
  const imageUrls: string[] = []
  for (const image of imageFiles) {
    const path = `${randomUUID()}.${extensionByType[image.type]}`
    const { error } = await storage.upload(path, image, {
      contentType: image.type,
      upsert: false,
    })
    if (error) {
      console.error("Product image upload failed", {
        code: error.name,
        message: error.message,
      })
      if (uploadedPaths.length) {
        const { error: cleanupError } = await storage.remove(uploadedPaths)
        if (cleanupError)
          console.error("Product image cleanup failed", {
            message: cleanupError.message,
          })
      }
      return NextResponse.json(
        {
          error:
            "Could not upload product images. Check the products storage bucket.",
        },
        { status: 500 }
      )
    }
    uploadedPaths.push(path)
    imageUrls.push(storage.getPublicUrl(path).data.publicUrl)
  }

  const sku = `IM-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`
  const { data: product, error: insertError } = await adminClient
    .from("products")
    .insert({
      sku,
      name,
      model_number: modelNumber,
      model: model || null,
      category,
      brand,
      manufactured_year: manufacturedYear,
      description,
      images: imageUrls,
      specifications,
      pricing_type: pricingType as ProductPricingType,
      fixed_price: fixedPrice,
      price_tiers: priceTiers,
      colors: colors.map((color) => color.toUpperCase()),
      stock: 0,
    })
    .select(
      "id, sku, name, model_number, model, category, brand, manufactured_year, description, images, specifications, pricing_type, fixed_price, price_tiers, colors, stock"
    )
    .single()

  if (insertError) {
    const { error: cleanupError } = await storage.remove(uploadedPaths)
    if (cleanupError)
      console.error("Product image cleanup failed", {
        message: cleanupError.message,
      })
    console.error("Product insert failed", { code: insertError.code })
    return NextResponse.json(
      { error: "Could not save the product." },
      { status: 500 }
    )
  }

  return NextResponse.json({ product }, { status: 201 })
}
