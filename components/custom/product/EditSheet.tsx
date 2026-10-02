"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  type FieldPath,
  type RegisterOptions,
} from "react-hook-form";
import { HexColorInput, HexColorPicker } from "react-colorful";
import {
  ImagePlus,
  Layers,
  LoaderCircle,
  Palette,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Product } from "@/components/custom/product/product-data";
import {
  fetchProductCatalogOptions,
  type ProductEdit,
} from "@/lib/api/products";

type EditSheetProps = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    product: Product,
    edit: ProductEdit,
  ) => Promise<{ product: Product; warning?: string }>;
};

type ModelNumberItem = { value: string };
type SpecificationItem = { value: string };

type PricingValues = {
  name: string;
  sku: string;
  modelNumbers: ModelNumberItem[];
  model: string;
  category: string;
  brand: string;
  manufacturedYear: string;
  description: string;
  specifications: SpecificationItem[];
  colors: string[];
  pricingType: "fixed" | "bulk";
  fixedPrice: string;
  priceTiers: { startQty: number; endQty: string; price: string }[];
};

type ImageDraft =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; preview: string };
type PendingConfirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  action: () => void;
};

const MAX_IMAGES = 5;
const PRESET_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Green", hex: "#22C55E" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Brown", hex: "#92400E" },
];

const inputClass =
  "h-10 rounded-md border-slate-200 px-3 text-xs md:text-xs focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20";
const textareaClass =
  "min-h-20 resize-y rounded-md border-slate-200 px-3 py-2.5 text-xs md:text-xs focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20";

function sameHex(first: string, second: string) {
  return first.toLowerCase() === second.toLowerCase();
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-b border-slate-100 px-5 py-6 last:border-b-0 sm:px-6">
      <div>
        <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function getDefaultValues(product: Product | null): PricingValues {
  const pricingType = product?.pricingType === "bulk" ? "bulk" : "fixed";
  const tiers = product?.priceTiers?.length
    ? product.priceTiers
    : [{ startQty: 1, endQty: null, price: 0 }];
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    modelNumbers: product?.modelNumber
      ? product.modelNumber
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => ({ value }))
      : [{ value: "" }],
    model: product?.model ?? "",
    category: product?.category ?? "",
    brand: product?.brand ?? "",
    manufacturedYear: product?.manufacturedYear
      ? String(product.manufacturedYear)
      : "",
    description: product?.description ?? "",
    specifications: (product?.specifications ?? []).map((value) => ({
      value,
    })),
    colors: product?.colors ?? [],
    pricingType,
    fixedPrice: String(product?.fixedPrice ?? product?.price ?? ""),
    priceTiers: tiers.map((tier) => ({
      startQty: tier.startQty,
      endQty: tier.endQty === null ? "" : String(tier.endQty),
      price: String(tier.price),
    })),
  };
}

export function EditSheet({
  product,
  open,
  onOpenChange,
  onSave,
}: EditSheetProps) {
  const {
    register,
    control,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<PricingValues>({ defaultValues: getDefaultValues(product) });
  const {
    fields: modelNumberFields,
    append: appendModelNumber,
    remove: removeModelNumber,
  } = useFieldArray({ control, name: "modelNumbers" });
  const {
    fields: specificationFields,
    append: appendSpecification,
    remove: removeSpecification,
  } = useFieldArray({ control, name: "specifications" });
  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
  } = useFieldArray({ control, name: "priceTiers" });
  const pricingType = watch("pricingType");
  const tiers = watch("priceTiers");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerColor, setPickerColor] = useState("#ed1c2e");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<ProductEdit[]>([]);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  useEffect(() => {
    if (open) {
      reset(getDefaultValues(product));
      setFormError("");
      setFormNotice("");
      setImages(
        (product?.images ?? []).map((url) => ({ kind: "existing", url })),
      );
      setPickerOpen(false);
    }
  }, [open, product?.id, reset]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError("");
    void fetchProductCatalogOptions()
      .then((options) => {
        if (cancelled) return;
        setCategories(options.categories);
        setBrands(options.brands);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Could not load categories and brands.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => {
        if (image.kind === "new") URL.revokeObjectURL(image.preview);
      });
    },
    [],
  );

  useEffect(() => {
    let nextStart = 1;
    tiers.forEach((tier, index) => {
      if (Number(tier.startQty) !== nextStart) {
        setValue(`priceTiers.${index}.startQty`, nextStart);
      }
      const end = Number(tier.endQty);
      nextStart = (end >= nextStart ? end : nextStart) + 1;
    });
  }, [tiers, setValue]);

  const lastTier = tiers[tiers.length - 1];
  const canAddTier =
    !!lastTier &&
    Number(lastTier.endQty) >= Number(lastTier.startQty) &&
    Number(lastTier.endQty) > 0;

  function addTier() {
    if (!canAddTier) return;
    appendTier({
      startQty: Number(lastTier.endQty) + 1,
      endQty: "",
      price: "",
    });
  }

  async function saveEdit(edit: ProductEdit) {
    if (!product) return;
    setFormError("");
    setFormNotice("");
    try {
      const result = await onSave(product, edit);
      if (edit.field === "images") {
        const latestImages = imagesRef.current;
        const retained = latestImages.filter(
          (image): image is Extract<ImageDraft, { kind: "existing" }> =>
            image.kind === "existing",
        );
        const newImages = latestImages.filter(
          (image): image is Extract<ImageDraft, { kind: "new" }> =>
            image.kind === "new",
        );
        const savedUrls = result.product.images ?? [];
        const persistedImages: ImageDraft[] = [
          ...retained,
          ...savedUrls
            .slice(
              retained.length,
              retained.length + edit.value.newImages.length,
            )
            .map((url) => ({ kind: "existing" as const, url })),
          ...newImages.slice(edit.value.newImages.length),
        ];
        for (const uploaded of newImages.slice(
          0,
          edit.value.newImages.length,
        )) {
          URL.revokeObjectURL(uploaded.preview);
        }
        imagesRef.current = persistedImages;
        setImages(persistedImages);
      }
      setFormNotice(
        result.warning ?? `Saved ${edit.field.replaceAll("_", " ")}.`,
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not update product.",
      );
    }
  }

  async function processPendingSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const pendingSaves =
      pendingSaveRef.current ?? (pendingSaveRef.current = []);
    while (pendingSaves.length) {
      let edit = pendingSaves.shift();
      if (edit?.field === "images") {
        edit = {
          field: "images",
          value: {
            retainedImages: imagesRef.current.flatMap((image) =>
              image.kind === "existing" ? [image.url] : [],
            ),
            newImages: imagesRef.current.flatMap((image) =>
              image.kind === "new" ? [image.file] : [],
            ),
          },
        };
      }
      if (edit) await saveEdit(edit);
    }
    savingRef.current = false;
    setSaving(false);
  }

  function queueSave(edit: ProductEdit) {
    const pendingSaves =
      pendingSaveRef.current ?? (pendingSaveRef.current = []);
    pendingSaves.push(edit);
    void processPendingSave();
  }

  function saveImages(imageDrafts: ImageDraft[]) {
    if (imageDrafts.length > MAX_IMAGES) {
      setFormError(`A maximum of ${MAX_IMAGES} product images is allowed.`);
      return;
    }
    const persistedUrls = product?.images ?? [];
    if (
      imageDrafts.every((image) => image.kind === "existing") &&
      JSON.stringify(imageDrafts.map((image) => image.url)) ===
        JSON.stringify(persistedUrls)
    ) {
      return;
    }
    queueSave({
      field: "images",
      value: {
        retainedImages: imageDrafts.flatMap((image) =>
          image.kind === "existing" ? [image.url] : [],
        ),
        newImages: imageDrafts.flatMap((image) =>
          image.kind === "new" ? [image.file] : [],
        ),
      },
    });
  }

  function saveField(name: FieldPath<PricingValues>) {
    const values = getValues();
    if (name === "name") {
      if (values.name.trim() === product?.name) return;
      queueSave({ field: "name", value: values.name.trim() });
    } else if (name === "sku") {
      if (values.sku.trim() === product?.sku) return;
      queueSave({ field: "sku", value: values.sku.trim() });
    } else if (name === "model") {
      if ((values.model.trim() || null) === (product?.model ?? null)) return;
      queueSave({ field: "model", value: values.model.trim() });
    } else if (name === "manufacturedYear") {
      const year = values.manufacturedYear
        ? Number(values.manufacturedYear)
        : null;
      if (year === (product?.manufacturedYear ?? null)) return;
      queueSave({
        field: "manufactured_year",
        value: year,
      });
    } else if (name === "description") {
      if (values.description.trim() === product?.description) return;
      queueSave({ field: "description", value: values.description.trim() });
    } else if (name === "category" || name === "brand") {
      if (values[name] === product?.[name]) return;
      queueSave({
        field: name,
        value: values[name],
      });
    } else if (name.startsWith("modelNumbers.")) {
      const modelNumber = values.modelNumbers
        .map((item) => item.value.trim())
        .filter(Boolean)
        .join(", ");
      const savedModelNumber = (product?.modelNumber ?? "")
        .split(",")
        .map((item) => item.trim())
        .join(", ");
      if (modelNumber && modelNumber !== savedModelNumber) {
        queueSave({ field: "model_number", value: modelNumber });
      }
    } else if (name.startsWith("specifications.")) {
      const specifications = values.specifications
        .map((item) => item.value.trim())
        .filter(Boolean);
      if (
        JSON.stringify(specifications) ===
        JSON.stringify(product?.specifications ?? [])
      ) {
        return;
      }
      queueSave({
        field: "specifications",
        value: specifications,
      });
    } else if (name.startsWith("priceTiers.")) {
      queuePricing(values);
    } else if (name === "fixedPrice") {
      queuePricing(values);
    }
  }

  function queuePricing(values: PricingValues) {
    if (values.pricingType === "fixed") {
      if (
        values.fixedPrice &&
        Number.isFinite(Number(values.fixedPrice)) &&
        Number(values.fixedPrice) >= 0
      ) {
        const edit: ProductEdit = {
          field: "pricing",
          value: {
            pricingType: "fixed",
            fixedPrice: Number(values.fixedPrice),
            priceTiers: [],
          },
        };
        if (
          product?.pricingType !== "fixed" ||
          product.fixedPrice !== Number(values.fixedPrice) ||
          (product.priceTiers?.length ?? 0) > 0
        ) {
          queueSave(edit);
        }
      }
      return;
    }
    if (
      !values.priceTiers.length ||
      values.priceTiers.some(
        (tier) =>
          !tier.price ||
          !Number.isFinite(Number(tier.price)) ||
          Number(tier.price) < 0 ||
          (tier.endQty !== "" &&
            (!Number.isInteger(Number(tier.endQty)) ||
              Number(tier.endQty) < Number(tier.startQty))),
      )
    ) {
      setFormError("Complete each bulk quantity range and unit price.");
      return;
    }
    const priceTiers = values.priceTiers.map((tier) => ({
      startQty: Number(tier.startQty),
      endQty: tier.endQty ? Number(tier.endQty) : null,
      price: Number(tier.price),
    }));
    if (
      product?.pricingType === "bulk" &&
      JSON.stringify(product.priceTiers ?? []) === JSON.stringify(priceTiers)
    ) {
      return;
    }
    queueSave({
      field: "pricing",
      value: {
        pricingType: "bulk",
        fixedPrice: null,
        priceTiers,
      },
    });
  }

  function registerAutoSave<T extends FieldPath<PricingValues>>(
    name: T,
    options?: RegisterOptions<PricingValues, T>,
  ) {
    const field = register(name, options);
    return {
      ...field,
      onBlur: (
        event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        void field.onBlur(event);
        saveField(name);
      },
    };
  }

  function requestConfirmation(
    title: string,
    description: string,
    confirmLabel: string,
    action: () => void,
  ) {
    setPendingConfirmation({ title, description, confirmLabel, action });
  }

  function closeSheet() {
    if (savingRef.current) return;
    images.forEach((image) => {
      if (image.kind === "new") URL.revokeObjectURL(image.preview);
    });
    setImages([]);
    onOpenChange(false);
  }

  function addImages(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    const validFiles = selected.filter(
      (file) =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
        file.size <= 5 * 1024 * 1024,
    );
    const accepted = validFiles
      .slice(0, Math.max(0, MAX_IMAGES - images.length))
      .map((file) => ({
        kind: "new" as const,
        file,
        preview: URL.createObjectURL(file),
      }));
    if (accepted.length) {
      const nextImages = [...images, ...accepted];
      imagesRef.current = nextImages;
      setImages(nextImages);
      saveImages(nextImages);
    }
    if (validFiles.length > accepted.length) {
      setFormError(`Only ${MAX_IMAGES} product images can be kept.`);
    } else if (validFiles.length !== selected.length) {
      setFormError("Images must be JPG, PNG, or WEBP and 5 MB or smaller.");
    } else if (accepted.length) setFormError("");
  }

  function removeImage(index: number) {
    const removed = images[index];
    if (removed?.kind === "new") URL.revokeObjectURL(removed.preview);
    const nextImages = images.filter((_, itemIndex) => itemIndex !== index);
    imagesRef.current = nextImages;
    setImages(nextImages);
    saveImages(nextImages);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) onOpenChange(true);
        else closeSheet();
      }}
    >
      <SheetContent
        side="right"
        className="flex h-dvh min-h-0 w-screen flex-col gap-0 overflow-hidden p-0 sm:!max-w-lg"
      >
        <SheetHeader className="shrink-0 gap-1.5 border-b border-slate-200 bg-white px-5 py-4 pr-14 sm:px-6 sm:pr-14">
          <SheetTitle className="text-sm text-slate-950">
            Edit product
          </SheetTitle>
          <SheetDescription className="truncate text-xs">
            {product
              ? `${product.name} · ${product.sku}`
              : "Update product information"}
          </SheetDescription>
        </SheetHeader>

        {product ? (
          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex min-h-0 flex-1 flex-col"
          >
            <fieldset disabled={saving} className="contents" aria-busy={saving}>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
                <Section title="Product information">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-700">
                        Product name
                      </span>
                      <Input
                        maxLength={100}
                        className={inputClass}
                        {...registerAutoSave("name", {
                          required: "Product name is required.",
                          maxLength: {
                            value: 100,
                            message: "Maximum 100 characters.",
                          },
                        })}
                      />
                      {errors.name?.message ? (
                        <span className="block text-xs text-rose-700">
                          {errors.name.message}
                        </span>
                      ) : null}
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-700">
                        SKU
                      </span>
                      <Input
                        maxLength={60}
                        className={inputClass}
                        {...registerAutoSave("sku", {
                          required: "SKU is required.",
                          maxLength: {
                            value: 60,
                            message: "Maximum 60 characters.",
                          },
                        })}
                      />
                      {errors.sku?.message ? (
                        <span className="block text-xs text-rose-700">
                          {errors.sku.message}
                        </span>
                      ) : null}
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-medium text-slate-700">
                        Model numbers
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendModelNumber({ value: "" })}
                        className="gap-1.5"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Add model
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {modelNumberFields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <Input
                              aria-label={`Model number ${index + 1}`}
                              maxLength={60}
                              placeholder={`Model number ${index + 1}`}
                              className={inputClass}
                              {...registerAutoSave(
                                `modelNumbers.${index}.value`,
                                {
                                  required: "Model number is required.",
                                  validate: (value) =>
                                    !value.includes(",") ||
                                    "Commas are reserved to separate model numbers.",
                                  maxLength: {
                                    value: 60,
                                    message: "Maximum 60 characters.",
                                  },
                                },
                              )}
                            />
                            {errors.modelNumbers?.[index]?.value?.message ? (
                              <p className="mt-1 text-xs text-rose-700">
                                {errors.modelNumbers[index]?.value?.message}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Remove model number ${index + 1}`}
                            disabled={modelNumberFields.length === 1}
                            onClick={() =>
                              requestConfirmation(
                                "Delete model number?",
                                `Are you sure you want to remove model number ${index + 1}?`,
                                "Delete model number",
                                () => {
                                  const values = getValues();
                                  const nextModelNumbers =
                                    values.modelNumbers.filter(
                                      (_, itemIndex) => itemIndex !== index,
                                    );
                                  removeModelNumber(index);
                                  const modelNumber = nextModelNumbers
                                    .map((item) => item.value.trim())
                                    .filter(Boolean)
                                    .join(", ");
                                  if (modelNumber) {
                                    queueSave({
                                      field: "model_number",
                                      value: modelNumber,
                                    });
                                  }
                                },
                              )
                            }
                            className="size-10 shrink-0 text-slate-500 hover:text-[#ed1c2e]"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-700">
                        Model{" "}
                        <span className="font-normal text-slate-400">
                          Optional
                        </span>
                      </span>
                      <Input
                        maxLength={7}
                        className={inputClass}
                        {...registerAutoSave("model", {
                          maxLength: {
                            value: 7,
                            message:
                              "Model must be 7 letters or numbers or fewer.",
                          },
                          validate: (value) =>
                            !value ||
                            /^[A-Za-z0-9]{1,7}$/.test(value) ||
                            "Use letters and numbers only, up to 7 characters.",
                        })}
                      />
                      {errors.model?.message ? (
                        <span className="block text-xs text-rose-700">
                          {errors.model.message}
                        </span>
                      ) : null}
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-slate-700">
                        Manufactured year{" "}
                        <span className="font-normal text-slate-400">
                          Optional
                        </span>
                      </span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1950"
                        max={String(new Date().getFullYear())}
                        placeholder={String(new Date().getFullYear())}
                        className={inputClass}
                        {...registerAutoSave("manufacturedYear", {
                          validate: (year) =>
                            !year ||
                            (Number.isInteger(Number(year)) &&
                              Number(year) >= 1950 &&
                              Number(year) <= new Date().getFullYear()) ||
                            `Enter a year from 1950 to ${new Date().getFullYear()}.`,
                        })}
                      />
                      {errors.manufacturedYear?.message ? (
                        <span className="block text-xs text-rose-700">
                          {errors.manufacturedYear.message}
                        </span>
                      ) : null}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {(
                      [
                        ["category", "Category", categories],
                        ["brand", "Brand", brands],
                      ] as const
                    ).map(([fieldName, label, options]) => (
                      <label key={fieldName} className="space-y-1.5">
                        <span className="text-xs font-medium text-slate-700">
                          {label}
                        </span>
                        <Controller
                          control={control}
                          name={fieldName}
                          rules={{
                            required: `Select a ${label.toLowerCase()}.`,
                          }}
                          render={({ field }) => (
                            <Select
                              value={field.value || null}
                              onValueChange={(value) => {
                                const selected = value ?? "";
                                if (selected === product?.[fieldName]) return;
                                field.onChange(selected);
                                queueSave({
                                  field: fieldName,
                                  value: selected,
                                });
                              }}
                              disabled={catalogLoading}
                            >
                              <SelectTrigger className="h-10 w-full text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                                {options.length === 0 ? (
                                  <SelectItem value="empty" disabled>
                                    {catalogLoading
                                      ? "Loading..."
                                      : "No options available"}
                                  </SelectItem>
                                ) : null}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors[fieldName]?.message ? (
                          <span className="block text-xs text-rose-700">
                            {errors[fieldName]?.message}
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                  {catalogError ? (
                    <p role="alert" className="text-xs text-rose-700">
                      {catalogError}
                    </p>
                  ) : null}
                </Section>

                <Section
                  title="Product images"
                  description={`Keep or add up to ${MAX_IMAGES} JPG, PNG, or WEBP images. Each image must be 5 MB or smaller.`}
                >
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {images.map((image, index) => (
                      <div
                        key={
                          image.kind === "existing" ? image.url : image.preview
                        }
                        className="group relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            image.kind === "existing"
                              ? image.url
                              : image.preview
                          }
                          alt={`Product image ${index + 1}`}
                          className="size-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Remove product image ${index + 1}`}
                          onClick={() =>
                            requestConfirmation(
                              "Delete product image?",
                              "This image will be removed from the product and permanently deleted from storage.",
                              "Delete image",
                              () => removeImage(index),
                            )
                          }
                          className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-[#ed1c2e] hover:text-white"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                        {index === 0 ? (
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
                            Cover
                          </span>
                        ) : null}
                      </div>
                    ))}
                    {images.length < MAX_IMAGES ? (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-[#ed1c2e]/50 hover:bg-rose-50/40 hover:text-[#ed1c2e]"
                      >
                        <ImagePlus className="size-5" aria-hidden="true" />
                        <span className="text-xs font-medium">Add image</span>
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {images.length} of {MAX_IMAGES} images
                  </p>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    hidden
                    onChange={(event) => {
                      addImages(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                  />
                  {images.length > MAX_IMAGES ? (
                    <p className="text-xs text-rose-700">
                      Remove {images.length - MAX_IMAGES} image
                      {images.length - MAX_IMAGES === 1 ? "" : "s"} before
                      saving.
                    </p>
                  ) : null}
                </Section>

                <Section title="Description">
                  <Textarea
                    rows={4}
                    maxLength={500}
                    placeholder="Describe this product"
                    className={textareaClass}
                    {...registerAutoSave("description", {
                      required: "Description is required.",
                      maxLength: {
                        value: 500,
                        message: "Maximum 500 characters.",
                      },
                    })}
                  />
                  {errors.description?.message ? (
                    <p className="text-xs text-rose-700">
                      {errors.description.message}
                    </p>
                  ) : null}
                </Section>

                <Section
                  title="Feature specifications"
                  description="Remove existing features or add new ones."
                >
                  <div className="space-y-3">
                    {specificationFields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <Textarea
                            aria-label={`Feature specification ${index + 1}`}
                            rows={2}
                            maxLength={500}
                            placeholder={`Feature ${index + 1}`}
                            className={textareaClass}
                            {...registerAutoSave(
                              `specifications.${index}.value`,
                              {
                                required: "Enter a feature or remove this row.",
                                maxLength: {
                                  value: 500,
                                  message: "Maximum 500 characters.",
                                },
                              },
                            )}
                          />
                          {errors.specifications?.[index]?.value?.message ? (
                            <p className="mt-1 text-xs text-rose-700">
                              {errors.specifications[index]?.value?.message}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Delete feature ${index + 1}`}
                          onClick={() => {
                            const values = getValues();
                            const nextSpecifications =
                              values.specifications.filter(
                                (_, itemIndex) => itemIndex !== index,
                              );
                            removeSpecification(index);
                            queueSave({
                              field: "specifications",
                              value: nextSpecifications
                                .map((item) => item.value.trim())
                                .filter(Boolean),
                            });
                          }}
                          className="size-10 shrink-0 text-slate-500 hover:text-[#ed1c2e]"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendSpecification({ value: "" })}
                      className="gap-1.5"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Add feature
                    </Button>
                  </div>
                </Section>

                <Controller
                  control={control}
                  name="colors"
                  render={({ field }) => {
                    const selected = field.value ?? [];
                    const customColors = selected.filter(
                      (hex) =>
                        !PRESET_COLORS.some((preset) =>
                          sameHex(preset.hex, hex),
                        ),
                    );
                    const colorOptions = [
                      ...PRESET_COLORS,
                      ...customColors.map((hex) => ({ name: hex, hex })),
                    ];
                    return (
                      <Section
                        title="Available colors"
                        description="Update the product color options."
                      >
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {colorOptions.map((color) => {
                            const checked = selected.some((hex) =>
                              sameHex(hex, color.hex),
                            );
                            const id = `edit-color-${color.hex.replace("#", "")}`;
                            return (
                              <label
                                key={color.hex}
                                htmlFor={id}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-xs ${
                                  checked
                                    ? "border-[#ed1c2e]/40 bg-rose-50/50"
                                    : "border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <Checkbox
                                  id={id}
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    const nextColors = value
                                      ? [...selected, color.hex.toUpperCase()]
                                      : selected.filter(
                                          (hex) => !sameHex(hex, color.hex),
                                        );
                                    field.onChange(nextColors);
                                    if (
                                      JSON.stringify(nextColors) !==
                                      JSON.stringify(product?.colors ?? [])
                                    ) {
                                      queueSave({
                                        field: "colors",
                                        value: nextColors,
                                      });
                                    }
                                  }}
                                />
                                <span
                                  className="size-4 shrink-0 rounded-full border border-slate-300"
                                  style={{ backgroundColor: color.hex }}
                                  aria-hidden="true"
                                />
                                <span className="truncate">{color.name}</span>
                              </label>
                            );
                          })}
                          <button
                            type="button"
                            aria-expanded={pickerOpen}
                            onClick={() => setPickerOpen((current) => !current)}
                            className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-[#ed1c2e]/50 hover:text-[#ed1c2e]"
                          >
                            <Palette className="size-4" aria-hidden="true" />
                            Custom color
                          </button>
                        </div>
                        {pickerOpen ? (
                          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                            <HexColorPicker
                              color={pickerColor}
                              onChange={setPickerColor}
                              className="!w-full [&_.react-colorful__hue]:mt-3 [&_.react-colorful__hue]:!h-3 [&_.react-colorful__hue]:!rounded-full [&_.react-colorful__pointer]:!size-5 [&_.react-colorful__saturation]:!h-36 [&_.react-colorful__saturation]:!rounded-md"
                            />
                            <div className="flex items-center gap-2">
                              <span
                                className="size-9 shrink-0 rounded-md border border-slate-200"
                                style={{ backgroundColor: pickerColor }}
                                aria-hidden="true"
                              />
                              <HexColorInput
                                color={pickerColor}
                                onChange={setPickerColor}
                                className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-xs uppercase outline-none focus-visible:border-[#ed1c2e]"
                                aria-label="Custom color hex value"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const hex = pickerColor.toUpperCase();
                                  if (
                                    !selected.some((item) => sameHex(item, hex))
                                  ) {
                                    const nextColors = [...selected, hex];
                                    field.onChange(nextColors);
                                    queueSave({
                                      field: "colors",
                                      value: nextColors,
                                    });
                                  }
                                  setPickerOpen(false);
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </Section>
                    );
                  }}
                />

                <Section
                  title="Pricing"
                  description="Change between a fixed unit price and quantity-based bulk pricing."
                >
                  <div
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    role="radiogroup"
                    aria-label="Pricing type"
                  >
                    {(
                      [
                        {
                          value: "fixed",
                          label: "Fixed price",
                          hint: "One price for every quantity",
                          Icon: Tag,
                        },
                        {
                          value: "bulk",
                          label: "Bulk pricing",
                          hint: "Price changes by order quantity",
                          Icon: Layers,
                        },
                      ] as const
                    ).map(({ value, label, hint, Icon }) => {
                      const active = pricingType === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => {
                            if (value === pricingType) return;
                            const changePricingType = () => {
                              setValue("pricingType", value);
                              queuePricing({
                                ...getValues(),
                                pricingType: value,
                              });
                            };
                            if (pricingType === "bulk" && value === "fixed") {
                              requestConfirmation(
                                "Remove bulk pricing?",
                                "Switching to fixed pricing permanently clears all bulk price tiers.",
                                "Switch to fixed price",
                                changePricingType,
                              );
                            } else {
                              changePricingType();
                            }
                          }}
                          className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30 focus-visible:outline-none ${
                            active
                              ? "border-[#ed1c2e] bg-rose-50/50 ring-1 ring-[#ed1c2e]/15"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-md ${
                              active
                                ? "bg-[#ed1c2e] text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-slate-900">
                              {label}
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                              {hint}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
                              active ? "border-[#ed1c2e]" : "border-slate-300"
                            }`}
                          >
                            {active ? (
                              <span className="size-2 rounded-full bg-[#ed1c2e]" />
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {pricingType === "fixed" ? (
                    <div className="space-y-1.5 sm:max-w-72">
                      <label
                        htmlFor="edit-fixed-price"
                        className="text-xs font-medium text-slate-700"
                      >
                        Unit price (LKR)
                      </label>
                      <Input
                        id="edit-fixed-price"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className={inputClass}
                        {...registerAutoSave("fixedPrice", {
                          validate: (value) =>
                            getValues("pricingType") !== "fixed" ||
                            (value !== "" &&
                              Number.isFinite(Number(value)) &&
                              Number(value) >= 0) ||
                            "Enter a valid price",
                        })}
                      />
                      {errors.fixedPrice?.message ? (
                        <p className="text-xs text-rose-700">
                          {errors.fixedPrice.message}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="hidden grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_2rem] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:grid">
                        <span>#</span>
                        <span>From qty</span>
                        <span>To qty</span>
                        <span>Unit price</span>
                        <span />
                      </div>
                      {tierFields.map((field, index) => {
                        const isLast = index === tierFields.length - 1;
                        return (
                          <div
                            key={field.id}
                            className="space-y-3 rounded-md border border-slate-200 p-3 sm:space-y-1 sm:border-0 sm:p-0"
                          >
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_2rem] sm:items-center sm:gap-2">
                              <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                {index + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete tier ${index + 1}`}
                                disabled={tierFields.length === 1}
                                onClick={() =>
                                  requestConfirmation(
                                    "Delete bulk price tier?",
                                    `Are you sure you want to delete tier ${index + 1}? Later quantity ranges will be adjusted.`,
                                    "Delete tier",
                                    () => {
                                      const values = getValues();
                                      const nextTiers =
                                        values.priceTiers.filter(
                                          (_, itemIndex) => itemIndex !== index,
                                        );
                                      let nextStart = 1;
                                      const adjustedTiers = nextTiers.map(
                                        (tier) => {
                                          const adjusted = {
                                            ...tier,
                                            startQty: nextStart,
                                          };
                                          if (tier.endQty) {
                                            nextStart = Number(tier.endQty) + 1;
                                          }
                                          return adjusted;
                                        },
                                      );
                                      removeTier(index);
                                      queuePricing({
                                        ...values,
                                        priceTiers: adjustedTiers,
                                      });
                                    },
                                  )
                                }
                                className="order-2 ml-auto size-8 text-slate-400 hover:bg-rose-50 hover:text-[#ed1c2e] sm:order-last"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                              <label className="min-w-0 space-y-1">
                                <span className="block text-[11px] font-medium text-slate-500 sm:hidden">
                                  From qty
                                </span>
                                <span className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600 tabular-nums sm:px-3">
                                  {tiers[index]?.startQty ?? field.startQty}
                                  <input
                                    type="hidden"
                                    {...register(
                                      `priceTiers.${index}.startQty`,
                                    )}
                                  />
                                </span>
                              </label>
                              <label className="min-w-0 space-y-1">
                                <span className="block text-[11px] font-medium text-slate-500 sm:hidden">
                                  To qty
                                </span>
                                <Input
                                  aria-label={`Tier ${index + 1} end quantity`}
                                  type="number"
                                  inputMode="numeric"
                                  min={String(tiers[index]?.startQty ?? 1)}
                                  placeholder={isLast ? "No limit" : "End"}
                                  className={`${inputClass} px-2 tabular-nums sm:px-3`}
                                  {...registerAutoSave(
                                    `priceTiers.${index}.endQty`,
                                    {
                                      validate: (value) => {
                                        if (getValues("pricingType") !== "bulk")
                                          return true;
                                        if (!value)
                                          return isLast || "Enter the tier end";
                                        return (
                                          Number(value) >=
                                            Number(
                                              getValues(
                                                `priceTiers.${index}.startQty`,
                                              ),
                                            ) ||
                                          "End must be at least the start"
                                        );
                                      },
                                    },
                                  )}
                                />
                              </label>
                              <label className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
                                <span className="block text-[11px] font-medium text-slate-500 sm:hidden">
                                  Unit price (LKR)
                                </span>
                                <Input
                                  aria-label={`Tier ${index + 1} unit price`}
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  className={`${inputClass} px-2 tabular-nums sm:px-3`}
                                  {...registerAutoSave(
                                    `priceTiers.${index}.price`,
                                    {
                                      validate: (value) =>
                                        getValues("pricingType") !== "bulk" ||
                                        (value !== "" &&
                                          Number.isFinite(Number(value)) &&
                                          Number(value) >= 0) ||
                                        "Enter a valid unit price",
                                    },
                                  )}
                                />
                              </label>
                            </div>
                            {errors.priceTiers?.[index]?.endQty?.message ||
                            errors.priceTiers?.[index]?.price?.message ? (
                              <p className="pl-10 text-xs text-rose-700">
                                {errors.priceTiers[index]?.endQty?.message ??
                                  errors.priceTiers[index]?.price?.message}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canAddTier}
                        onClick={addTier}
                        className="gap-1.5 text-xs"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Add price tier
                      </Button>
                      {!canAddTier ? (
                        <p className="text-xs text-slate-500">
                          Enter a valid end quantity in the last tier to add
                          another.
                        </p>
                      ) : null}
                    </div>
                  )}
                </Section>
              </div>
            </fieldset>

            {formError ? (
              <p
                role="alert"
                className="shrink-0 px-5 pt-3 text-xs text-rose-700 sm:px-6"
              >
                {formError}
              </p>
            ) : null}
            <div
              role="status"
              aria-live="polite"
              className="flex min-h-12 shrink-0 items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs sm:px-6"
            >
              {saving ? (
                <>
                  <LoaderCircle
                    className="size-4 animate-spin text-slate-500"
                    aria-hidden="true"
                  />
                  <span className="text-slate-600">Saving changes...</span>
                </>
              ) : formNotice ? (
                <span
                  className={
                    formNotice === "Changes saved."
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }
                >
                  {formNotice}
                </span>
              ) : (
                <span className="text-slate-500">
                  Changes save automatically when you leave a field.
                </span>
              )}
            </div>
          </form>
        ) : null}
      </SheetContent>
      <Dialog
        open={!!pendingConfirmation}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingConfirmation(null);
        }}
      >
        <DialogContent className="z-[130]">
          <DialogHeader>
            <DialogTitle>{pendingConfirmation?.title}</DialogTitle>
            <DialogDescription>
              {pendingConfirmation?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingConfirmation(null)}
            >
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const action = pendingConfirmation?.action;
                setPendingConfirmation(null);
                action?.();
              }}
            >
              {pendingConfirmation?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
