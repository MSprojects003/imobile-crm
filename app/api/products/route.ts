import "server-only";

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeDashboardRequest, createAdminClient, authorizeActiveAdmin } from "@/lib/admin-auth";
import type { ProductPriceTier, ProductPricingType } from "@/lib/api/products";

const productSelection =
  "id, sku, name, model_number, model, category, brand, manufactured_year, description, images, specifications, pricing_type, fixed_price, price_tiers, colors, stock, created_at, discount_percentage, discount_amount, old_price, old_price_tiers";
const MAX_IMAGES = 8;
const MAX_EDIT_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getProductStoragePath(imageUrl: string): string | null {
  try {
    const pathname = new URL(imageUrl).pathname;
    const prefix = "/storage/v1/object/public/products/";
    if (!pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(pathname.slice(prefix.length));
    const segments = path.split("/");
    if (
      !path ||
      segments.some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          !/^[A-Za-z0-9._-]+$/.test(segment),
      )
    ) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

function readJsonArray<T>(value: string, fieldName: string): T[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid ${fieldName} data.`);
  }
  if (!Array.isArray(parsed)) throw new Error(`Invalid ${fieldName} data.`);
  return parsed as T[];
}

function isPriceTier(value: unknown): value is ProductPriceTier {
  if (!value || typeof value !== "object") return false;
  const tier = value as Record<string, unknown>;
  return (
    Number.isInteger(tier.startQty) &&
    Number(tier.startQty) >= 1 &&
    (tier.endQty === null ||
      (Number.isInteger(tier.endQty) &&
        Number(tier.endQty) >= Number(tier.startQty))) &&
    typeof tier.price === "number" &&
    Number.isFinite(tier.price) &&
    tier.price >= 0
  );
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewProducts");
  if (!authorization.authorized) return authorization.response;

  const { data, error } = await authorization.adminClient
    .from("products")
    .select(productSelection)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product list query failed", { code: error.code });
    return NextResponse.json(
      { error: "Could not load products." },
      { status: 500 },
    );
  }
  return NextResponse.json({ products: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase server configuration is missing." },
      { status: 500 },
    );
  }

  const authorization = await authorizeActiveAdmin(request, adminClient);
  if (!authorization.authorized) return authorization.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "Product ID is required." },
      { status: 400 },
    );

  let body: unknown;
  let retainedImages: string[] = [];
  let newImages: File[] = [];
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawImages = formData.getAll("new_images");
      if (
        rawImages.some((file) => !(file instanceof File) || file.size === 0)
      ) {
        return NextResponse.json(
          { error: "One or more product images are invalid." },
          { status: 400 },
        );
      }
      body = {
        field: formData.get("field"),
        value: JSON.parse(readString(formData, "value")),
      };
      retainedImages = readJsonArray<string>(
        readString(formData, "retained_images"),
        "retained images",
      );
      newImages = rawImages as File[];
    } else {
      body = await request.json();
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid product update data." },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid product update data." },
      { status: 400 },
    );
  }

  const { field, value } = body as { field?: unknown; value?: unknown };
  const allowedFields = new Set([
    "name",
    "sku",
    "category",
    "brand",
    "price",
    "discount",
    "pricing",
    "stock",
    "manufactured_year",
    "model_number",
    "model",
    "description",
    "specifications",
    "colors",
    "images",
  ]);
  if (typeof field !== "string" || !allowedFields.has(field)) {
    return NextResponse.json(
      { error: "This product field cannot be edited." },
      { status: 400 },
    );
  }

  const { data: current, error: lookupError } = await authorization.adminClient
    .from("products")
    .select(productSelection)
    .eq("id", id)
    .single();
  if (lookupError || !current) {
    if (lookupError)
      console.error("Product lookup for update failed", {
        code: lookupError.code,
      });
    return NextResponse.json(
      { error: "Could not find this product." },
      { status: 404 },
    );
  }

  const update: Record<string, unknown> = {};
  let uploadedPaths: string[] = [];
  let imagesToDelete: string[] = [];
  if (field === "images") {
    if (
      retainedImages.length + newImages.length > MAX_EDIT_IMAGES ||
      newImages.some(
        (image) => !extensionByType[image.type] || image.size > MAX_IMAGE_SIZE,
      )
    ) {
      return NextResponse.json(
        {
          error: `A maximum of ${MAX_EDIT_IMAGES} valid product images is allowed. New images must be JPG, PNG, or WEBP and 5 MB or smaller.`,
        },
        { status: 400 },
      );
    }
    if (
      new Set(retainedImages).size !== retainedImages.length ||
      retainedImages.some(
        (image) =>
          typeof image !== "string" ||
          !current.images.includes(image as string),
      )
    ) {
      return NextResponse.json(
        { error: "The selected product images are invalid." },
        { status: 400 },
      );
    }
    const deletionPaths: (string | null)[] = current.images
      .filter((image: string) => !retainedImages.includes(image))
      .map((image: string): string | null => getProductStoragePath(image));
    if (deletionPaths.some((path) => path === null)) {
      return NextResponse.json(
        {
          error:
            "A removed image is not stored in the products bucket and cannot be safely deleted.",
        },
        { status: 400 },
      );
    }
    imagesToDelete = deletionPaths.filter(
      (path): path is string => path !== null,
    );
    const storage = authorization.adminClient.storage.from("products");
    const newImageUrls: string[] = [];
    for (const image of newImages) {
      const path = `${randomUUID()}.${extensionByType[image.type]}`;
      const { error } = await storage.upload(path, image, {
        contentType: image.type,
        upsert: false,
      });
      if (error) {
        console.error("Product image upload failed", {
          code: error.name,
          message: error.message,
        });
        if (uploadedPaths.length) {
          const { error: cleanupError } = await storage.remove(uploadedPaths);
          if (cleanupError) {
            console.error("Product image cleanup failed", {
              message: cleanupError.message,
            });
          }
        }
        return NextResponse.json(
          { error: "Could not upload product images." },
          { status: 500 },
        );
      }
      uploadedPaths.push(path);
      newImageUrls.push(storage.getPublicUrl(path).data.publicUrl);
    }
    update.images = [...retainedImages, ...newImageUrls];
  } else if (field === "details") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return NextResponse.json(
        { error: "Enter valid product details." },
        { status: 400 },
      );
    }

    const details = value as Record<string, unknown>;
    const name = details.name;
    const sku = details.sku;
    const modelNumber = details.modelNumber;
    const model = details.model;
    const category = details.category;
    const brand = details.brand;
    const year = details.manufacturedYear;
    const description = details.description;
    const specifications = details.specifications;
    const colors = details.colors;
    const pricingType = details.pricingType;
    const fixedPrice = details.fixedPrice;
    const priceTiers = details.priceTiers;

    if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
      return NextResponse.json(
        { error: "Product name must be between 1 and 100 characters." },
        { status: 400 },
      );
    }
    if (typeof sku !== "string" || !sku.trim() || sku.trim().length > 60) {
      return NextResponse.json(
        { error: "SKU must be between 1 and 60 characters." },
        { status: 400 },
      );
    }
    if (
      typeof modelNumber !== "string" ||
      !modelNumber.trim() ||
      modelNumber
        .split(",")
        .some((item) => !item.trim() || item.trim().length > 60)
    ) {
      return NextResponse.json(
        { error: "Each model number must be between 1 and 60 characters." },
        { status: 400 },
      );
    }
    if (
      typeof model !== "string" ||
      (model !== "" && !/^[A-Za-z0-9]{1,7}$/.test(model))
    ) {
      return NextResponse.json(
        { error: "Model must contain up to 7 letters or numbers." },
        { status: 400 },
      );
    }
    if (typeof category !== "string" || !category.trim()) {
      return NextResponse.json(
        { error: "Select a category." },
        { status: 400 },
      );
    }
    if (typeof brand !== "string" || !brand.trim()) {
      return NextResponse.json({ error: "Select a brand." }, { status: 400 });
    }
    if (
      year !== null &&
      (typeof year !== "number" ||
        !Number.isInteger(year) ||
        year < 1950 ||
        year > new Date().getFullYear())
    ) {
      return NextResponse.json(
        { error: "Enter a valid manufactured year." },
        { status: 400 },
      );
    }
    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 500
    ) {
      return NextResponse.json(
        { error: "Description must be between 1 and 500 characters." },
        { status: 400 },
      );
    }
    if (
      !Array.isArray(specifications) ||
      specifications.length > 100 ||
      specifications.some(
        (item) =>
          typeof item !== "string" || !item.trim() || item.trim().length > 500,
      )
    ) {
      return NextResponse.json(
        { error: "Enter valid feature specifications." },
        { status: 400 },
      );
    }
    if (
      !Array.isArray(colors) ||
      colors.length > 100 ||
      colors.some(
        (color) => typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color),
      )
    ) {
      return NextResponse.json(
        { error: "Product colors must be valid hex color codes." },
        { status: 400 },
      );
    }
    if (
      retainedImages.length + newImages.length > MAX_EDIT_IMAGES ||
      newImages.some(
        (image) => !extensionByType[image.type] || image.size > MAX_IMAGE_SIZE,
      )
    ) {
      return NextResponse.json(
        {
          error: `A maximum of ${MAX_EDIT_IMAGES} valid product images is allowed. New images must be JPG, PNG, or WEBP and 5 MB or smaller.`,
        },
        { status: 400 },
      );
    }
    if (
      new Set(retainedImages).size !== retainedImages.length ||
      retainedImages.some(
        (image) =>
          typeof image !== "string" ||
          !current.images.includes(image as string),
      )
    ) {
      return NextResponse.json(
        { error: "The selected product images are invalid." },
        { status: 400 },
      );
    }
    const deletionPaths: (string | null)[] = current.images
      .filter((image: string) => !retainedImages.includes(image))
      .map((image: string): string | null => getProductStoragePath(image));
    if (deletionPaths.some((path) => path === null)) {
      return NextResponse.json(
        {
          error:
            "A removed image is not stored in the products bucket and cannot be safely deleted.",
        },
        { status: 400 },
      );
    }
    imagesToDelete = deletionPaths.filter(
      (path): path is string => path !== null,
    );

    const [
      { data: categoryRecord, error: categoryError },
      { data: brandRecord, error: brandError },
    ] = await Promise.all([
      authorization.adminClient
        .from("categories")
        .select("name, is_deleted")
        .eq("name", category.trim())
        .limit(1)
        .maybeSingle(),
      authorization.adminClient
        .from("brands")
        .select("name, is_deleted")
        .eq("name", brand.trim())
        .limit(1)
        .maybeSingle(),
    ]);
    if (categoryError || brandError) {
      console.error("Product catalog validation failed", {
        categoryCode: categoryError?.code,
        brandCode: brandError?.code,
      });
      return NextResponse.json(
        { error: "Could not verify the selected category and brand." },
        { status: 500 },
      );
    }
    if (
      !categoryRecord ||
      categoryRecord.is_deleted ||
      !brandRecord ||
      brandRecord.is_deleted
    ) {
      return NextResponse.json(
        { error: "The selected category or brand is no longer active." },
        { status: 400 },
      );
    }

    if (pricingType === "fixed") {
      if (
        typeof fixedPrice !== "number" ||
        !Number.isFinite(fixedPrice) ||
        fixedPrice < 0
      ) {
        return NextResponse.json(
          { error: "Enter a valid fixed price." },
          { status: 400 },
        );
      }
      update.pricing_type = "fixed";
      update.fixed_price = fixedPrice;
      update.price_tiers = [];
    } else if (
      pricingType === "bulk" &&
      Array.isArray(priceTiers) &&
      priceTiers.length > 0 &&
      priceTiers.length <= 50
    ) {
      let expectedStart = 1;
      for (const [index, tier] of priceTiers.entries()) {
        if (
          !isPriceTier(tier) ||
          tier.startQty !== expectedStart ||
          (tier.endQty === null && index !== priceTiers.length - 1)
        ) {
          return NextResponse.json(
            { error: "Check the quantity ranges and prices in each tier." },
            { status: 400 },
          );
        }
        if (tier.endQty !== null) expectedStart = tier.endQty + 1;
      }
      update.pricing_type = "bulk";
      update.fixed_price = null;
      update.price_tiers = priceTiers;
    } else {
      return NextResponse.json(
        { error: "Choose valid fixed or bulk pricing." },
        { status: 400 },
      );
    }

    const storage = authorization.adminClient.storage.from("products");
    const newImageUrls: string[] = [];
    for (const image of newImages) {
      const path = `${randomUUID()}.${extensionByType[image.type]}`;
      const { error } = await storage.upload(path, image, {
        contentType: image.type,
        upsert: false,
      });
      if (error) {
        console.error("Product image upload failed", {
          code: error.name,
          message: error.message,
        });
        if (uploadedPaths.length) {
          const { error: cleanupError } = await storage.remove(uploadedPaths);
          if (cleanupError) {
            console.error("Product image cleanup failed", {
              message: cleanupError.message,
            });
          }
        }
        return NextResponse.json(
          { error: "Could not upload product images." },
          { status: 500 },
        );
      }
      uploadedPaths.push(path);
      newImageUrls.push(storage.getPublicUrl(path).data.publicUrl);
    }

    Object.assign(update, {
      name: name.trim(),
      sku: sku.trim(),
      model_number: modelNumber
        .split(",")
        .map((item) => item.trim())
        .join(", "),
      model: model.trim() || null,
      category: categoryRecord.name,
      brand: brandRecord.name,
      manufactured_year: year,
      description: description.trim(),
      specifications: specifications.map((item) => item.trim()),
      colors,
      images: [...retainedImages, ...newImageUrls],
    });
  } else if (field === "name" || field === "sku") {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > (field === "name" ? 100 : 60)
    ) {
      return NextResponse.json(
        { error: `Enter a valid product ${field}.` },
        { status: 400 },
      );
    }
    update[field] = value.trim();
  } else if (field === "category" || field === "brand") {
    if (typeof value !== "string" || !value.trim()) {
      return NextResponse.json(
        { error: `Select a valid ${field}.` },
        { status: 400 },
      );
    }
    const table = field === "category" ? "categories" : "brands";
    const { data: catalogEntry, error } = await authorization.adminClient
      .from(table)
      .select("name, is_deleted")
      .eq("name", value.trim())
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("Product catalog edit validation failed", {
        field,
        code: error.code,
      });
      return NextResponse.json(
        { error: `Could not verify the ${field}.` },
        { status: 500 },
      );
    }
    if (!catalogEntry || catalogEntry.is_deleted) {
      return NextResponse.json(
        { error: `The selected ${field} is not active.` },
        { status: 400 },
      );
    }
    update[field] = catalogEntry.name;
  } else if (field === "model_number") {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.split(",").some((item) => !item.trim() || item.trim().length > 60)
    ) {
      return NextResponse.json(
        { error: "Each model number must be between 1 and 60 characters." },
        { status: 400 },
      );
    }
    update.model_number = value
      .split(",")
      .map((item) => item.trim())
      .join(", ");
  } else if (field === "model") {
    if (
      typeof value !== "string" ||
      (value !== "" && !/^[A-Za-z0-9]{1,7}$/.test(value))
    ) {
      return NextResponse.json(
        { error: "Model must contain up to 7 letters or numbers." },
        { status: 400 },
      );
    }
    update.model = value || null;
  } else if (field === "description") {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > 500
    ) {
      return NextResponse.json(
        { error: "Description must be between 1 and 500 characters." },
        { status: 400 },
      );
    }
    update.description = value.trim();
  } else if (field === "specifications") {
    if (
      !Array.isArray(value) ||
      value.length > 100 ||
      value.some(
        (item) =>
          typeof item !== "string" || !item.trim() || item.trim().length > 500,
      )
    ) {
      return NextResponse.json(
        { error: "Enter valid feature specifications." },
        { status: 400 },
      );
    }
    update.specifications = value.map((item: string) => item.trim());
  } else if (field === "colors") {
    if (
      !Array.isArray(value) ||
      value.length > 100 ||
      value.some(
        (color) => typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color),
      )
    ) {
      return NextResponse.json(
        { error: "Product colors must be valid hex color codes." },
        { status: 400 },
      );
    }
    update.colors = value;
  } else if (field === "stock") {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      return NextResponse.json(
        { error: "Stock must be a non-negative whole number." },
        { status: 400 },
      );
    }
    update.stock = value;
  } else if (field === "discount") {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 90) {
      return NextResponse.json(
        { error: "Discount must be between 0% and 90%." },
        { status: 400 },
      );
    }

    const currentDiscount = Number(current.discount_percentage ?? 0);
    const requestedDiscount = Math.round(value * 100) / 100;
    if (current.pricing_type === "bulk") {
      const currentTiers = Array.isArray(current.price_tiers)
        ? current.price_tiers as ProductPriceTier[]
        : [];
      const originalTiers = currentDiscount > 0 && Array.isArray(current.old_price_tiers) && current.old_price_tiers.length
        ? current.old_price_tiers as ProductPriceTier[]
        : currentTiers;

      if (requestedDiscount === 0) {
        update.price_tiers = originalTiers;
        update.old_price_tiers = [];
        update.old_price = 0;
        update.discount_percentage = 0;
        update.discount_amount = 0;
      } else {
        update.price_tiers = originalTiers.map((tier) => ({
          ...tier,
          price: Math.round(tier.price * (1 - requestedDiscount / 100) * 100) / 100,
        }));
        update.old_price_tiers = originalTiers;
        update.old_price = 0;
        update.discount_percentage = requestedDiscount;
        update.discount_amount = 0;
      }
    } else {
      const currentPrice = Number(current.fixed_price ?? 0);
      const originalPrice = currentDiscount > 0 && Number(current.old_price) > 0
        ? Number(current.old_price)
        : currentPrice;

      if (requestedDiscount === 0) {
        update.fixed_price = originalPrice;
        update.old_price = 0;
        update.old_price_tiers = [];
        update.discount_percentage = 0;
        update.discount_amount = 0;
      } else {
        const discountedPrice = Math.round(originalPrice * (1 - requestedDiscount / 100) * 100) / 100;
        update.fixed_price = discountedPrice;
        update.old_price = originalPrice;
        update.old_price_tiers = [];
        update.discount_percentage = requestedDiscount;
        update.discount_amount = Math.round((originalPrice - discountedPrice) * 100) / 100;
      }
    }
  } else if (field === "manufactured_year") {
    if (
      value !== null &&
      (typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 1950 ||
        value > new Date().getFullYear())
    ) {
      return NextResponse.json(
        { error: "Enter a valid manufactured year." },
        { status: 400 },
      );
    }
    update.manufactured_year = value;
  } else if (field === "price") {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return NextResponse.json(
        { error: "Price must be a non-negative number." },
        { status: 400 },
      );
    }
    if (current.pricing_type === "bulk") {
      const tiers = Array.isArray(current.price_tiers)
        ? (current.price_tiers as ProductPriceTier[])
        : [];
      if (!tiers.length) {
        return NextResponse.json(
          { error: "This product has no bulk price tier to edit." },
          { status: 400 },
        );
      }
      tiers[0] = { ...tiers[0], price: value };
      update.price_tiers = tiers;
    } else {
      update.fixed_price = value;
    }
    update.old_price = 0;
    update.old_price_tiers = [];
    update.discount_percentage = 0;
    update.discount_amount = 0;
  } else if (field === "pricing") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return NextResponse.json(
        { error: "Enter valid product pricing." },
        { status: 400 },
      );
    }
    const pricing = value as {
      pricingType?: unknown;
      fixedPrice?: unknown;
      priceTiers?: unknown;
    };
    if (pricing.pricingType === "fixed") {
      if (
        typeof pricing.fixedPrice !== "number" ||
        !Number.isFinite(pricing.fixedPrice) ||
        pricing.fixedPrice < 0
      ) {
        return NextResponse.json(
          { error: "Enter a valid fixed price." },
          { status: 400 },
        );
      }
      update.pricing_type = "fixed";
      update.fixed_price = pricing.fixedPrice;
      update.price_tiers = [];
      update.old_price = 0;
      update.old_price_tiers = [];
      update.discount_percentage = 0;
      update.discount_amount = 0;
    } else if (
      pricing.pricingType === "bulk" &&
      Array.isArray(pricing.priceTiers) &&
      pricing.priceTiers.length > 0 &&
      pricing.priceTiers.length <= 50
    ) {
      const tiers: ProductPriceTier[] = [];
      let nextStartQty = 1;
      for (const tier of pricing.priceTiers) {
        if (!tier || typeof tier !== "object" || Array.isArray(tier)) {
          return NextResponse.json(
            { error: "Enter valid bulk price tiers." },
            { status: 400 },
          );
        }
        const row = tier as {
          startQty?: unknown;
          endQty?: unknown;
          price?: unknown;
        };
        if (
          row.startQty !== nextStartQty ||
          (row.endQty !== null &&
            (typeof row.endQty !== "number" ||
              !Number.isInteger(row.endQty) ||
              row.endQty < nextStartQty)) ||
          typeof row.price !== "number" ||
          !Number.isFinite(row.price) ||
          row.price < 0
        ) {
          return NextResponse.json(
            { error: "Check the quantity ranges and prices in each tier." },
            { status: 400 },
          );
        }
        tiers.push({
          startQty: nextStartQty,
          endQty: row.endQty as number | null,
          price: row.price,
        });
        if (row.endQty === null && tiers.length !== pricing.priceTiers.length) {
          return NextResponse.json(
            { error: "Only the last bulk tier can have no quantity limit." },
            { status: 400 },
          );
        }
        if (row.endQty !== null) nextStartQty = row.endQty + 1;
      }
      update.pricing_type = "bulk";
      update.fixed_price = null;
      update.price_tiers = tiers;
      update.old_price = 0;
      update.old_price_tiers = [];
      update.discount_percentage = 0;
      update.discount_amount = 0;
    } else {
      return NextResponse.json(
        { error: "Enter at least one valid bulk price tier." },
        { status: 400 },
      );
    }
  }

  const { data: product, error: updateError } = await authorization.adminClient
    .from("products")
    .update(update)
    .eq("id", id)
    .select(productSelection)
    .single();
  if (updateError) {
    console.error("Product update failed", { code: updateError.code });
    if (uploadedPaths.length) {
      const { error: cleanupError } = await authorization.adminClient.storage
        .from("products")
        .remove(uploadedPaths);
      if (cleanupError) {
        console.error("Product image cleanup after update failure failed", {
          message: cleanupError.message,
        });
      }
    }
    if (updateError.code === "23505") {
      return NextResponse.json(
        { error: "A product with this SKU already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Could not update the product." },
      { status: 500 },
    );
  }
  if (imagesToDelete.length) {
    const { error: removalError } = await authorization.adminClient.storage
      .from("products")
      .remove(imagesToDelete);
    if (removalError) {
      console.error(
        "Removed product images could not be deleted from storage",
        {
          code: removalError.name,
          message: removalError.message,
        },
      );
      return NextResponse.json({
        product,
        warning:
          "Product details were saved, but one or more removed images could not be deleted from storage.",
      });
    }
  }
  return NextResponse.json({ product });
}

export async function POST(request: NextRequest) {
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase server configuration is missing." },
      { status: 500 },
    );
  }

  const authorization = await authorizeActiveAdmin(request, adminClient);
  if (!authorization.authorized) return authorization.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid product form data." },
      { status: 400 },
    );
  }

  const name = readString(formData, "name");
  const modelNumber = readString(formData, "model_number");
  const model = readString(formData, "model");
  const category = readString(formData, "category");
  const brand = readString(formData, "brand");
  const description = readString(formData, "description");
  const yearText = readString(formData, "manufactured_year");
  const pricingType = readString(formData, "pricing_type");
  const fixedPriceText = readString(formData, "fixed_price");

  if (!name || name.length > 100) {
    return NextResponse.json(
      { error: "Product name must be between 1 and 100 characters." },
      { status: 400 },
    );
  }
  const modelNumbers = modelNumber.split(",").map((value) => value.trim());
  if (
    !modelNumber ||
    modelNumbers.some((value) => !value || value.length > 60)
  ) {
    return NextResponse.json(
      { error: "Each model number must be between 1 and 60 characters." },
      { status: 400 },
    );
  }
  if (model && !/^[A-Za-z0-9]{1,7}$/.test(model)) {
    return NextResponse.json(
      { error: "Model must contain up to 7 letters or numbers." },
      { status: 400 },
    );
  }
  if (!category || !brand) {
    return NextResponse.json(
      { error: "Select a category and brand." },
      { status: 400 },
    );
  }
  if (!description || description.length > 500) {
    return NextResponse.json(
      { error: "Description must be between 1 and 500 characters." },
      { status: 400 },
    );
  }
  if (pricingType !== "fixed" && pricingType !== "bulk") {
    return NextResponse.json(
      { error: "Choose a valid pricing type." },
      { status: 400 },
    );
  }

  let manufacturedYear: number | null = null;
  if (yearText) {
    manufacturedYear = Number(yearText);
    if (
      !Number.isInteger(manufacturedYear) ||
      manufacturedYear < 1950 ||
      manufacturedYear > new Date().getFullYear()
    ) {
      return NextResponse.json(
        { error: "Enter a valid manufactured year." },
        { status: 400 },
      );
    }
  }

  let specifications: string[];
  let colors: string[];
  let priceTiers: ProductPriceTier[];
  try {
    specifications = readJsonArray<string>(
      readString(formData, "specifications"),
      "specifications",
    );
    colors = readJsonArray<string>(readString(formData, "colors"), "colors");
    priceTiers = readJsonArray<ProductPriceTier>(
      readString(formData, "price_tiers"),
      "price tiers",
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid product details.",
      },
      { status: 400 },
    );
  }

  if (
    specifications.some(
      (specification) =>
        typeof specification !== "string" ||
        !specification.trim() ||
        specification.length > 500,
    )
  ) {
    return NextResponse.json(
      { error: "Each feature must contain between 1 and 500 characters." },
      { status: 400 },
    );
  }
  if (
    colors.some(
      (color) => typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color),
    )
  ) {
    return NextResponse.json(
      { error: "Product colors must be valid hex color codes." },
      { status: 400 },
    );
  }

  let fixedPrice: number | null = null;
  if (pricingType === "fixed") {
    fixedPrice = Number(fixedPriceText);
    if (!fixedPriceText || !Number.isFinite(fixedPrice) || fixedPrice < 0) {
      return NextResponse.json(
        { error: "Enter a valid product price." },
        { status: 400 },
      );
    }
    priceTiers = [];
  } else {
    if (
      priceTiers.length === 0 ||
      priceTiers.some((tier) => !isPriceTier(tier))
    ) {
      return NextResponse.json(
        { error: "Enter a valid price for each quantity range." },
        { status: 400 },
      );
    }
    let expectedStart = 1;
    for (const [index, tier] of priceTiers.entries()) {
      if (
        tier.startQty !== expectedStart ||
        (tier.endQty === null && index !== priceTiers.length - 1)
      ) {
        return NextResponse.json(
          { error: "Bulk quantity ranges must be continuous and ordered." },
          { status: 400 },
        );
      }
      if (tier.endQty !== null) expectedStart = tier.endQty + 1;
    }
  }

  const images = formData.getAll("images");
  if (
    images.length < 1 ||
    images.length > MAX_IMAGES ||
    images.some((image) => !(image instanceof File) || image.size === 0)
  ) {
    return NextResponse.json(
      { error: `Add between 1 and ${MAX_IMAGES} product images.` },
      { status: 400 },
    );
  }
  const imageFiles = images as File[];
  for (const image of imageFiles) {
    if (!extensionByType[image.type]) {
      return NextResponse.json(
        { error: "Product images must be JPG, PNG, or WEBP." },
        { status: 400 },
      );
    }
    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Each product image must be 5 MB or smaller." },
        { status: 400 },
      );
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
  ]);
  if (categoryError || brandError) {
    console.error("Product catalog validation failed", {
      categoryCode: categoryError?.code,
      brandCode: brandError?.code,
    });
    return NextResponse.json(
      { error: "Could not verify the selected category and brand." },
      { status: 500 },
    );
  }
  if (
    !categoryRecord ||
    categoryRecord.is_deleted ||
    !brandRecord ||
    brandRecord.is_deleted
  ) {
    return NextResponse.json(
      { error: "The selected category or brand is no longer active." },
      { status: 400 },
    );
  }

  const [
    { data: adminProfiles, error: adminsError },
    { data: staffProfiles, error: staffError },
  ] = await Promise.all([
    adminClient
      .from("users")
      .select("id")
      .eq("is_admin", true)
      .eq("status", true),
    adminClient
      .from("staff")
      .select("user_id")
      .eq("is_active", true)
      .eq("is_deleted", false),
  ]);
  if (adminsError || staffError) {
    console.error("Product notification recipient lookup failed", {
      adminsCode: adminsError?.code,
      staffCode: staffError?.code,
    });
    return NextResponse.json(
      { error: "Could not load product notification recipients." },
      { status: 500 },
    );
  }
  const notificationRecipients = [...new Set([
    authorization.notificationUserId,
    ...(adminProfiles ?? []).map((profile) => profile.id),
    ...(staffProfiles ?? []).flatMap((profile) =>
      typeof profile.user_id === "string" ? [profile.user_id] : []
    ),
  ])];

  const storage = adminClient.storage.from("products");
  const uploadedPaths: string[] = [];
  const imageUrls: string[] = [];
  for (const image of imageFiles) {
    const path = `${randomUUID()}.${extensionByType[image.type]}`;
    const { error } = await storage.upload(path, image, {
      contentType: image.type,
      upsert: false,
    });
    if (error) {
      console.error("Product image upload failed", {
        code: error.name,
        message: error.message,
      });
      if (uploadedPaths.length) {
        const { error: cleanupError } = await storage.remove(uploadedPaths);
        if (cleanupError)
          console.error("Product image cleanup failed", {
            message: cleanupError.message,
          });
      }
      return NextResponse.json(
        {
          error:
            "Could not upload product images. Check the products storage bucket.",
        },
        { status: 500 },
      );
    }
    uploadedPaths.push(path);
    imageUrls.push(storage.getPublicUrl(path).data.publicUrl);
  }

  const sku = `IM-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
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
    .select(productSelection)
    .single();

  if (insertError) {
    const { error: cleanupError } = await storage.remove(uploadedPaths);
    if (cleanupError)
      console.error("Product image cleanup failed", {
        message: cleanupError.message,
      });
    console.error("Product insert failed", { code: insertError.code });
    return NextResponse.json(
      { error: "Could not save the product." },
      { status: 500 },
    );
  }

  const notificationMessage =
    `A new product has been added successfully: ${product.name} ` +
    `(Product ID: ${product.sku}). It uses ${pricingType === "bulk" ? "bulk pricing" : "fixed pricing"}.`;
  const { error: notificationError } = await adminClient
    .from("notifications")
    .insert(notificationRecipients.map((recipientId) => ({
      title: "New product added",
      message: notificationMessage,
      type: "product_added",
      from_user_id: authorization.notificationUserId,
      to_user_id: recipientId,
      is_to_all: false,
      is_read: false,
      content_id: product.id,
      link: "/dashboard/products",
    })));

  if (notificationError) {
    console.error("Product notification insert failed", {
      code: notificationError.code,
      productId: product.id,
    });
    const { error: productRollbackError } = await adminClient
      .from("products")
      .delete()
      .eq("id", product.id);
    const { error: imageCleanupError } = await storage.remove(uploadedPaths);
    if (productRollbackError || imageCleanupError) {
      console.error("Product rollback failed after notification error", {
        productId: product.id,
        productCode: productRollbackError?.code,
        imageMessage: imageCleanupError?.message,
      });
    }
    return NextResponse.json(
      {
        error: productRollbackError || imageCleanupError
          ? "Product notification failed, and product creation could not be fully rolled back."
          : "Could not notify staff and admins; the product was not saved.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ product }, { status: 201 });
}
