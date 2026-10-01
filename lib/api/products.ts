"use client";

import { supabase } from "@/lib/supabase";

export type ProductPricingType = "fixed" | "bulk";

export type ProductPriceTier = {
  startQty: number;
  endQty: number | null;
  price: number;
};

export type NewProduct = {
  name: string;
  modelNumber: string;
  model?: string;
  category: string;
  brand: string;
  manufacturedYear?: number;
  images: File[];
  description: string;
  specifications: string[];
  pricingType: ProductPricingType;
  fixedPrice?: number;
  priceTiers?: ProductPriceTier[];
  colors: string[];
};

export type CreatedProduct = {
  id: string;
  sku: string;
  name: string;
  model_number: string;
  model: string | null;
  category: string;
  brand: string;
  manufactured_year: number | null;
  description: string;
  images: string[];
  specifications: string[];
  pricing_type: ProductPricingType;
  fixed_price: number | null;
  price_tiers: ProductPriceTier[];
  colors: string[];
  stock: number;
};

export type ProductRecord = CreatedProduct & {
  created_at: string;
  storageWarning?: string;
};

type CatalogRecord = {
  name: string;
  is_deleted: boolean | null;
};

type CatalogResponse = {
  categories?: CatalogRecord[];
  brands?: CatalogRecord[];
  error?: string;
};

type ProductResponse = {
  product?: ProductRecord;
  warning?: string;
  error?: string;
};

type ProductListResponse = {
  products?: ProductRecord[];
  error?: string;
};

async function getAuthorizationHeader() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error("Your session expired. Please sign in again.");
  }
  return { Authorization: `Bearer ${data.session.access_token}` };
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}

export async function fetchProductCatalogOptions() {
  const headers = await getAuthorizationHeader();
  const [categoriesResponse, brandsResponse] = await Promise.all([
    fetch("/api/categories", { headers, cache: "no-store" }),
    fetch("/api/brands", { headers, cache: "no-store" }),
  ]);
  const [categoriesResult, brandsResult] = await Promise.all([
    readJson<CatalogResponse>(categoriesResponse),
    readJson<CatalogResponse>(brandsResponse),
  ]);

  if (!categoriesResponse.ok) {
    throw new Error(categoriesResult.error ?? "Could not load categories.");
  }
  if (!brandsResponse.ok) {
    throw new Error(brandsResult.error ?? "Could not load brands.");
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
  };
}

export async function createProduct(
  product: NewProduct,
): Promise<ProductRecord> {
  const headers = await getAuthorizationHeader();
  const formData = new FormData();
  formData.set("name", product.name);
  formData.set("model_number", product.modelNumber);
  formData.set("model", product.model ?? "");
  formData.set("category", product.category);
  formData.set("brand", product.brand);
  formData.set(
    "manufactured_year",
    product.manufacturedYear === undefined
      ? ""
      : String(product.manufacturedYear),
  );
  formData.set("description", product.description);
  formData.set("specifications", JSON.stringify(product.specifications));
  formData.set("pricing_type", product.pricingType);
  formData.set(
    "fixed_price",
    product.fixedPrice === undefined ? "" : String(product.fixedPrice),
  );
  formData.set("price_tiers", JSON.stringify(product.priceTiers ?? []));
  formData.set("colors", JSON.stringify(product.colors));
  product.images.forEach((image) => formData.append("images", image));

  const response = await fetch("/api/products", {
    method: "POST",
    headers,
    body: formData,
  });
  const result = await readJson<ProductResponse>(response);
  if (!response.ok || !result.product) {
    throw new Error(result.error ?? "Could not create the product.");
  }
  return result.product;
}

export async function fetchProducts(): Promise<ProductRecord[]> {
  const headers = await getAuthorizationHeader();
  const response = await fetch("/api/products", { headers, cache: "no-store" });
  const result = await readJson<ProductListResponse>(response);
  if (!response.ok || !result.products) {
    throw new Error(result.error ?? "Could not load products.");
  }
  return result.products;
}

export type ProductFieldEdit = {
  field:
    | "name"
    | "sku"
    | "category"
    | "brand"
    | "price"
    | "stock"
    | "manufactured_year"
    | "model_number"
    | "model"
    | "description";
  value: string | number | null;
};

export type ProductArrayEdit = {
  field: "specifications" | "colors";
  value: string[];
};

export type ProductPricingEdit = {
  field: "pricing";
  value:
    | { pricingType: "fixed"; fixedPrice: number; priceTiers: [] }
    | {
        pricingType: "bulk";
        fixedPrice: null;
        priceTiers: ProductPriceTier[];
      };
};

export type ProductImagesEdit = {
  field: "images";
  value: {
    retainedImages: string[];
    newImages: File[];
  };
};

export type ProductEdit =
  ProductFieldEdit | ProductArrayEdit | ProductPricingEdit | ProductImagesEdit;

export async function updateProduct(
  id: string,
  edit: ProductEdit,
): Promise<ProductRecord> {
  const headers = await getAuthorizationHeader();
  if (edit.field === "images") {
    const { retainedImages, newImages } = edit.value;
    const formData = new FormData();
    formData.set("field", "images");
    formData.set("value", JSON.stringify({}));
    formData.set("retained_images", JSON.stringify(retainedImages));
    newImages.forEach((image) => formData.append("new_images", image));
    const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers,
      body: formData,
    });
    const result = await readJson<ProductResponse>(response);
    if (!response.ok || !result.product) {
      throw new Error(result.error ?? "Could not update the product.");
    }
    return result.warning
      ? { ...result.product, storageWarning: result.warning }
      : result.product;
  }
  const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(edit),
  });
  const result = await readJson<ProductResponse>(response);
  if (!response.ok || !result.product) {
    throw new Error(result.error ?? "Could not update the product.");
  }
  return result.product;
}
