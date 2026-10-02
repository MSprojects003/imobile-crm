"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Hash,
  ImageOff,
  Layers3,
  ListChecks,
  Palette,
  Tag,
  AlignLeft,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Product } from "@/components/custom/product/product-data";

type ViewProductSheetProps = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

const colorNames: Record<string, string> = {
  "#000000": "Black",
  "#FFFFFF": "White",
  "#6B7280": "Gray",
  "#C0C0C0": "Silver",
  "#EF4444": "Red",
  "#F97316": "Orange",
  "#EAB308": "Yellow",
  "#22C55E": "Green",
  "#3B82F6": "Blue",
  "#A855F7": "Purple",
  "#EC4899": "Pink",
  "#92400E": "Brown",
  "#ED1C2E": "Red",
};

/* -------------------------------------------------------------------------- */
/*                               Small UI helpers                             */
/* -------------------------------------------------------------------------- */

function Card({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: typeof Tag;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <h3 className="truncate text-xs font-semibold text-slate-900">
            {title}
          </h3>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 px-3.5 py-2.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium break-words text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function stockTone(stock: number) {
  if (stock <= 0) return "border-rose-200 bg-rose-50 text-rose-700";
  if (stock <= 10) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export function ViewProductSheet({
  product,
  open,
  onOpenChange,
}: ViewProductSheetProps) {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
  }, [product?.id]);

  const images = product?.images ?? [];
  const modelNumbers = (product?.modelNumber ?? "")
    .split(",")
    .map((modelNumber) => modelNumber.trim())
    .filter(Boolean);
  const priceTiers = product?.priceTiers ?? [];
  const specifications = (product?.specifications ?? []).filter((item) =>
    item.trim(),
  );
  const validColors = (product?.colors ?? [])
    .map((color) => color.trim().toUpperCase())
    .filter((color) => /^#[0-9A-F]{6}$/.test(color));
  const currentImage = images[Math.min(activeImage, images.length - 1)];
  const isBulk = product?.pricingType === "bulk";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-dvh min-h-0 flex-col gap-0 overflow-hidden p-0 !w-screen sm:!max-w-sm"
      >
        {/* ------------------------------- Header ------------------------------- */}
        <SheetHeader className="shrink-0 gap-1.5 border-b border-slate-200 bg-white px-4 py-4 pr-12 sm:px-5 sm:pr-14">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="rounded-sm border-rose-200 bg-rose-50 text-[10px] font-semibold tracking-wide text-rose-700 uppercase"
            >
              {isBulk ? "Bulk pricing" : "Fixed pricing"}
            </Badge>
            {product ? (
              <Badge
                variant="outline"
                className={`rounded-sm text-[10px] font-semibold tracking-wide uppercase ${stockTone(product.stock)}`}
              >
                {product.stock <= 0
                  ? "Out of stock"
                  : `${product.stock} in stock`}
              </Badge>
            ) : null}
          </div>
          <SheetTitle className="line-clamp-2 text-sm leading-5 text-slate-950">
            {product?.name ?? "Product details"}
          </SheetTitle>
          <SheetDescription className="flex min-w-0 items-center gap-1.5 text-xs">
            <Hash className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate font-mono text-slate-700">
              {product?.sku}
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* -------------------------------- Body -------------------------------- */}
        {product ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4 sm:px-5">
            {/* Gallery */}
            <section aria-label="Product images" className="space-y-2">
              <div className="relative aspect-[16/9] max-h-48 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImage}
                    alt={`${product.name} image ${Math.min(activeImage, images.length - 1) + 1}`}
                    className="size-full object-contain"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-slate-400">
                    <span className="flex flex-col items-center gap-1.5 text-xs">
                      <ImageOff className="size-6" aria-hidden="true" />
                      No images
                    </span>
                  </div>
                )}
                {images.length > 1 ? (
                  <span className="absolute right-2 bottom-2 rounded bg-slate-900/75 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                    {Math.min(activeImage, images.length - 1) + 1} /{" "}
                    {images.length}
                  </span>
                ) : null}
              </div>

              {images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((image, index) => {
                    const active = index === activeImage;
                    return (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        aria-label={`Show image ${index + 1}`}
                        aria-current={active}
                        onClick={() => setActiveImage(index)}
                        className={`relative size-14 shrink-0 overflow-hidden rounded-md border bg-white transition-colors focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30 focus-visible:outline-none sm:size-16 ${
                          active
                            ? "border-[#ed1c2e] ring-1 ring-[#ed1c2e]/30"
                            : "border-slate-200 opacity-80 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt=""
                          className="size-full object-cover"
                        />
                        {index === 0 ? (
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-px text-center text-[9px] font-medium text-white">
                            Cover
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>

            {/* Pricing */}
            <Card
              icon={Layers3}
              title="Pricing"
              aside={
                product.discountPercent ? (
                  <Badge
                    variant="outline"
                    className="rounded-sm border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700"
                  >
                    {product.discountPercent}% discount
                  </Badge>
                ) : null
              }
            >
              {isBulk ? (
                <div>
                  <div className="grid grid-cols-[1fr_1fr] gap-3 border-b border-slate-200 bg-white px-3.5 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    <span>Quantity range</span>
                    <span className="text-right">Unit price</span>
                  </div>
                  {priceTiers.length ? (
                    <div className="divide-y divide-slate-100">
                      {priceTiers.map((tier, index) => (
                        <div
                          key={`${tier.startQty}-${tier.endQty}-${index}`}
                          className="grid grid-cols-[1fr_1fr] gap-3 px-3.5 py-2.5 odd:bg-white even:bg-slate-50/70"
                        >
                          <span className="text-xs text-slate-700 tabular-nums">
                            {tier.startQty} – {tier.endQty ?? "No limit"}
                          </span>
                          <span className="text-right text-xs font-semibold text-slate-900 tabular-nums">
                            {currencyFormatter.format(tier.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-3.5 py-3 text-xs text-slate-500">
                      No bulk price tiers available.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-end justify-between gap-3 px-3.5 py-3.5">
                  <div>
                    <p className="text-xs text-slate-500">Fixed unit price</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-950 tabular-nums">
                      {currencyFormatter.format(
                        product.fixedPrice ?? product.price,
                      )}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Product information */}
            <Card icon={Tag} title="Product information">
              <dl className="divide-y divide-slate-100">
                <InfoRow label="Category" value={product.category} />
                <InfoRow label="Brand" value={product.brand} />
                <InfoRow label="Model" value={product.model} />
                <InfoRow
                  label="Manufactured year"
                  value={product.manufacturedYear}
                />
              </dl>
            </Card>

            {/* Model numbers */}
            {modelNumbers.length ? (
              <Card
                icon={Hash}
                title="Model numbers"
                aside={
                  <span className="text-xs text-slate-500">
                    {modelNumbers.length}
                  </span>
                }
              >
                <div className="flex flex-wrap gap-2 p-3.5">
                  {modelNumbers.map((modelNumber, index) => (
                    <span
                      key={`${modelNumber}-${index}`}
                      className="inline-flex max-w-full items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-medium break-all text-slate-700"
                    >
                      {modelNumber}
                    </span>
                  ))}
                </div>
              </Card>
            ) : null}

            {/* Colors */}
            {validColors.length ? (
              <Card
                icon={Palette}
                title="Available colors"
                aside={
                  <span className="text-xs text-slate-500">
                    {validColors.length}
                  </span>
                }
              >
                <div className="flex flex-wrap gap-2 p-3.5">
                  {validColors.map((color, index) => (
                    <span
                      key={`${color}-${index}`}
                      title={color}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <span
                        className="size-4 shrink-0 rounded-full border border-slate-300"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      {colorNames[color] ?? color}
                    </span>
                  ))}
                </div>
              </Card>
            ) : null}

            {/* Description */}
            {product.description?.trim() ? (
              <Card icon={AlignLeft} title="Description">
                <p className="p-3.5 text-xs leading-5 whitespace-pre-wrap text-slate-700">
                  {product.description.trim()}
                </p>
              </Card>
            ) : null}

            {/* Specifications */}
            {specifications.length ? (
              <Card
                icon={ListChecks}
                title="Feature specifications"
                aside={
                  <span className="text-xs text-slate-500">
                    {specifications.length}
                  </span>
                }
              >
                <ul className="divide-y divide-slate-100">
                  {specifications.map((specification, index) => (
                    <li
                      key={`${specification}-${index}`}
                      className="flex gap-2.5 px-3.5 py-2.5 text-xs leading-5 text-slate-700 odd:bg-white even:bg-slate-50/70"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#ed1c2e]"
                      />
                      <span className="min-w-0 break-words">
                        {specification}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {/* Created */}
            {product.createdAt ? (
              <p className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Created{" "}
                {new Date(product.createdAt).toLocaleString("en-LK", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
