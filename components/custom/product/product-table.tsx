"use client";

import { useState, type KeyboardEvent } from "react";
import {
  BadgePercent,
  Ellipsis,
  ImagePlus,
  Package,
  Pencil,
  Search,
} from "lucide-react";
import { Menu } from "@base-ui/react/menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Product } from "@/components/custom/product/product-data";
import type { ProductEdit, ProductFieldEdit } from "@/lib/api/products";
import { ListPageSkeleton } from "@/components/custom/dashboard/list-page-skeleton";
import { useCanPerform } from "@/components/custom/dashboard/current-user";
import { RestrictedAction } from "@/components/custom/dashboard/restricted-action";

type ProductTableProps = {
  products: Product[];
  onViewDetails: (product: Product) => void;
  onAddDiscount: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onEdit: (product: Product, edit: ProductEdit) => Promise<void>;
  categories: string[];
  brands: string[];
  isLoading?: boolean;
  loadError?: string;
};

type EditableField = Exclude<
  ProductFieldEdit["field"],
  "model_number" | "model" | "description"
>;

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

/* Shared cell/header styling: every column gets a visible divider */
const headCell =
  "h-11 border-r border-slate-200 bg-slate-100 px-3 text-xs font-semibold tracking-wide text-slate-600 last:border-r-0";
const bodyCell =
  "border-r border-slate-200 px-2 py-2 align-middle last:border-r-0";

function getFieldValue(product: Product, field: EditableField) {
  if (field === "manufactured_year") return product.manufacturedYear ?? "";
  if (field === "price") return product.price;
  return product[field];
}

function getFinalPrice(product: Product) {
  return product.price
}

/* -------------------------------------------------------------------------- */
/*                                Editable cell                               */
/* -------------------------------------------------------------------------- */

function EditableCell({
  product,
  field,
  displayValue,
  onEdit,
  align = "left",
  numeric = false,
  allowEmpty = false,
  compact = false,
  options,
}: {
  product: Product;
  field: EditableField;
  displayValue: string;
  onEdit: (product: Product, edit: ProductFieldEdit) => Promise<void>;
  align?: "left" | "right";
  numeric?: boolean;
  allowEmpty?: boolean;
  compact?: boolean;
  options?: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(getFieldValue(product, field)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canEdit = useCanPerform("editProducts");

  function cancelEdit() {
    setDraft(String(getFieldValue(product, field)));
    setError("");
    setEditing(false);
  }

  if (!canEdit) {
    return (
      <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"} truncate ${compact ? "h-6 px-0 py-0 text-xs leading-6" : "px-2 py-1.5 text-[13px]"}`}>
        {displayValue || <span className="text-slate-400">Empty</span>}
      </div>
    );
  }

  async function saveEdit() {
    if (saving) return;
    const original = String(getFieldValue(product, field));
    const cleanValue = draft.trim();
    if (
      cleanValue === original ||
      (!cleanValue && allowEmpty && original === "")
    ) {
      setEditing(false);
      return;
    }
    if (!cleanValue && !allowEmpty) {
      setError("A value is required.");
      setDraft(original);
      setEditing(false);
      return;
    }

    const value =
      field === "manufactured_year" && cleanValue === ""
        ? null
        : numeric
          ? Number(cleanValue)
          : cleanValue;
    if (typeof value === "number" && !Number.isFinite(value)) {
      setError("Enter a valid number.");
      setDraft(original);
      setEditing(false);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onEdit(product, { field, value });
      setEditing(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save this value.",
      );
      setDraft(original);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveOption(nextValue: string | null) {
    if (!nextValue || saving) return;
    const original = String(getFieldValue(product, field));
    setDraft(nextValue);
    if (nextValue === original) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onEdit(product, { field, value: nextValue });
      setEditing(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save this value.",
      );
      setDraft(original);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  const alignClass = align === "right" ? "text-right" : "text-left";
  const controlClass = `h-8 w-full min-w-12 rounded-sm border border-slate-300 bg-transparent px-2 text-[13px] text-slate-800 outline-none focus:border-[#ed1c2e] focus:ring-2 focus:ring-[#ed1c2e]/20 ${alignClass}`;

  return (
    <div className={`min-w-0 ${alignClass}`}>
      {editing ? (
        options ? (
          <Select
            value={draft || null}
            onValueChange={saveOption}
            disabled={saving}
          >
            <SelectTrigger
              aria-label={`Edit ${field.replaceAll("_", " ")}`}
              className="h-8 w-full min-w-0 rounded-sm border-slate-300 bg-transparent px-2 text-[13px] font-normal text-slate-800 shadow-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/20"
            >
              <SelectValue placeholder={`Select ${field}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <input
            autoFocus
            type={numeric ? "number" : "text"}
            min={numeric ? "0" : undefined}
            step={field === "price" ? "0.01" : "1"}
            value={draft}
            disabled={saving}
            aria-label={`Edit ${field.replaceAll("_", " ")}`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void saveEdit()}
            onKeyDown={handleKeyDown}
            className={controlClass}
          />
        )
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={`${displayValue || "Empty"}; click to edit ${field.replaceAll("_", " ")}`}
                onClick={() => {
                  setDraft(String(getFieldValue(product, field)));
                  setEditing(true);
                }}
                className={`block w-full min-w-0 cursor-text truncate border border-transparent bg-transparent outline-none focus-visible:rounded-sm focus-visible:border-[#ed1c2e] ${compact ? "h-6 px-0 text-xs" : "h-8 px-2 text-[13px]"} ${alignClass} ${error ? "text-rose-700" : ""}`}
              >
                {saving
                  ? "Saving..."
                  : displayValue || (
                      <span className="text-slate-400">Add value</span>
                    )}
              </button>
            }
          />
          <TooltipContent className="rounded-sm bg-black px-2.5 py-1 text-white">
            {error ||
              displayValue ||
              `Click to edit ${field.replaceAll("_", " ")}`}
          </TooltipContent>
        </Tooltip>
      )}
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Row actions                                */
/* -------------------------------------------------------------------------- */

function RowActions({
  product,
  onViewDetails,
  onAddDiscount,
  onEditProduct,
}: {
  product: Product;
  onViewDetails: (product: Product) => void;
  onAddDiscount: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}) {
  const itemClass =
    "flex h-9 cursor-default items-center gap-2.5 rounded-sm px-2.5 text-[13px] outline-none hover:bg-slate-100 data-highlighted:bg-slate-100";

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Actions for ${product.name}`}
        className="inline-grid size-8 place-items-center rounded-md border border-transparent text-slate-500 outline-none hover:border-slate-200 hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
      >
        <Ellipsis className="size-4" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-[120]"
        >
          <Menu.Popup className="min-w-44 rounded-md border border-slate-200 bg-white p-1 text-slate-800 shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
            <RestrictedAction action="editProducts">
              <Menu.Item
                onClick={() => onEditProduct(product)}
                className={itemClass}
              >
                <Pencil className="size-4 text-slate-500" aria-hidden="true" />
                Edit
              </Menu.Item>
            </RestrictedAction>
            <Menu.Item
              onClick={() => onViewDetails(product)}
              className={itemClass}
            >
              <Search className="size-4 text-slate-500" aria-hidden="true" />
              View details
            </Menu.Item>
            <Menu.Item
              onClick={() => onAddDiscount(product)}
              className={itemClass}
            >
              <BadgePercent
                className="size-4 text-slate-500"
                aria-hidden="true"
              />
              Add discount
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Thumb({ url, className }: { url?: string; className?: string }) {
  const dimensions = className ?? "size-11";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`${dimensions} shrink-0 rounded-md border border-slate-200 bg-slate-50 object-cover`}
    />
  ) : (
    <span className={`grid ${dimensions} shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-400`}>
      <ImagePlus className="size-4" aria-hidden="true" />
    </span>
  );
}

function PriceNote({ product }: { product: Product }) {
  if (product.pricingType === "bulk" && !product.discountPercent) {
    return (
      <span className="block px-2 text-[10px] font-normal text-slate-400">
        First tier
      </span>
    );
  }
  if (product.discountPercent) {
    const previousPrice = product.pricingType === "bulk"
      ? product.oldPriceTiers?.[0]?.price
      : product.oldPrice
    return (
      <span className="block px-2 text-[10px] font-normal text-emerald-700">
        {product.discountPercent}% off ·{" "}
        {previousPrice != null && previousPrice > 0 ? (
          <span className="text-slate-400 line-through">
            {currencyFormatter.format(previousPrice)}
          </span>
        ) : null}
      </span>
    );
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                    Table                                   */
/* -------------------------------------------------------------------------- */

export function ProductTable({
  products,
  onViewDetails,
  onAddDiscount,
  onEditProduct,
  onEdit,
  categories,
  brands,
  isLoading = false,
  loadError = "",
}: ProductTableProps) {
  if (isLoading) {
    return <ListPageSkeleton page="products" contentOnly />
  }

  const stateMessage = loadError ? (
    <p role="alert" className="text-[13px] text-rose-700">
      {loadError}
    </p>
  ) : products.length === 0 ? (
    <div className="text-[13px] text-slate-500">
      <Package
        className="mx-auto mb-2 size-5 text-slate-400"
        aria-hidden="true"
      />
      No products match these filters.
    </div>
  ) : null;

  return (
    <section
      aria-label="Products"
      className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm"
    >
      {/* ------------------------- Desktop / tablet grid ------------------------- */}
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[860px] border-collapse">
          <TableHeader>
            <TableRow className="border-b border-slate-300 hover:bg-transparent">
              <TableHead className={`${headCell} min-w-64`}>
                Product / SKU
              </TableHead>
              <TableHead className={`${headCell} min-w-36`}>Category</TableHead>
              <TableHead className={`${headCell} min-w-32`}>Brand</TableHead>
              <TableHead className={`${headCell} min-w-36 text-right`}>
                Price
              </TableHead>
              <TableHead className={`${headCell} min-w-24 text-right`}>
                Stock
              </TableHead>
              <TableHead className={`${headCell} w-14 text-center`}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stateMessage ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-40 text-center">
                  {stateMessage}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const year = product.manufacturedYear;

                return (
                  <TableRow
                    key={product.id}
                    className="border-b border-slate-200  bg-white transition-colors last:border-b-0 even:bg-slate-50 hover:bg-rose-50/40"
                  >
                    <TableCell className={bodyCell}>
                      <div className="flex min-w-2 items-center  gap-1 pl-1">
                        <Thumb url={product.images?.[0]} />
                        <div className="min-w-0 flex-1  ">
                          <span className="text-md gap-2 font-semibold ">
                          <EditableCell
                            product={product}
                            field="name"
                            displayValue={product.name}
                            onEdit={onEdit}
                          /></span>
                          <div className="flex min-w-0 items-center gap-1">
                            <div className="max-w-36 text-slate-500 text-xs min-w-0 flex-1">
                              <EditableCell
                                product={product}
                                field="sku"
                                displayValue={product.sku}
                                onEdit={onEdit}
                              />
                            </div>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              Year
                            </span>
                            <div className="w-16 shrink-0">
                              <EditableCell
                                product={product}
                                field="manufactured_year"
                                displayValue={year ? String(year) : "—"}
                                onEdit={onEdit}
                                numeric
                                allowEmpty
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={bodyCell}>
                      <EditableCell
                        product={product}
                        field="category"
                        displayValue={product.category}
                        onEdit={onEdit}
                        options={categories}
                      />
                    </TableCell>
                    <TableCell className={bodyCell}>
                      <EditableCell
                        product={product}
                        field="brand"
                        displayValue={product.brand}
                        onEdit={onEdit}
                        options={brands}
                      />
                    </TableCell>
                    <TableCell
                      className={`${bodyCell} text-right font-medium text-slate-800 tabular-nums`}
                    >
                      <EditableCell
                        product={product}
                        field="price"
                        displayValue={currencyFormatter.format(
                          getFinalPrice(product),
                        )}
                        onEdit={onEdit}
                        align="right"
                        numeric
                      />
                      <PriceNote product={product} />
                    </TableCell>
                    <TableCell
                      className={`${bodyCell} text-right text-slate-700 tabular-nums`}
                    >
                      <EditableCell
                        product={product}
                        field="stock"
                        displayValue={String(product.stock)}
                        onEdit={onEdit}
                        align="right"
                        numeric
                      />
                    </TableCell>
                    <TableCell className={`${bodyCell} text-center`}>
                      <RowActions
                        product={product}
                        onViewDetails={onViewDetails}
                        onAddDiscount={onAddDiscount}
                        onEditProduct={onEditProduct}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ----------------------------- Mobile cards ----------------------------- */}
      <div className="md:hidden">
        {stateMessage ? (
          <div className="flex h-40 items-center justify-center px-4 text-center">
            {stateMessage}
          </div>
        ) : (
          <ul className="space-y-2 p-2">
            {products.map((product) => {
              const year = product.manufacturedYear;
              return (
                <li
                  key={product.id}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Thumb url={product.images?.[0]} className="h-16 w-12" />
                    <div className="min-w-0 flex-1">
                      <EditableCell
                        product={product}
                        field="name"
                        displayValue={product.name}
                        onEdit={onEdit}
                        compact
                      />
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <EditableCell
                            product={product}
                            field="brand"
                            displayValue={product.brand}
                            onEdit={onEdit}
                            compact
                            options={brands}
                          />
                        </div>
                        <span aria-hidden="true" className="h-3.5 shrink-0 border-l border-slate-300" />
                        <div className="min-w-0 flex-1">
                          <EditableCell
                            product={product}
                            field="category"
                            displayValue={product.category}
                            onEdit={onEdit}
                            compact
                            options={categories}
                          />
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-1 text-[11px] leading-5 text-slate-500">
                        <div className="min-w-0 flex-1 truncate">
                          <EditableCell
                            product={product}
                            field="sku"
                            displayValue={product.sku}
                            onEdit={onEdit}
                            compact
                          />
                        </div>
                        <span aria-hidden="true" className="shrink-0 text-slate-300">·</span>
                        <span className="shrink-0 text-slate-400">Year</span>
                        <div className="w-12 shrink-0">
                          <EditableCell
                            product={product}
                            field="manufactured_year"
                            displayValue={year ? String(year) : "—"}
                            onEdit={onEdit}
                            compact
                            numeric
                            allowEmpty
                          />
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1">
                          <span className="shrink-0 text-[11px] text-slate-500">Price</span>
                          <div className="min-w-0 font-semibold tabular-nums text-slate-900">
                            <EditableCell
                              product={product}
                              field="price"
                              displayValue={currencyFormatter.format(
                                getFinalPrice(product),
                              )}
                              onEdit={onEdit}
                              compact
                              numeric
                            />
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                          Stock: {product.stock}
                        </span>
                      </div>
                      <PriceNote product={product} />
                    </div>
                    <RowActions
                      product={product}
                      onViewDetails={onViewDetails}
                      onAddDiscount={onAddDiscount}
                      onEditProduct={onEditProduct}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
