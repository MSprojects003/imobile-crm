"use client"

import { supabase } from "@/lib/supabase"

export type ProductPricingType = "fixed" | "bulk"

export type ProductPriceTier = {
  startQty: number
  endQty: number | null
  price: number
}

export type NewProduct = {
  name: string
  modelNumber: string
  model?: string
  category: string
  brand: string
  manufacturedYear?: number
  images: File[]
  description: string
  specifications: string[]
  pricingType: ProductPricingType
  fixedPrice?: number
  priceTiers?: ProductPriceTier[]
  colors: string[]
}

export type CreatedProduct = {
  id: string
  sku: string
  name: string
  model_number: string
  model: string | null
  category: string
  brand: string
  manufactured_year: number | null
  description: string
  images: string[]
  specifications: string[]
  pricing_type: ProductPricingType
  fixed_price: number | null
  price_tiers: ProductPriceTier[]
  colors: string[]
  stock: number
}

type CatalogRecord = {
  name: string
  is_deleted: boolean | null
}

type CatalogResponse = {
  categories?: CatalogRecord[]
  brands?: CatalogRecord[]
  error?: string
}

type ProductResponse = {
  product?: CreatedProduct
  error?: string
}

async function getAuthorizationHeader() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error("Your session expired. Please sign in again.")
  }
  return { Authorization: `Bearer ${data.session.access_token}` }
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    throw new Error("The server returned an invalid response.")
  }
}

export async function fetchProductCatalogOptions() {
  const headers = await getAuthorizationHeader()
  const [categoriesResponse, brandsResponse] = await Promise.all([
    fetch("/api/categories", { headers, cache: "no-store" }),
    fetch("/api/brands", { headers, cache: "no-store" }),
  ])
  const [categoriesResult, brandsResult] = await Promise.all([
    readJson<CatalogResponse>(categoriesResponse),
    readJson<CatalogResponse>(brandsResponse),
  ])

  if (!categoriesResponse.ok) {
    throw new Error(categoriesResult.error ?? "Could not load categories.")
  }
  if (!brandsResponse.ok) {
    throw new Error(brandsResult.error ?? "Could not load brands.")
  }

  return {
    categories: (categoriesResult.categories ?? [])
      .filter((category) => !category.is_deleted && category.name.trim())
      .map((category) => category.name)
      .sort((first, second) => first.localeCompare(second)),
    brands: (brandsResult.brands ?? [])
      .filter((brand) => !brand.is_deleted && brand.name.trim())
      .map((brand) => brand.name)
      .sort((first, second) => first.localeCompare(second)),
  }
}

export async function createProduct(
  product: NewProduct
): Promise<CreatedProduct> {
  const headers = await getAuthorizationHeader()
  const formData = new FormData()
  formData.set("name", product.name)
  formData.set("model_number", product.modelNumber)
  formData.set("model", product.model ?? "")
  formData.set("category", product.category)
  formData.set("brand", product.brand)
  formData.set(
    "manufactured_year",
    product.manufacturedYear === undefined
      ? ""
      : String(product.manufacturedYear)
  )
  formData.set("description", product.description)
  formData.set("specifications", JSON.stringify(product.specifications))
  formData.set("pricing_type", product.pricingType)
  formData.set(
    "fixed_price",
    product.fixedPrice === undefined ? "" : String(product.fixedPrice)
  )
  formData.set("price_tiers", JSON.stringify(product.priceTiers ?? []))
  formData.set("colors", JSON.stringify(product.colors))
  product.images.forEach((image) => formData.append("images", image))

  const response = await fetch("/api/products", {
    method: "POST",
    headers,
    body: formData,
  })
  const result = await readJson<ProductResponse>(response)
  if (!response.ok || !result.product) {
    throw new Error(result.error ?? "Could not create the product.")
  }
  return result.product
}
