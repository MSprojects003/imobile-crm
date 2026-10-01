"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { HexColorInput, HexColorPicker } from "react-colorful"
import { ImagePlus, Layers, Palette, Plus, Tag, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { fetchProductCatalogOptions, type NewProduct } from "@/lib/api/products"

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type PricingType = "fixed" | "bulk"

type ImageItem = { id: string; file: File; preview: string }
type SpecItem = { value: string }
type PriceTier = { startQty: number; endQty: string; price: string }

export type ProductFormValues = {
  name: string
  modelNumber: string
  model: string
  category: string
  brand: string
  manufacturedYear: string
  images: ImageItem[]
  description: string
  hasSpecs: boolean
  specs: SpecItem[]
  pricingType: PricingType
  fixedPrice: string
  priceTiers: PriceTier[]
  colors: string[] // hex codes, e.g. ["#EF4444", "#1A2B3C"]
}

type AddProductSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (product: NewProduct) => Promise<void>
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const MAX_IMAGES = 8

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
]

const DEFAULT_VALUES: ProductFormValues = {
  name: "",
  modelNumber: "",
  model: "",
  category: "",
  brand: "",
  manufacturedYear: "",
  images: [],
  description: "",
  hasSpecs: false,
  specs: [],
  pricingType: "fixed",
  fixedPrice: "",
  priceTiers: [{ startQty: 1, endQty: "", price: "" }],
  colors: [],
}

const inputClass =
  "h-10 rounded-md border-slate-200 px-3 text-sm focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20"
const textareaClass =
  "min-h-20 resize-y rounded-md border-slate-200 px-3 py-2.5 text-sm focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20"

const sameHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/* -------------------------------------------------------------------------- */
/*                               Small UI helpers                             */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-4 border-b border-slate-100 px-5 py-6 last:border-b-0 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description ? (
            <p className="text-xs leading-5 text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  htmlFor,
  optional,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  optional?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700"
      >
        {label}
        {optional ? (
          <span className="text-xs font-normal text-slate-400">Optional</span>
        ) : null}
      </label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export function AddProductSheet({
  open,
  onOpenChange,
  onAdd,
}: AddProductSheetProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ProductFormValues>({ defaultValues: DEFAULT_VALUES })

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({
    control,
    name: "images",
    rules: {
      minLength: { value: 1, message: "Add at least one product image" },
    },
  })

  const {
    fields: specFields,
    append: appendSpec,
    remove: removeSpec,
  } = useFieldArray({ control, name: "specs" })

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
  } = useFieldArray({ control, name: "priceTiers" })

  const hasSpecs = watch("hasSpecs")
  const pricingType = watch("pricingType")
  const tiers = watch("priceTiers")
  const colors = watch("colors")

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerColor, setPickerColor] = useState("#ed1c2e")
  const [productCategories, setProductCategories] = useState<string[]>([])
  const [productBrands, setProductBrands] = useState<string[]>([])
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [catalogError, setCatalogError] = useState("")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setIsLoadingCatalog(true)
    setCatalogError("")
    void fetchProductCatalogOptions()
      .then((catalog) => {
        if (cancelled) return
        setProductCategories(catalog.categories)
        setProductBrands(catalog.brands)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Could not load product categories and brands."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCatalog(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!toastMessage) return
    const timeoutId = window.setTimeout(() => setToastMessage(""), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  /* Keep each tier's start quantity = previous tier's end quantity + 1 */
  useEffect(() => {
    let nextStart = 1
    tiers.forEach((tier, index) => {
      if (Number(tier.startQty) !== nextStart) {
        setValue(`priceTiers.${index}.startQty`, nextStart)
      }
      const end = Number(tier.endQty)
      nextStart = (end > 0 ? end : nextStart) + 1
    })
  }, [tiers, setValue])

  /* ------------------------------ Image handling ----------------------------- */

  function revokeAllPreviews() {
    getValues("images").forEach((item) => URL.revokeObjectURL(item.preview))
  }

  useEffect(() => {
    return () => revokeAllPreviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFiles(files: FileList | null) {
    if (!files) return
    const remaining = MAX_IMAGES - getValues("images").length
    Array.from(files)
      .slice(0, remaining)
      .forEach((file) =>
        appendImage({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
        })
      )
  }

  function handleRemoveImage(index: number) {
    URL.revokeObjectURL(getValues(`images.${index}.preview`))
    removeImage(index)
  }

  /* ------------------------------- Spec handling ------------------------------ */

  function handleSpecToggle(checked: boolean) {
    setValue("hasSpecs", checked)
    if (checked && getValues("specs").length === 0) appendSpec({ value: "" })
  }

  /* ------------------------------- Color handling ----------------------------- */

  function toggleColor(
    hex: string,
    checked: boolean,
    current: string[],
    onChange: (v: string[]) => void
  ) {
    if (checked) {
      if (!current.some((c) => sameHex(c, hex)))
        onChange([...current, hex.toUpperCase()])
    } else {
      onChange(current.filter((c) => !sameHex(c, hex)))
    }
  }

  function addCustomColor(current: string[], onChange: (v: string[]) => void) {
    const hex = pickerColor.startsWith("#") ? pickerColor : `#${pickerColor}`
    if (!current.some((c) => sameHex(c, hex)))
      onChange([...current, hex.toUpperCase()])
    setPickerOpen(false)
  }

  /* ------------------------------- Tier handling ------------------------------ */

  const lastTier = tiers[tiers.length - 1]
  const canAddTier =
    !!lastTier &&
    Number(lastTier.endQty) >= Number(lastTier.startQty) &&
    Number(lastTier.endQty) > 0

  function handleAddTier() {
    if (!canAddTier) return
    appendTier({ startQty: Number(lastTier.endQty) + 1, endQty: "", price: "" })
  }

  /* --------------------------------- Submit ---------------------------------- */

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      revokeAllPreviews()
      reset(DEFAULT_VALUES)
      setPickerOpen(false)
      setFormError("")
    }
  }

  async function onSubmit(values: ProductFormValues) {
    const isFixed = values.pricingType === "fixed"
    setIsSubmitting(true)
    setFormError("")
    setToastMessage("")
    try {
      await onAdd({
        name: values.name.trim(),
        modelNumber: values.modelNumber.trim(),
        model: values.model.trim() || undefined,
        category: values.category,
        brand: values.brand,
        manufacturedYear: values.manufacturedYear
          ? Number(values.manufacturedYear)
          : undefined,
        images: values.images.map((item) => item.file),
        description: values.description.trim(),
        specifications: values.hasSpecs
          ? values.specs.map((spec) => spec.value.trim()).filter(Boolean)
          : [],
        pricingType: values.pricingType,
        fixedPrice: isFixed ? Number(values.fixedPrice) : undefined,
        priceTiers: isFixed
          ? undefined
          : values.priceTiers.map((tier) => ({
              startQty: Number(tier.startQty),
              endQty: tier.endQty ? Number(tier.endQty) : null,
              price: Number(tier.price),
            })),
        colors: values.colors,
      })
      setToastMessage("Product added successfully.")
      handleOpenChange(false)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not create the product."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  /* --------------------------------- Render ---------------------------------- */

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="min-h-0 !w-screen gap-0 overflow-hidden p-0 sm:!max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-6">
          <SheetTitle className="text-base font-semibold text-slate-900">
            Add product
          </SheetTitle>
          <SheetDescription className="text-[13px] text-slate-500">
            Fill in the details below to add a product to your catalogue.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {formError ? (
            <p
              className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:mx-6"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          {catalogError ? (
            <p
              className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:mx-6"
              role="alert"
            >
              {catalogError}
            </p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {/* ------------------------------ Basic info ------------------------------ */}
            <Section title="Basic information">
              <Field
                label="Product name"
                htmlFor="product-name"
                error={errors.name?.message}
              >
                <Input
                  id="product-name"
                  maxLength={100}
                  placeholder="Enter product name"
                  className={inputClass}
                  {...register("name", {
                    required: "Product name is required",
                  })}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Model number"
                  htmlFor="product-model-number"
                  error={errors.modelNumber?.message}
                >
                  <Input
                    id="product-model-number"
                    maxLength={60}
                    placeholder="e.g. XR-2040"
                    className={inputClass}
                    {...register("modelNumber", {
                      required: "Model number is required",
                    })}
                  />
                </Field>
                <Field label="Model" htmlFor="product-model" optional>
                  <Input
                    id="product-model"
                    maxLength={60}
                    placeholder="Enter model"
                    className={inputClass}
                    {...register("model")}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Category"
                  htmlFor="product-category"
                  error={errors.category?.message}
                >
                  <Controller
                    control={control}
                    name="category"
                    rules={{ required: "Select a category" }}
                    render={({ field }) => (
                      <Select
                        value={field.value || null}
                        onValueChange={(value: string | null) =>
                          field.onChange(value ?? "")
                        }
                      >
                        <SelectTrigger
                          id="product-category"
                          className="h-10 w-full text-sm"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {productCategories.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          {productCategories.length === 0 ? (
                            <SelectItem value="none" disabled>
                              {isLoadingCatalog
                                ? "Loading categories..."
                                : "No categories available"}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field
                  label="Brand"
                  htmlFor="product-brand"
                  error={errors.brand?.message}
                >
                  <Controller
                    control={control}
                    name="brand"
                    rules={{ required: "Select a brand" }}
                    render={({ field }) => (
                      <Select
                        value={field.value || null}
                        onValueChange={(value: string | null) =>
                          field.onChange(value ?? "")
                        }
                      >
                        <SelectTrigger
                          id="product-brand"
                          className="h-10 w-full text-sm"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {productBrands.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          {productBrands.length === 0 ? (
                            <SelectItem value="none" disabled>
                              {isLoadingCatalog
                                ? "Loading brands..."
                                : "No brands available"}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>

              <Field
                label="Manufactured year"
                htmlFor="product-year"
                optional
                error={errors.manufacturedYear?.message}
              >
                <Input
                  id="product-year"
                  type="number"
                  inputMode="numeric"
                  placeholder={String(new Date().getFullYear())}
                  className={`${inputClass} sm:max-w-40`}
                  {...register("manufacturedYear", {
                    validate: (value) =>
                      !value ||
                      (Number(value) >= 1950 &&
                        Number(value) <= new Date().getFullYear()) ||
                      `Enter a year between 1950 and ${new Date().getFullYear()}`,
                  })}
                />
              </Field>
            </Section>

            {/* -------------------------------- Images -------------------------------- */}
            <Section
              title="Product images"
              description={`PNG, JPG or WEBP. Up to ${MAX_IMAGES} images.`}
            >
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {imageFields.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-[#ed1c2e] hover:text-white hover:ring-[#ed1c2e]"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                    {index === 0 ? (
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
                        Cover
                      </span>
                    ) : null}
                  </div>
                ))}

                {imageFields.length < MAX_IMAGES ? (
                  <label
                    htmlFor="product-images"
                    className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-[#ed1c2e]/50 hover:bg-rose-50/40 hover:text-[#ed1c2e]"
                  >
                    <ImagePlus className="size-5" aria-hidden="true" />
                    <span className="text-xs font-medium">
                      {imageFields.length === 0 ? "Add image" : "Add more"}
                    </span>
                    <input
                      id="product-images"
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        handleFiles(event.target.files)
                        event.target.value = ""
                      }}
                    />
                  </label>
                ) : null}
              </div>
              {errors.images?.root?.message ? (
                <p className="text-xs text-red-600">
                  {errors.images.root.message}
                </p>
              ) : null}
            </Section>

            {/* ------------------------------ Description ----------------------------- */}
            <Section title="Description">
              <Field
                label="Product description"
                htmlFor="product-description"
                error={errors.description?.message}
              >
                <Textarea
                  id="product-description"
                  maxLength={500}
                  placeholder="Describe this product"
                  className={`${textareaClass} min-h-28`}
                  {...register("description", {
                    required: "Description is required",
                  })}
                />
              </Field>

              <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50/60 px-3.5 py-3">
                <div className="space-y-0.5">
                  <label
                    htmlFor="has-specs"
                    className="text-[13px] font-medium text-slate-800"
                  >
                    Add feature specifications
                  </label>
                  <p className="text-xs text-slate-500">
                    List key features one by one.
                  </p>
                </div>
                <Switch
                  id="has-specs"
                  checked={hasSpecs}
                  onCheckedChange={handleSpecToggle}
                  className="data-[state=checked]:bg-[#ed1c2e] data-checked:bg-[#ed1c2e]"
                />
              </div>

              {hasSpecs ? (
                <div className="space-y-3">
                  {specFields.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Textarea
                          aria-label={`Feature ${index + 1}`}
                          rows={2}
                          placeholder={`Feature ${index + 1}`}
                          className={textareaClass}
                          {...register(`specs.${index}.value`, {
                            validate: (value) =>
                              !!value.trim() ||
                              "Enter a feature or remove this row",
                          })}
                        />
                        {errors.specs?.[index]?.value?.message ? (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.specs[index]?.value?.message}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Delete feature ${index + 1}`}
                        onClick={() => removeSpec(index)}
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
                    onClick={() => appendSpec({ value: "" })}
                    className="gap-1.5 text-[13px]"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add feature
                  </Button>
                </div>
              ) : null}
            </Section>

            {/* --------------------------------- Pricing ------------------------------- */}
            <Section
              title="Pricing"
              description="Choose how this product is priced."
            >
              <Controller
                control={control}
                name="pricingType"
                render={({ field }) => (
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
                      const active = field.value === value
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => field.onChange(value)}
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
                            <span className="block text-[13px] font-semibold text-slate-900">
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
                      )
                    })}
                  </div>
                )}
              />

              {pricingType === "fixed" ? (
                <Field
                  label="Unit price"
                  htmlFor="product-price"
                  error={errors.fixedPrice?.message}
                >
                  <div className="relative sm:max-w-60">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-medium text-slate-500">
                      LKR
                    </span>
                    <Input
                      id="product-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className={`${inputClass} pl-11`}
                      {...register("fixedPrice", {
                        validate: (value) =>
                          getValues("pricingType") !== "fixed" ||
                          (value !== "" && Number(value) >= 0) ||
                          "Enter a valid price",
                      })}
                    />
                  </div>
                </Field>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[2.75rem_1fr_1fr_1.3fr_2.25rem] items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-500">
                    <span>Tier</span>
                    <span>From qty</span>
                    <span>To qty</span>
                    <span>Unit price (LKR)</span>
                    <span className="sr-only">Actions</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {tierFields.map((item, index) => {
                      const isLast = index === tierFields.length - 1
                      const tierErrors = errors.priceTiers?.[index]
                      const errorText =
                        tierErrors?.endQty?.message ??
                        tierErrors?.price?.message
                      return (
                        <div key={item.id} className="px-3 py-2.5">
                          <div className="grid grid-cols-[2.75rem_1fr_1fr_1.3fr_2.25rem] items-center gap-2">
                            <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                              {index + 1}
                            </span>

                            <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 tabular-nums">
                              {tiers[index]?.startQty ?? item.startQty}
                              <input
                                type="hidden"
                                {...register(`priceTiers.${index}.startQty`)}
                              />
                            </div>

                            <Input
                              aria-label={`Tier ${index + 1} end quantity`}
                              type="number"
                              inputMode="numeric"
                              min="1"
                              placeholder={isLast ? "No limit" : "End"}
                              className={`${inputClass} h-9 tabular-nums`}
                              {...register(`priceTiers.${index}.endQty`, {
                                validate: (value) => {
                                  if (getValues("pricingType") !== "bulk")
                                    return true
                                  if (!value)
                                    return isLast || "End quantity is required"
                                  const start = Number(
                                    getValues(`priceTiers.${index}.startQty`)
                                  )
                                  return (
                                    Number(value) >= start ||
                                    `End quantity must be ${start} or more`
                                  )
                                },
                              })}
                            />

                            <Input
                              aria-label={`Tier ${index + 1} price`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className={`${inputClass} h-9 tabular-nums`}
                              {...register(`priceTiers.${index}.price`, {
                                validate: (value) =>
                                  getValues("pricingType") !== "bulk" ||
                                  (value !== "" && Number(value) >= 0) ||
                                  "Unit price is required",
                              })}
                            />

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete tier ${index + 1}`}
                              disabled={tierFields.length === 1}
                              onClick={() => removeTier(index)}
                              className="size-8 text-slate-400 hover:bg-rose-50 hover:text-[#ed1c2e]"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                          {errorText ? (
                            <p className="mt-1.5 pl-[3.25rem] text-xs text-red-600">
                              {errorText}
                            </p>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs text-slate-500">
                      Each range starts after the previous one ends.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canAddTier}
                      onClick={handleAddTier}
                      className="h-8 shrink-0 gap-1.5 bg-white text-[13px]"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Add tier
                    </Button>
                  </div>
                </div>
              )}
            </Section>

            {/* ---------------------------------- Colors ------------------------------- */}
            <Controller
              control={control}
              name="colors"
              render={({ field }) => {
                const selected: string[] = field.value ?? []
                const customColors = selected.filter(
                  (hex) =>
                    !PRESET_COLORS.some((preset) => sameHex(preset.hex, hex))
                )
                const options = [
                  ...PRESET_COLORS,
                  ...customColors.map((hex) => ({
                    name: hex.toUpperCase(),
                    hex,
                  })),
                ]

                return (
                  <Section
                    title="Available colors"
                    description={
                      selected.length
                        ? `${selected.length} selected`
                        : "Select every color this product comes in. Use Custom color if one is missing."
                    }
                  >
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {options.map((color) => {
                        const checked = selected.some((c) =>
                          sameHex(c, color.hex)
                        )
                        const id = `color-${color.hex.replace("#", "")}`
                        return (
                          <label
                            key={color.hex}
                            htmlFor={id}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-colors ${
                              checked
                                ? "border-[#ed1c2e]/40 bg-rose-50/50 text-slate-900"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <Checkbox
                              id={id}
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleColor(
                                  color.hex,
                                  value === true,
                                  selected,
                                  field.onChange
                                )
                              }
                            />
                            <span
                              className="size-4 shrink-0 rounded-full border border-slate-300"
                              style={{ backgroundColor: color.hex }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{color.name}</span>
                          </label>
                        )
                      })}

                      <button
                        type="button"
                        aria-expanded={pickerOpen}
                        onClick={() => setPickerOpen((value) => !value)}
                        className={`flex items-center gap-2.5 rounded-md border border-dashed px-3 py-2 text-[13px] font-medium transition-colors ${
                          pickerOpen
                            ? "border-[#ed1c2e] bg-rose-50/50 text-[#ed1c2e]"
                            : "border-slate-300 text-slate-600 hover:border-[#ed1c2e]/50 hover:text-[#ed1c2e]"
                        }`}
                      >
                        <Palette className="size-4" aria-hidden="true" />
                        Custom color
                      </button>
                    </div>

                    {pickerOpen ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-stretch">
                          <HexColorPicker
                            color={pickerColor}
                            onChange={setPickerColor}
                            className="!w-full sm:!w-56 sm:self-center [&_.react-colorful__hue]:mt-3 [&_.react-colorful__hue]:!h-3 [&_.react-colorful__hue]:!rounded-full [&_.react-colorful__pointer]:!size-5 [&_.react-colorful__saturation]:!h-40 [&_.react-colorful__saturation]:!rounded-md [&_.react-colorful__saturation]:!border-b-0"
                          />
                          <div className="flex min-w-0 flex-col justify-between gap-4 sm:min-h-44">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className="size-12 shrink-0 rounded-md border border-slate-200 shadow-sm"
                                  style={{ backgroundColor: pickerColor }}
                                  aria-hidden="true"
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <label
                                    htmlFor="custom-hex"
                                    className="text-xs font-medium text-slate-600"
                                  >
                                    Hex code
                                  </label>
                                  <div className="relative">
                                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400">
                                      #
                                    </span>
                                    <HexColorInput
                                      id="custom-hex"
                                      color={pickerColor}
                                      onChange={setPickerColor}
                                      className="h-9 w-full rounded-md border border-slate-200 bg-white pr-2 pl-6 text-sm text-slate-800 uppercase outline-none focus-visible:border-[#ed1c2e] focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/20"
                                    />
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-slate-500">
                                Drag on the picker or type a hex code.
                              </p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPickerOpen(false)}
                                className="bg-white text-[13px]"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  addCustomColor(selected, field.onChange)
                                }
                                className="gap-1.5 bg-[#ed1c2e] text-[13px] text-white hover:bg-[#d91829]"
                              >
                                <Plus className="size-4" aria-hidden="true" />
                                Add color
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {colors.length > 0 ? (
                      <p className="text-xs break-all text-slate-500">
                        Saved as: {colors.join(", ")}
                      </p>
                    ) : null}
                  </Section>
                )
              }}
            />
          </div>

          <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3.5 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="text-[13px]"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingCatalog || !!catalogError}
              className="gap-1.5 bg-[#ed1c2e] text-[13px] text-white hover:bg-[#d91829]"
            >
              <Plus className="size-4" aria-hidden="true" />
              {isSubmitting ? "Saving..." : "Add product"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-[120] rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg sm:right-8 sm:bottom-8"
        >
          {toastMessage}
        </div>
      ) : null}
    </Sheet>
  )
}
